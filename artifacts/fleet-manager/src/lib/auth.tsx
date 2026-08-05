import { createContext, ReactNode, useContext, useEffect, useMemo, useState } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase, supabaseAuthStorageKey, supabaseConfigured } from "@/lib/supabase";

type AuthContextValue = {
  user: User | null;
  session: Session | null;
  loading: boolean;
  authError: string | null;
  signingIn: boolean;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<{ error: Error | null }>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);
const MINIMUM_SPLASH_MS = 1200;

function getCallbackError() {
  const queryError = new URLSearchParams(window.location.search).get("error_description");
  const hashError = new URLSearchParams(window.location.hash.replace(/^#/, "")).get("error_description");
  return queryError || hashError;
}

function formatAuthError(error: unknown) {
  const message = error instanceof Error ? error.message : String(error);
  const normalized = message.toLowerCase();
  if (normalized.includes("oauth state") || normalized.includes("flow_state")) {
    return "Google sign-in expired before it returned to the app. Please choose your Google account again.";
  }
  if (normalized.includes("code verifier") || normalized.includes("pkce")) {
    return "This Google sign-in attempt could not be verified. Please choose your Google account again.";
  }
  return message;
}

function clearOAuthCallbackParams() {
  const url = new URL(window.location.href);
  const callbackParams = [
    "code",
    "state",
    "error",
    "error_code",
    "error_description",
    "sb_flow_id",
    "access_token",
    "refresh_token",
    "expires_in",
    "expires_at",
    "token_type",
    "type",
  ];
  callbackParams.forEach((param) => url.searchParams.delete(param));
  if (url.hash) {
    const hashParams = new URLSearchParams(url.hash.slice(1));
    if (["access_token", "refresh_token", "error", "error_description", "expires_in", "expires_at", "token_type", "type"].some((param) => hashParams.has(param))) {
      url.hash = "";
    }
  }
  window.history.replaceState(window.history.state, document.title, `${url.pathname}${url.search}${url.hash}`);
}

function clearPendingPkceVerifiers() {
  if (typeof window === "undefined") return;
  const keysToRemove: string[] = [];
  for (let index = 0; index < window.localStorage.length; index += 1) {
    const key = window.localStorage.key(index);
    if (
      key === `${supabaseAuthStorageKey}-code-verifier` ||
      key === `${supabaseAuthStorageKey}-flows-code-verifier` ||
      key?.startsWith(`${supabaseAuthStorageKey}-flow-`)
    ) {
      keysToRemove.push(key);
    }
  }
  keysToRemove.forEach((key) => window.localStorage.removeItem(key));
}

function getRedirectUrl() {
  const basePath = import.meta.env.BASE_URL || "/";
  return new URL(basePath, window.location.origin).toString();
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [signingIn, setSigningIn] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  useEffect(() => {
    if (!supabaseConfigured) {
      setAuthError("Supabase authentication is not configured for this app.");
      setLoading(false);
      return;
    }

    let mounted = true;
    const authStartedAt = Date.now();
    const { data: listener } = supabase.auth.onAuthStateChange((event, nextSession) => {
      if (!mounted) return;
      setSession(nextSession);
      setSigningIn(false);
      if (event === "SIGNED_OUT") setAuthError(null);
    });

    const finishAuthInitialization = async () => {
      const callbackError = getCallbackError();
      if (callbackError) {
        setAuthError(decodeURIComponent(callbackError.replace(/\+/g, " ")));
        clearOAuthCallbackParams();
      }

      try {
        const code = new URL(window.location.href).searchParams.get("code");
        if (code && !callbackError) {
          // Exchange exactly once, after the auth listener is registered. This
          // consumes the PKCE verifier created for this browser login attempt.
          const { data, error } = await supabase.auth.exchangeCodeForSession(code);
          if (error) throw error;
          if (mounted) setSession(data.session);
          clearOAuthCallbackParams();
        }

        const { data, error } = await supabase.auth.getSession();
        if (!mounted) return;
        if (error) throw error;
        setSession(data.session);
      } catch (error) {
        if (!mounted) return;
        setAuthError(formatAuthError(error));
        clearOAuthCallbackParams();
        setSession(null);
      } finally {
        const remainingSplashTime = Math.max(0, MINIMUM_SPLASH_MS - (Date.now() - authStartedAt));
        window.setTimeout(() => {
          if (mounted) setLoading(false);
        }, remainingSplashTime);
      }
    };

    void finishAuthInitialization();

    return () => {
      mounted = false;
      listener.subscription.unsubscribe();
    };
  }, []);

  const value = useMemo<AuthContextValue>(() => ({
    user: session?.user || null,
    session,
    loading,
    authError,
    signingIn,
    signInWithGoogle: async () => {
      if (!supabaseConfigured) {
        setAuthError("Supabase authentication is not configured for this app.");
        return;
      }
      setAuthError(null);
      setSigningIn(true);
      clearOAuthCallbackParams();
      clearPendingPkceVerifiers();
      const redirectTo = getRedirectUrl();
       try {
         const { error } = await supabase.auth.signInWithOAuth({
           provider: "google",
           options: {
             redirectTo,
             // Always let the user choose Gmail A or Gmail B instead of reusing
             // the currently active Google browser account.
             queryParams: { prompt: "select_account" },
           },
         });
         if (error) throw error;
       } catch (error) {
         setAuthError(formatAuthError(error));
        setSigningIn(false);
      }
    },
    signOut: async () => {
      // A local logout clears this browser's Supabase session and PKCE
      // verifier without revoking other sessions for the same user.
      const { error } = await supabase.auth.signOut({ scope: "local" });
      clearPendingPkceVerifiers();
      return { error: error ? new Error(error.message) : null };
    },
  }), [session, loading, authError, signingIn]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within AuthProvider");
  return context;
}
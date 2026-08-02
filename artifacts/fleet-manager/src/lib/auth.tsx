import { createContext, ReactNode, useContext, useEffect, useMemo, useState } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase, supabaseConfigured } from "@/lib/supabase";

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

function getCallbackError() {
  const queryError = new URLSearchParams(window.location.search).get("error_description");
  const hashError = new URLSearchParams(window.location.hash.replace(/^#/, "")).get("error_description");
  return queryError || hashError;
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

    const callbackError = getCallbackError();
    if (callbackError) {
      setAuthError(decodeURIComponent(callbackError.replace(/\+/g, " ")));
      clearOAuthCallbackParams();
    }

    let mounted = true;
    supabase.auth.getSession().then(({ data, error }) => {
      if (!mounted) return;
      if (error) {
        setAuthError(
          error.message.toLowerCase().includes("oauth state") || error.message.toLowerCase().includes("flow_state")
            ? "Google sign-in expired before it returned to the app. Please tap Continue with Google again."
            : error.message,
        );
        clearOAuthCallbackParams();
      }
      setSession(data.session);
      setLoading(false);
    });

    const { data: listener } = supabase.auth.onAuthStateChange((event, nextSession) => {
      if (!mounted) return;
      setSession(nextSession);
      setSigningIn(false);
      if (event === "SIGNED_OUT") setAuthError(null);
    });

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
      const redirectTo = getRedirectUrl();
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo,
          // Always let the user choose Gmail A or Gmail B instead of reusing
          // the currently active Google browser account.
          queryParams: { prompt: "select_account" },
        },
      });
      if (error) {
        setAuthError(error.message);
        setSigningIn(false);
      }
    },
    signOut: async () => {
      // A local logout clears this browser's Supabase session and PKCE
      // verifier without revoking other sessions for the same user.
      const { error } = await supabase.auth.signOut({ scope: "local" });
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
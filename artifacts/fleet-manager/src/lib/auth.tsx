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
      window.history.replaceState({}, document.title, window.location.pathname);
    }

    let mounted = true;
    supabase.auth.getSession().then(({ data, error }) => {
      if (!mounted) return;
      if (error) setAuthError(error.message);
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
      const redirectTo = new URL(import.meta.env.BASE_URL || "/", window.location.origin).toString();
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: { redirectTo },
      });
      if (error) {
        setAuthError(error.message);
        setSigningIn(false);
      }
    },
    signOut: async () => {
      const { error } = await supabase.auth.signOut();
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
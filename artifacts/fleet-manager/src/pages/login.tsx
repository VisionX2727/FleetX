import { useAuth } from "@/lib/auth";
import { LogIn, ShieldCheck } from "lucide-react";

export default function Login() {
  const { signInWithGoogle, signingIn, authError } = useAuth();

  return (
    <main className="min-h-[100dvh] bg-background flex items-center justify-center px-6 py-10">
      <div className="w-full max-w-md">
        <div className="bg-primary rounded-t-[2.5rem] px-7 pt-10 pb-8 shadow-lg">
          <div className="w-16 h-16 rounded-2xl bg-black/90 text-primary flex items-center justify-center shadow-md mb-6">
            <span className="text-3xl font-black">FM</span>
          </div>
          <p className="text-xs font-black uppercase tracking-[0.2em] opacity-70">Fleet Operations</p>
          <h1 className="text-4xl font-black tracking-tight mt-2">Fleet Manager</h1>
          <p className="mt-3 font-semibold max-w-xs">Run your vehicles, work logs, drivers and customer accounts from one place.</p>
        </div>
        <div className="bg-card rounded-b-[2.5rem] border border-border border-t-0 p-7 shadow-lg">
          <div className="flex items-start gap-3 mb-7">
            <ShieldCheck className="text-green-600 shrink-0 mt-0.5" size={22} />
            <div>
              <h2 className="font-bold">Sign in to continue</h2>
              <p className="text-sm text-muted-foreground mt-1">Your fleet records are saved to your Google account.</p>
            </div>
          </div>
          <button
            type="button"
            onClick={signInWithGoogle}
            disabled={signingIn}
            className="w-full bg-foreground text-background rounded-2xl p-4 font-bold flex items-center justify-center gap-3 disabled:opacity-60 active:scale-[.98] transition-transform"
          >
            <span className="w-7 h-7 rounded-full bg-white text-black flex items-center justify-center font-black">G</span>
            {signingIn ? "Opening Google..." : "Continue with Google"}
            <LogIn size={18} />
          </button>
          {authError && (
            <div className="mt-4 rounded-xl border border-destructive/20 bg-destructive/5 text-destructive p-3 text-sm font-medium">
              {authError}
              {authError.toLowerCase().includes("provider") && (
                <p className="mt-2 text-xs">Enable Google under Supabase → Authentication → Providers, then add this app URL under Redirect URLs.</p>
              )}
            </div>
          )}
          <p className="text-[11px] text-muted-foreground text-center mt-6">Only your signed-in account can access its fleet workspace.</p>
        </div>
      </div>
    </main>
  );
}
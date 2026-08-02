import { useAuth } from "@/lib/auth";
import { LogIn, ShieldCheck, Truck } from "lucide-react";

export default function Login() {
  const { signInWithGoogle, signingIn, authError } = useAuth();

  return (
    <main className="min-h-[100dvh] bg-background flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-md flex flex-col gap-8">
        <div className="text-center">
          <div className="w-20 h-20 mx-auto bg-card border border-border rounded-2xl flex items-center justify-center mb-6 shadow-lg shadow-black/20">
            <Truck className="text-primary" size={40} />
          </div>
           <h1 className="text-3xl font-black tracking-tight text-foreground">FleetX</h1>
          <p className="text-muted-foreground mt-2 font-medium">Run your vehicles, work logs, drivers and accounts from one place.</p>
        </div>

        <div className="bg-card rounded-3xl border border-border p-7 shadow-xl relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-1 bg-primary"></div>

          <div className="flex items-start gap-4 mb-8">
            <div className="p-2.5 bg-primary/10 rounded-xl text-primary shrink-0">
              <ShieldCheck size={24} />
            </div>
            <div>
              <h2 className="font-bold text-foreground text-lg">Sign in to continue</h2>
           <p className="text-sm text-muted-foreground mt-0.5 leading-snug">Your FleetX records are saved to your Google account.</p>
            </div>
          </div>

          <button
            type="button"
            onClick={signInWithGoogle}
            disabled={signingIn}
            className="w-full bg-primary text-primary-foreground rounded-2xl p-4 font-bold flex items-center justify-center gap-3 disabled:opacity-60 active:scale-[.98] transition-all hover:bg-primary/90 shadow-[0_4px_14px_rgba(245,158,11,0.3)]"
          >
            <span className="w-7 h-7 rounded-full bg-primary-foreground text-primary flex items-center justify-center font-black text-sm">G</span>
            {signingIn ? "Opening Google..." : "Continue with Google"}
            <LogIn size={18} className="ml-1" />
          </button>

          {authError && (
            <div className="mt-5 rounded-xl border border-destructive/30 bg-destructive/10 text-destructive p-4 text-sm font-medium">
              {authError}
              {authError.toLowerCase().includes("provider") && (
                <p className="mt-2 text-xs opacity-80">Enable Google under Supabase → Authentication → Providers, then add this app URL under Redirect URLs.</p>
              )}
            </div>
          )}

          <p className="text-[11px] text-muted-foreground text-center mt-6">Only your signed-in account can access its fleet workspace.</p>
        </div>

        <p className="text-xs text-muted-foreground/60 text-center font-bold mt-4 uppercase tracking-[0.15em]">
          Rugged • Trusted • Field Ready
        </p>
      </div>
    </main>
  );
}

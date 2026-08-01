import { Link, useLocation } from "wouter";
import { 
  Home, 
  Truck, 
  ClipboardList, 
  BookOpen, 
  BarChart3,
  Calculator,
  Settings as SettingsIcon,
} from "lucide-react";
import { useStore } from "@/lib/store";

export function Layout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const { state } = useStore();
  const today = new Date().toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' });
  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";

  const navItems = [
    { path: "/", icon: Home, label: "Home" },
    { path: "/fleet", icon: Truck, label: "Fleet" },
    { path: "/logs", icon: ClipboardList, label: "Logs" },
    { path: "/calculator", icon: Calculator, label: "Calc" },
    { path: "/analytics", icon: BarChart3, label: "Analytics" },
    { path: "/khata", icon: BookOpen, label: "Khata" },
  ];

  return (
    <div className="min-h-[100dvh] flex flex-col bg-background text-foreground pb-[72px]">
      {/* Global Header */}
      <header className="bg-card border-b border-border px-4 py-3 flex items-center justify-between sticky top-0 z-40 shadow-sm">
        <div className="flex items-center gap-3">
          {state.settings.logoUrl ? <img src={state.settings.logoUrl} alt="Business logo" className="w-10 h-10 rounded-full object-cover border-2 border-primary shrink-0" /> : <div className="w-10 h-10 rounded-full bg-primary border-2 border-background flex items-center justify-center text-primary-foreground font-black text-sm shrink-0 shadow-sm">{(state.settings.businessName || "FM").slice(0, 2).toUpperCase()}</div>}
          <div className="flex flex-col">
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{greeting},</span>
              <span className="w-1 h-1 rounded-full bg-border"></span>
              <span className="text-[10px] font-semibold text-primary">{today}</span>
            </div>
            <h1 className="text-sm font-bold leading-tight mt-0.5">{state.settings.businessName || "Fleet Manager"}</h1>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/calculator" className="w-9 h-9 rounded-full bg-background border border-border flex items-center justify-center text-muted-foreground hover:text-primary transition-colors">
            <Calculator size={18} />
          </Link>
          <Link href="/settings" className="w-9 h-9 rounded-full bg-background border border-border flex items-center justify-center text-muted-foreground hover:text-primary transition-colors">
            <SettingsIcon size={18} />
          </Link>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 overflow-y-auto">
        {children}
      </main>

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 bg-card border-t border-border px-1 pt-1.5 pb-[calc(0.375rem+env(safe-area-inset-bottom))] flex items-center justify-around z-40">
        {navItems.map((item) => {
          const isActive = location === item.path || (item.path !== "/" && location.startsWith(item.path));
          return (
            <Link key={item.path} href={item.path} className="flex flex-col items-center justify-center w-14 h-12 rounded-xl transition-all active:scale-95">
              <item.icon 
                size={22} 
                strokeWidth={isActive ? 2.5 : 2}
                className={isActive ? "text-primary drop-shadow-[0_0_8px_rgba(245,158,11,0.3)]" : "text-muted-foreground"}
              />
              <span className={`text-[10px] mt-1 font-bold ${isActive ? "text-primary" : "text-muted-foreground"}`}>
                {item.label}
              </span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}

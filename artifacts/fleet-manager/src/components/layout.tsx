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

  const navItems = [
    { path: "/", icon: Home, label: "Home" },
    { path: "/fleet", icon: Truck, label: "Fleet" },
    { path: "/logs", icon: ClipboardList, label: "Logs" },
    { path: "/calculator", icon: Calculator, label: "Calc" },
    { path: "/analytics", icon: BarChart3, label: "Analytics" },
    { path: "/khata", icon: BookOpen, label: "Khata" },
  ];
  const hideBottomNav = location === "/settings" || location === "/drivers";

  return (
    <div className="fm-app-shell">
      <main className="fm-main-content">
        {children}
      </main>

      {!hideBottomNav && <nav className="fm-bottom-nav">
          {navItems.map((item) => {
            const isActive = location === item.path || (item.path !== "/" && location.startsWith(item.path));
            return (
              <Link key={item.path} href={item.path} className={`fm-bottom-item ${isActive ? "is-active" : ""}`}>
                <item.icon size={23} strokeWidth={isActive ? 2.5 : 1.8} />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>}
      <Link href="/settings" className="sr-only">Settings</Link>
      <Link href="/calculator" className="sr-only">Calculator</Link>
    </div>
  );
}

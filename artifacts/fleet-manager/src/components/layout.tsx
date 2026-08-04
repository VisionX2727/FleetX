import { Link, useLocation } from "wouter";
import { 
  Home, 
  Truck, 
  ClipboardList, 
  BookOpen, 
  BarChart3,
  Calculator,
  Droplet,
  ReceiptText,
} from "lucide-react";
import { useRole } from "@/lib/role";

function detectMobileDevice() {
  if (typeof navigator === "undefined" || typeof window === "undefined") return false;

  const mobileUserAgent = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini|Mobile/i.test(navigator.userAgent);
  // iPadOS can identify itself as macOS Safari, so preserve its mobile
  // behavior without treating touchscreen Windows laptops as phones.
  const ipadOs = navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1;
  return mobileUserAgent || ipadOs;
}

export function Layout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const mobileDevice = detectMobileDevice();
  const { role } = useRole();

  const navItems = role === "driver"
    ? [
        { path: "/", icon: Home, label: "Home" },
        { path: "/logs", icon: ClipboardList, label: "Logs" },
        { path: "/fuel", icon: Droplet, label: "Fuel" },
        { path: "/calculator", icon: Calculator, label: "Calc" },
        { path: "/invoices", icon: ReceiptText, label: "Invoices" },
      ]
    : [
        { path: "/", icon: Home, label: "Home" },
        { path: "/fleet", icon: Truck, label: "Fleet" },
        { path: "/logs", icon: ClipboardList, label: "Logs" },
        { path: "/calculator", icon: Calculator, label: "Calc" },
        { path: "/analytics", icon: BarChart3, label: "Analytics" },
        { path: "/khata", icon: BookOpen, label: "Khata" },
      ];
  const hideBottomNav = location === "/settings" || location === "/drivers";

  return (
    <div className="fm-app-shell" data-device={mobileDevice ? "mobile" : "desktop"}>
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

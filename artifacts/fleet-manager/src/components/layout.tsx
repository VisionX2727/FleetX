import { Link, useLocation } from "wouter";
import { 
  Home, 
  Truck, 
  ClipboardList, 
  BookOpen, 
  Menu,
  Droplet,
  BarChart3,
  Users,
  Calculator,
  Settings as SettingsIcon,
  X
} from "lucide-react";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

export function Layout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const navItems = [
    { path: "/", icon: Home, label: "Home" },
    { path: "/fleet", icon: Truck, label: "Fleet" },
    { path: "/logs", icon: ClipboardList, label: "Logs" },
    { path: "/khata", icon: BookOpen, label: "Khata" },
  ];

  const menuItems = [
    { path: "/fuel", icon: Droplet, label: "Fuel Records" },
    { path: "/analytics", icon: BarChart3, label: "Analytics" },
    { path: "/drivers", icon: Users, label: "Drivers & Pay" },
    { path: "/calculator", icon: Calculator, label: "Calculator" },
    { path: "/settings", icon: SettingsIcon, label: "Settings" },
  ];

  return (
    <div className="min-h-[100dvh] flex flex-col bg-background pb-16">
      {/* Main Content Area */}
      <main className="flex-1 overflow-y-auto">
        {children}
      </main>

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 w-full bg-card border-t border-border px-2 py-2 flex items-center justify-around z-40">
        {navItems.map((item) => {
          const isActive = location === item.path || (item.path !== "/" && location.startsWith(item.path));
          return (
            <Link key={item.path} href={item.path} className="flex flex-col items-center justify-center w-16 h-12">
              <item.icon 
                size={22} 
                className={isActive ? "text-primary" : "text-muted-foreground"} 
                strokeWidth={isActive ? 2.5 : 2}
              />
              <span className={`text-[10px] mt-1 font-medium ${isActive ? "text-primary" : "text-muted-foreground"}`}>
                {item.label}
              </span>
            </Link>
          );
        })}
        <button 
          onClick={() => setIsMenuOpen(true)}
          className="flex flex-col items-center justify-center w-16 h-12"
        >
          <Menu size={22} className="text-muted-foreground" strokeWidth={2} />
          <span className="text-[10px] mt-1 font-medium text-muted-foreground">More</span>
        </button>
      </nav>

      {/* Full Screen Menu Overlay */}
      <AnimatePresence>
        {isMenuOpen && (
          <>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsMenuOpen(false)}
              className="fixed inset-0 bg-black/60 z-50"
            />
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="fixed bottom-0 left-0 right-0 bg-card rounded-t-3xl z-50 px-6 py-8 shadow-2xl"
            >
              <div className="flex items-center justify-between mb-8">
                <h2 className="text-xl font-bold">More Options</h2>
                <button 
                  onClick={() => setIsMenuOpen(false)}
                  className="p-2 bg-muted rounded-full"
                >
                  <X size={20} />
                </button>
              </div>
              <div className="grid grid-cols-3 gap-6">
                {menuItems.map((item) => {
                  const isActive = location.startsWith(item.path);
                  return (
                    <Link 
                      key={item.path} 
                      href={item.path} 
                      onClick={() => setIsMenuOpen(false)}
                      className="flex flex-col items-center justify-center gap-3"
                    >
                      <div className={`w-14 h-14 rounded-2xl flex items-center justify-center ${isActive ? 'bg-primary text-primary-foreground' : 'bg-muted text-foreground'}`}>
                        <item.icon size={26} strokeWidth={isActive ? 2.5 : 2} />
                      </div>
                      <span className="text-xs font-semibold text-center">{item.label}</span>
                    </Link>
                  );
                })}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}

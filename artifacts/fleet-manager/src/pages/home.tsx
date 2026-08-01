import { useStore } from "@/lib/store";
import { Layout } from "@/components/layout";
import { Link } from "wouter";
import { ArrowDownRight, BarChart3, BookOpen, ClipboardList, Droplet, Plus, Settings2, Truck, Users, Wrench, Calculator, Settings } from "lucide-react";

const fallbackLogo = `${import.meta.env.BASE_URL}rajmudra-logo.png`;

export default function Home() {
  const { state } = useStore();
  const today = new Date().toISOString().split("T")[0];
  const todayLogs = state.logs.filter((log) => log.date === today);
  const revenue = todayLogs.reduce((sum, log) => sum + log.amount, 0) + state.fleetDays.filter((day) => day.date === today).reduce((sum, day) => sum + day.amount, 0);
  const expenses = state.fuelRecords.filter((fuel) => fuel.date === today).reduce((sum, fuel) => sum + fuel.cost, 0);
  const active = state.vehicles.filter((vehicle) => vehicle.status === "Active").length;
  const idle = state.vehicles.filter((vehicle) => vehicle.status === "Idle").length;
  const maintenance = state.vehicles.filter((vehicle) => vehicle.status === "Maintenance").length;

  return (
    <Layout>
      <header className="fm-home-header">
        <div className="fm-home-brand">
          <img src={state.settings.logoUrl || fallbackLogo} alt="Business logo" />
          <div>
            <div className="fm-home-greeting">{new Date().getHours() < 12 ? "Good Morning" : new Date().getHours() < 17 ? "Good Afternoon" : "Good Evening"}</div>
            <div className="fm-home-title">{state.settings.businessName || "Fleet Manager"}</div>
          </div>
        </div>
        <div className="fm-home-header-actions">
          <Link href="/calculator"><Calculator size={21} /></Link>
          <Link href="/settings"><Settings size={22} /></Link>
        </div>
      </header>
      <div className="border-b border-border bg-[#1b2d3c] px-5 py-3 text-sm text-muted-foreground">
        {new Date().toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long", year: "numeric" })} • {new Date().toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}
      </div>
      <main className="fm-page-content space-y-5">
        <section className="fm-overview">
          <div className="fm-section-heading"><h2>Today's Business Overview</h2><span className="text-xs text-muted-foreground">{new Date().toLocaleDateString("en-IN")}</span></div>
          <div className="fm-overview-grid">
            <div className="fm-overview-stat"><BarChart3 className="text-emerald-400" size={22} /><strong>₹{revenue.toLocaleString("en-IN")}</strong><span>Revenue</span></div>
            <div className="fm-overview-stat"><ArrowDownRight className="text-rose-400" size={22} /><strong>₹{expenses.toLocaleString("en-IN")}</strong><span>Expenses</span></div>
            <div className="fm-overview-stat"><BarChart3 className="text-primary" size={22} /><strong>₹{(revenue - expenses).toLocaleString("en-IN")}</strong><span>Net Profit</span></div>
          </div>
        </section>

        <section>
          <div className="fm-section-heading"><h2>Live Fleet Status</h2><Link href="/drivers">Drivers</Link></div>
          <div className="fm-card p-4">
            {state.vehicles.length === 0 ? <div className="fm-empty-state min-h-32"><Truck size={40} /><p>No vehicles. Tap to add in Fleet.</p></div> : <div className="grid grid-cols-3 gap-2 text-center"><div><strong className="block text-2xl font-black text-emerald-400">{active}</strong><span className="text-xs text-muted-foreground">Active</span></div><div><strong className="block text-2xl font-black text-amber-300">{idle}</strong><span className="text-xs text-muted-foreground">Idle</span></div><div><strong className="block text-2xl font-black text-rose-300">{maintenance}</strong><span className="text-xs text-muted-foreground">Maintenance</span></div></div>}
          </div>
        </section>

        <section>
          <div className="fm-section-heading"><h2>Quick Actions</h2></div>
          <div className="fm-quick-grid">
            <Link href="/logs?action=new" className="fm-quick-action"><ClipboardList size={27} /> New Entry</Link>
            <Link href="/fuel?action=new" className="fm-quick-action"><Droplet size={27} /> Add Fuel</Link>
            <Link href="/fleet" className="fm-quick-action"><Wrench size={27} /> Maintenance</Link>
            <Link href="/analytics" className="fm-quick-action"><BarChart3 size={27} /> Reports</Link>
            <Link href="/khata" className="fm-quick-action"><BookOpen size={27} /> Khata Book</Link>
            <Link href="/drivers" className="fm-quick-action"><Users size={27} /> Drivers</Link>
          </div>
        </section>

        <section className="pb-4">
          <div className="fm-section-heading"><h2>Recent Logs</h2><Link href="/logs">View all</Link></div>
           {todayLogs.length === 0 ? <div className="fm-card p-6 text-center text-sm text-muted-foreground">No logs added today.</div> : <div className="fm-stack">{todayLogs.slice().reverse().slice(0, 3).map((log) => <div className="fm-list-row" key={log.id}><div><strong>{state.vehicles.find((vehicle) => vehicle.id === log.vehicleId)?.name || "Vehicle"}</strong><small>{log.description} • {log.hours} hrs</small></div><div className="fm-list-value text-primary">₹{log.amount.toLocaleString("en-IN")}</div></div>)}</div>}
        </section>
      </main>
      <Link href="/logs?action=new" className="fm-fab" aria-label="Add work entry"><Plus size={30} /></Link>
    </Layout>
  );
}
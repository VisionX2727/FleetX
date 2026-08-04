import { Layout } from "@/components/layout";
import { useRole } from "@/lib/role";
import { useStore } from "@/lib/store";
import { Link } from "wouter";
import { Calculator, ClipboardList, Droplet, FileText, Settings, Wrench } from "lucide-react";

export default function DriverHome() {
  const { state } = useStore();
  const { ownerSettings, member } = useRole();
  const today = new Date().toISOString().split("T")[0];
  const month = today.slice(0, 7);
  const monthLogs = state.logs.filter((log) => log.date.startsWith(month));
  const workedDays = new Set(monthLogs.map((log) => log.date)).size;
  const paidIds = new Set(state.driverPays.flatMap((pay) => pay.logIds || []));
  const pending = monthLogs.filter((log) => !paidIds.has(log.id)).reduce((sum, log) => sum + (log.amount || 0), 0);
  const paid = state.driverPays.filter((pay) => pay.date.startsWith(month)).reduce((sum, pay) => sum + pay.amount, 0);
  const brand = ownerSettings?.companyName || ownerSettings?.businessName || "Owner Fleet";

  return (
    <Layout>
      <header className="fm-home-header">
        <div className="fm-home-brand">
          {ownerSettings?.logoUrl ? <img src={ownerSettings.logoUrl} alt="Owner company logo" /> : <div className="fm-home-logo">OF</div>}
          <div><div className="fm-home-greeting">Driver Workspace</div><div className="fm-home-title">{brand}</div></div>
        </div>
        <div className="fm-home-header-actions"><Link href="/settings"><Settings size={22} /></Link></div>
      </header>
      <div className="border-b border-border bg-[#1b2d3c] px-5 py-3 text-sm text-muted-foreground">Owner {ownerSettings?.ownerName || brand}</div>
      <main className="fm-page-content space-y-5">
        <section className="fm-overview">
          <div className="fm-section-heading"><h2>This Month</h2><span className="text-xs text-muted-foreground">{month}</span></div>
          <div className="fm-overview-grid">
            <div className="fm-overview-stat"><ClipboardList className="mx-auto mb-2 text-primary" size={22} /><strong>{workedDays}</strong><span>Working Days</span></div>
            <div className="fm-overview-stat"><strong>₹{pending.toLocaleString("en-IN")}</strong><span>Pending</span></div>
            <div className="fm-overview-stat"><strong>₹{paid.toLocaleString("en-IN")}</strong><span>Paid</span></div>
          </div>
        </section>
        <section className="fm-card p-4">
          <div className="fm-section-heading"><h2>My Vehicles</h2><Link href="/settings">Edit</Link></div>
          <div className="space-y-2">{state.vehicles.length ? state.vehicles.map((vehicle) => <div key={vehicle.id} className="fm-list-row"><div><strong>{vehicle.name}</strong><small>{vehicle.type} • {vehicle.regNumber}</small></div><span className="text-xs font-bold text-emerald-400">{vehicle.status}</span></div>) : <p className="text-sm text-muted-foreground">Select your vehicles in Settings.</p>}</div>
        </section>
        <section><div className="fm-section-heading"><h2>Quick Actions</h2></div><div className="fm-quick-grid">
          <Link href="/logs?action=new" className="fm-quick-action"><ClipboardList size={27} /> New Log</Link>
          <Link href="/fuel?action=new" className="fm-quick-action"><Droplet size={27} /> Add Fuel</Link>
          <Link href="/maintenance" className="fm-quick-action"><Wrench size={27} /> Maintenance</Link>
          <Link href="/calculator" className="fm-quick-action"><Calculator size={27} /> Calculator</Link>
          <Link href="/notes" className="fm-quick-action"><FileText size={27} /> Notes</Link>
          <Link href="/payments" className="fm-quick-action"><ClipboardList size={27} /> Payments</Link>
        </div></section>
        <p className="text-center text-xs text-muted-foreground">Signed in as {member?.profile.name || "Driver"}</p>
      </main>
    </Layout>
  );
}
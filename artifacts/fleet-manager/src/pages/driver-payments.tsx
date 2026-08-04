import { Layout } from "@/components/layout";
import { useStore } from "@/lib/store";
import { Link } from "wouter";
import { ArrowLeft, CheckCircle2, Clock3, IndianRupee } from "lucide-react";

export default function DriverPayments() {
  const { state } = useStore();
  const driver = state.drivers[0];
  const paidIds = new Set(state.driverPays.flatMap((payment) => payment.logIds || []));
  const pendingLogs = state.logs.filter((log) => !paidIds.has(log.id)).sort((a, b) => b.date.localeCompare(a.date));
  const pendingAmount = pendingLogs.reduce((sum, log) => sum + (driver?.dailyRate || log.amount || 0), 0);
  const paidAmount = state.driverPays.reduce((sum, payment) => sum + payment.amount, 0);

  return (
    <Layout>
      <div className="flex items-center gap-2 border-b border-border bg-[#1b2d3c] px-5 py-4">
        <Link href="/" className="text-muted-foreground"><ArrowLeft size={22} /></Link>
        <div><h1 className="text-2xl font-black">Payments</h1><p className="text-xs text-muted-foreground">Your pending and paid work</p></div>
      </div>
      <main className="fm-page-content space-y-5 pb-24">
        <div className="fm-overview-grid">
          <div className="fm-overview-stat"><Clock3 className="mx-auto mb-2 text-amber-300" size={22} /><strong>₹{pendingAmount.toLocaleString("en-IN")}</strong><span>Pending</span></div>
          <div className="fm-overview-stat"><CheckCircle2 className="mx-auto mb-2 text-emerald-400" size={22} /><strong>₹{paidAmount.toLocaleString("en-IN")}</strong><span>Paid</span></div>
        </div>
        <section>
          <div className="fm-section-heading"><h2>Pending</h2><span className="text-xs text-muted-foreground">{pendingLogs.length} entries</span></div>
          {pendingLogs.length ? <div className="space-y-2">{pendingLogs.map((log) => <div key={log.id} className="fm-list-row"><div><strong>{log.date}</strong><small>{log.description || "Work entry"}</small></div><div className="font-black text-amber-300">₹{(driver?.dailyRate || log.amount || 0).toLocaleString("en-IN")}</div></div>)}</div> : <div className="fm-card p-5 text-sm text-muted-foreground">No pending work.</div>}
        </section>
        <section>
          <div className="fm-section-heading"><h2>Paid History</h2></div>
          {state.driverPays.length ? <div className="space-y-2">{state.driverPays.slice().reverse().map((payment) => <div key={payment.id} className="fm-list-row"><div><strong>{payment.description || "Driver payment"}</strong><small>{payment.date} • {payment.logIds?.length || 0} work entries</small></div><div className="font-black text-emerald-400">₹{payment.amount.toLocaleString("en-IN")}</div></div>)}</div> : <div className="fm-card p-5 text-sm text-muted-foreground">No paid history yet.</div>}
        </section>
        <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground"><IndianRupee size={14} /> Payments are recorded by the owner.</div>
      </main>
    </Layout>
  );
}
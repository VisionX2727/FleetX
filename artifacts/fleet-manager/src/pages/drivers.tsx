import { Layout } from "@/components/layout";
import { useStore, Driver } from "@/lib/store";
import { useState } from "react";
import { Plus, Users, IndianRupee, History, CheckCircle2, CalendarDays, UserCheck, UserX } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

export default function Drivers() {
  const { state, dispatch } = useStore();
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [payDriverId, setPayDriverId] = useState<string | null>(null);
  const [historyDriverId, setHistoryDriverId] = useState<string | null>(null);
  const [detailDriverId, setDetailDriverId] = useState<string | null>(null);
  const [payAmount, setPayAmount] = useState(0);
  
  const [formData, setFormData] = useState<Partial<Driver>>({
    name: "", phone: "", type: "Regular", dailyRate: 0, vehicleId: "", startDate: new Date().toISOString().split("T")[0], endDate: ""
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    dispatch({ type: 'ADD_DRIVER', payload: formData });
    setIsAddOpen(false);
    setFormData({ name: "", phone: "", type: "Regular", dailyRate: 0, vehicleId: "", startDate: new Date().toISOString().split("T")[0], endDate: "" });
  };

  const driverLogs = (driverId: string) => state.logs.filter((log) => log.driverId === driverId).sort((a, b) => b.date.localeCompare(a.date));
  const unpaidDriverLogs = (driverId: string) => driverLogs(driverId).filter((log) => !state.driverPays.some((pay) => pay.driverId === driverId && pay.logIds?.includes(log.id)));
  const driverEarned = (driverId: string) => unpaidDriverLogs(driverId).reduce((sum, log) => {
    const driver = state.drivers.find((item) => item.id === driverId);
    return sum + (driver?.dailyRate || 0);
  }, 0);
  const driverPaid = (driverId: string) => state.driverPays.filter((pay) => pay.driverId === driverId).reduce((sum, pay) => sum + pay.amount, 0);

  return (
    <Layout>
      <div className="fm-page-header">
        <div className="flex justify-between items-end">
          <div>
            <h1>Drivers</h1>
            <p>Regular and temporary operators</p>
          </div>
          <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
            <DialogTrigger asChild>
              <button className="fm-icon-button fm-primary-icon">
                <Plus size={24} strokeWidth={3} />
              </button>
            </DialogTrigger>
            <DialogContent className="w-[90vw] max-w-md rounded-2xl">
              <DialogHeader>
                <DialogTitle className="text-xl font-bold">Add Driver</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4 mt-4">
                <div>
                  <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1 block">Name</label>
                  <input required value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="w-full bg-muted border-none rounded-xl p-4 font-semibold outline-none focus:ring-2 focus:ring-primary" placeholder="e.g. Ramesh" />
                </div>
                <div>
                  <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1 block">Phone</label>
                  <input required type="tel" value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} className="w-full bg-muted border-none rounded-xl p-4 font-semibold outline-none focus:ring-2 focus:ring-primary" placeholder="10 digit number" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1 block">Type</label>
                    <select required value={formData.type} onChange={e => setFormData({...formData, type: e.target.value as any})} className="w-full bg-muted border-none rounded-xl p-4 font-semibold outline-none focus:ring-2 focus:ring-primary">
                      <option value="Regular">Regular</option>
                      <option value="Temporary">Temporary</option>
                    </select>
                  </div>
                <div>
                  <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1 block">Assigned Vehicle</label>
                  <select value={formData.vehicleId || ""} onChange={e => setFormData({...formData, vehicleId: e.target.value || undefined})} className="w-full bg-muted border-none rounded-xl p-4 font-semibold outline-none focus:ring-2 focus:ring-primary">
                    <option value="">Select later</option>
                    {state.vehicles.map(vehicle => <option key={vehicle.id} value={vehicle.id}>{vehicle.name} ({vehicle.regNumber})</option>)}
                  </select>
                </div>
                {formData.type === "Temporary" && <div className="col-span-2 grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1 block">Start Date</label>
                    <input type="date" value={formData.startDate || ""} onChange={e => setFormData({...formData, startDate: e.target.value})} className="w-full bg-muted border-none rounded-xl p-4 font-semibold outline-none focus:ring-2 focus:ring-primary" />
                  </div>
                  <div>
                    <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1 block">End Date</label>
                    <input type="date" value={formData.endDate || ""} onChange={e => setFormData({...formData, endDate: e.target.value})} className="w-full bg-muted border-none rounded-xl p-4 font-semibold outline-none focus:ring-2 focus:ring-primary" />
                  </div>
                </div>}
                  <div>
                    <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1 block">Daily Rate (₹)</label>
                    <input type="number" required value={formData.dailyRate || ''} onChange={e => setFormData({...formData, dailyRate: Number(e.target.value)})} className="w-full bg-muted border-none rounded-xl p-4 font-semibold outline-none focus:ring-2 focus:ring-primary" placeholder="1000" />
                  </div>
                </div>
                <button type="submit" className="w-full bg-foreground text-background font-bold p-4 rounded-xl mt-4 active:scale-95 transition-transform">
                  Save Driver
                </button>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="px-6 py-6 space-y-4 pb-24">
        {state.drivers.length === 0 ? (
          <div className="text-center py-12 bg-card rounded-2xl border border-border border-dashed">
            <Users size={48} className="mx-auto text-muted-foreground opacity-30 mb-4" />
            <h3 className="text-lg font-bold">No drivers added</h3>
            <p className="text-sm text-muted-foreground mt-1">Add drivers to assign them to work logs.</p>
          </div>
        ) : (
          state.drivers.map(driver => (
            <div key={driver.id} className="bg-card rounded-2xl border border-border p-5 shadow-sm">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="text-xl font-bold">{driver.name}</h3>
                  <div className="text-sm font-semibold text-muted-foreground mt-0.5">{driver.phone}</div>
                   {driver.vehicleId && <div className="text-xs font-semibold text-primary mt-1">{state.vehicles.find(vehicle => vehicle.id === driver.vehicleId)?.name || "Assigned vehicle"}</div>}
                   <div className="inline-block mt-2 px-2 py-1 bg-muted rounded text-xs font-bold text-muted-foreground uppercase">
                    {driver.type} • ₹{driver.dailyRate}/day
                  </div>
                   {driver.type === "Temporary" && (driver.startDate || driver.endDate) && <div className="mt-2 text-xs text-muted-foreground">{driver.startDate || "—"} to {driver.endDate || "Open"}</div>}
                </div>
              </div>
               <div className="flex gap-2 pt-4 border-t border-border/50">
                 <button onClick={() => setDetailDriverId(driver.id)} className="flex-1 bg-primary/10 text-primary py-2.5 rounded-xl text-sm font-bold flex items-center justify-center gap-2 active:bg-primary/20">
                   <CalendarDays size={16} /> Work days
                 </button>
               </div>
               <div className="flex gap-2 pt-2">
                 <button onClick={() => { setPayDriverId(driver.id); setPayAmount(driverEarned(driver.id)); }} className="flex-1 bg-primary/10 text-primary py-2.5 rounded-xl text-sm font-bold flex items-center justify-center gap-2 active:bg-primary/20">
                  <IndianRupee size={16} /> Pay
                </button>
                <button onClick={() => setHistoryDriverId(driver.id)} className="flex-1 bg-muted text-foreground py-2.5 rounded-xl text-sm font-bold flex items-center justify-center gap-2 active:bg-muted/80">
                  <History size={16} /> History
                </button>
              </div>
            </div>
          ))
        )}
      </div>
      <Dialog open={Boolean(payDriverId)} onOpenChange={(open) => !open && setPayDriverId(null)}>
        <DialogContent className="w-[90vw] max-w-md rounded-2xl">
          {payDriverId && (() => {
            const driver = state.drivers.find((item) => item.id === payDriverId);
            if (!driver) return null;
             const outstanding = driverEarned(driver.id);
            return <><DialogHeader><DialogTitle className="text-xl font-bold">Pay {driver.name}</DialogTitle></DialogHeader><div className="rounded-xl bg-primary/10 p-4 my-3"><div className="text-xs font-bold uppercase text-muted-foreground">Outstanding work</div><div className="text-3xl font-black">₹{outstanding.toLocaleString()}</div><div className="text-xs text-muted-foreground mt-1">{unpaidDriverLogs(driver.id).length} unpaid work days will move to history</div></div><form onSubmit={(event) => { event.preventDefault(); dispatch({ type: "ADD_DRIVER_PAY", payload: { driverId: driver.id, date: new Date().toISOString().split("T")[0], amount: payAmount, logIds: unpaidDriverLogs(driver.id).map((log) => log.id), description: "Driver payment" } }); setPayDriverId(null); }} className="space-y-4"><input type="number" min="0" required value={payAmount || ""} onChange={(event) => setPayAmount(Number(event.target.value))} className="w-full bg-muted rounded-xl p-4 font-semibold outline-none focus:ring-2 focus:ring-primary" placeholder="Amount paid" /><button type="submit" className="w-full bg-foreground text-background font-bold p-4 rounded-xl">Mark as Paid</button></form></>;
          })()}
      </DialogContent>
      </Dialog>
      <Dialog open={Boolean(detailDriverId)} onOpenChange={(open) => !open && setDetailDriverId(null)}>
        <DialogContent className="fm-dialog">
          {detailDriverId && (() => {
            const driver = state.drivers.find((item) => item.id === detailDriverId);
            if (!driver) return null;
             const logs = unpaidDriverLogs(driver.id);
            const assignedDates = new Set(logs.map((log) => log.date));
            const vehicle = driver.vehicleId ? state.vehicles.find((item) => item.id === driver.vehicleId) : undefined;
            const absentDates = state.logs.filter((log) => vehicle && log.vehicleId === vehicle.id && log.driverId !== driver.id).map((log) => log.date).filter((date, index, dates) => dates.indexOf(date) === index);
            return (
              <>
                <DialogHeader><DialogTitle>{driver.name} work history</DialogTitle></DialogHeader>
                <div className="fm-kpi-grid"><div><span>Worked days</span><strong>{assignedDates.size}</strong></div><div><span>Earned</span><strong>₹{driverEarned(driver.id).toLocaleString("en-IN")}</strong></div><div><span>Paid</span><strong>₹{driverPaid(driver.id).toLocaleString("en-IN")}</strong></div></div>
                <div className="fm-stack">
                  {logs.length === 0 && absentDates.length === 0 && <p className="fm-muted">No work history yet.</p>}
                  {logs.map((log) => <div className="fm-list-row" key={log.id}><div><strong>{log.date} • {state.vehicles.find((item) => item.id === log.vehicleId)?.name || "Vehicle"}</strong><small>{log.description} • {log.hours} hours</small></div><div className="fm-list-value text-primary">₹{driver.dailyRate.toLocaleString("en-IN")}</div></div>)}
                  {absentDates.map((date) => <div className="fm-list-row" key={`absent-${date}`}><div><strong>{date}</strong><small>{vehicle?.name || "Assigned vehicle"} • another driver selected</small></div><div className="flex items-center gap-1 text-xs font-black text-rose-300"><UserX size={14} /> Absent</div></div>)}
                </div>
              </>
            );
          })()}
        </DialogContent>
      </Dialog>
      <Dialog open={Boolean(historyDriverId)} onOpenChange={(open) => !open && setHistoryDriverId(null)}>
        <DialogContent className="w-[90vw] max-w-md rounded-2xl">
          {historyDriverId && (() => {
            const driver = state.drivers.find((item) => item.id === historyDriverId);
            if (!driver) return null;
            const pays = state.driverPays.filter((pay) => pay.driverId === driver.id).slice().reverse();
            return <><DialogHeader><DialogTitle className="text-xl font-bold">{driver.name} payment history</DialogTitle></DialogHeader><div className="space-y-2 mt-3">{pays.length === 0 ? <p className="text-sm text-muted-foreground">No payments recorded.</p> : pays.map((pay) => <div key={pay.id} className="flex items-center justify-between rounded-xl bg-green-50 p-3"><div><div className="font-bold text-sm">{pay.description}</div><div className="text-xs text-green-700">{pay.date} • Paid</div></div><div className="font-black text-green-700">₹{pay.amount.toLocaleString()}</div></div>)}</div></>;
          })()}
        </DialogContent>
      </Dialog>
    </Layout>
  );
}

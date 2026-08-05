import { Layout } from "@/components/layout";
import { useStore, Driver } from "@/lib/store";
import { useState } from "react";
import { Plus, Users, IndianRupee, History, CheckCircle2, CalendarDays, UserCheck, UserX, ArrowLeft, UserRoundPlus, Pencil, Trash2, Phone, Ban, RotateCcw, UserMinus, FileUp, Send, Download } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Link } from "wouter";
import { useRole } from "@/lib/role";
import { useAuth } from "@/lib/auth";
import { createInvoiceHtml } from "@/lib/invoice";
import { createHtmlPdf } from "@/lib/pdf";
import { revokeDriverInvoice, sendDriverInvoice, type DriverDocument } from "@/lib/workspace";

export default function Drivers() {
  const { state, dispatch } = useStore();
  const { members = [], invoices = [], addInvoice, removeInvoice, inviteCode, updateOwnerMemberStatus, deleteOwnerMember, sendOwnerFile } = useRole();
  const { session } = useAuth();
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [payDriverId, setPayDriverId] = useState<string | null>(null);
  const [historyDriverId, setHistoryDriverId] = useState<string | null>(null);
  const [detailDriverId, setDetailDriverId] = useState<string | null>(null);
  const [editingDriverId, setEditingDriverId] = useState<string | null>(null);
  const [payAmount, setPayAmount] = useState(0);
  const [activeType, setActiveType] = useState<Driver["type"]>("Regular");
  const [invoiceMemberId, setInvoiceMemberId] = useState("");
  const [invoiceTitle, setInvoiceTitle] = useState("FleetX Driver Receipt");
  const [invoiceBusy, setInvoiceBusy] = useState(false);
  const [memberBusy, setMemberBusy] = useState<string | null>(null);
  
  const [formData, setFormData] = useState<Partial<Driver>>({
    name: "", phone: "", type: "Regular", dailyRate: 0, vehicleId: "", startDate: new Date().toISOString().split("T")[0], endDate: ""
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingDriverId) {
      dispatch({ type: "UPDATE_DRIVER", payload: { ...formData, id: editingDriverId } });
    } else {
      dispatch({ type: 'ADD_DRIVER', payload: formData });
    }
    setIsAddOpen(false);
    setEditingDriverId(null);
    setFormData({ name: "", phone: "", type: "Regular", dailyRate: 0, vehicleId: "", startDate: new Date().toISOString().split("T")[0], endDate: "" });
  };

  const openEditDriver = (driver: Driver) => {
    setEditingDriverId(driver.id);
    setFormData({ ...driver });
    setIsAddOpen(true);
  };

  const deleteDriver = (driver: Driver) => {
    if (!window.confirm(`Delete ${driver.name}? Their work logs, fuel records, notes and payment history will also be deleted.`)) return;
    dispatch({ type: "DELETE_DRIVER", payload: driver.id });
    if (payDriverId === driver.id) setPayDriverId(null);
    if (historyDriverId === driver.id) setHistoryDriverId(null);
    if (detailDriverId === driver.id) setDetailDriverId(null);
  };

  const setMemberStatus = async (member: typeof members[number], status: "Active" | "Blocked" | "Removed") => {
    setMemberBusy(member.id);
    try {
      await updateOwnerMemberStatus(member.id, status);
      dispatch({ type: "UPDATE_DRIVER", payload: { id: member.id, status } });
    } finally {
      setMemberBusy(null);
    }
  };

  const removeMemberPermanently = async (member: typeof members[number]) => {
    if (!window.confirm(`Delete ${member.profile.name || "this driver"} permanently? This removes only this driver's FleetX records.`)) return;
    setMemberBusy(member.id);
    try {
      await deleteOwnerMember(member.id);
      dispatch({ type: "DELETE_DRIVER", payload: member.id });
    } finally {
      setMemberBusy(null);
    }
  };

  const sendFileToMember = (member: typeof members[number], event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const payload: DriverDocument = { id: `${Date.now()}`, name: file.name, type: file.type, dataUrl: String(reader.result), uploadedAt: new Date().toISOString().slice(0, 10) };
      void sendOwnerFile(member.id, payload);
    };
    reader.readAsDataURL(file);
    event.target.value = "";
  };
  const downloadDriverReport = async (driver: Driver) => {
    const logs = driverLogs(driver.id);
    const pays = state.driverPays.filter((pay) => pay.driverId === driver.id);
    const absentDates = state.logs.filter((log) => driver.vehicleId && log.vehicleId === driver.vehicleId && log.driverId !== driver.id).map((log) => log.date).filter((date, index, dates) => dates.indexOf(date) === index);
    const rows = logs.map((log) => `<tr><td>${log.date}</td><td>${state.vehicles.find((vehicle) => vehicle.id === log.vehicleId)?.name || "Vehicle"}</td><td>${log.description || "Work entry"}</td><td>₹${(driver.dailyRate || log.amount || 0).toLocaleString("en-IN")}</td></tr>`).join("");
    const html = `<!doctype html><html><head><meta charset="utf-8"><style>*{box-sizing:border-box}body{margin:0;background:#eef1f4;font:13px Arial;color:#18202b}.sheet{width:794px;min-height:1123px;background:#fff;padding:36px}.brand{border-bottom:4px solid #f5b91d;padding-bottom:18px}.brand h1{margin:0;font-size:28px}h2{font-size:17px;border-bottom:1px solid #d7dde5;padding-bottom:7px;margin-top:24px}.grid{display:grid;grid-template-columns:repeat(3,1fr);gap:10px}.card{border:1px solid #d7dde5;border-radius:10px;padding:12px}.card b{display:block;font-size:19px;margin-top:5px}table{width:100%;border-collapse:collapse}th,td{border:1px solid #d7dde5;padding:8px;text-align:left}th{background:#f4f6f8}td:last-child,th:last-child{text-align:right}</style></head><body><main class="sheet"><header class="brand"><h1>${state.settings.companyName || state.settings.businessName || "FleetX"} — Driver Report</h1><p>${driver.name} • ${driver.phone} • ${driver.type}</p></header><section class="grid"><div class="card">Working days<b>${new Set(logs.map((log) => log.date)).size}</b></div><div class="card">Paid<b>₹${pays.reduce((sum, pay) => sum + pay.amount, 0).toLocaleString("en-IN")}</b></div><div class="card">Daily rate<b>₹${driver.dailyRate.toLocaleString("en-IN")}</b></div></section><h2>Work Logs</h2><table><thead><tr><th>Date</th><th>Vehicle</th><th>Description</th><th>Amount</th></tr></thead><tbody>${rows || "<tr><td colspan='4'>No work logs</td></tr>"}</tbody></table><h2>Paid History</h2><p>${pays.map((pay) => `${pay.date} — ₹${pay.amount.toLocaleString("en-IN")} — ${pay.description || "Driver payment"}`).join("<br>") || "No paid history"}</p><h2>Absent Days</h2><p>${absentDates.join(", ") || "No absent days"}</p></main></body></html>`;
    const blob = await createHtmlPdf(html);
    const file = new File([blob], `${driver.name.replace(/\W+/g, "-").toLowerCase()}-report.pdf`, { type: "application/pdf" });
    const url = URL.createObjectURL(file);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = file.name;
    anchor.click();
    URL.revokeObjectURL(url);
  };

  const driverLogs = (driverId: string) => state.logs.filter((log) => log.driverId === driverId).sort((a, b) => b.date.localeCompare(a.date));
  const unpaidDriverLogs = (driverId: string) => driverLogs(driverId).filter((log) => !state.driverPays.some((pay) => pay.driverId === driverId && pay.logIds?.includes(log.id)));
  const driverEarned = (driverId: string) => unpaidDriverLogs(driverId).reduce((sum, log) => {
    const driver = state.drivers.find((item) => item.id === driverId);
    return sum + (driver?.dailyRate || 0);
  }, 0);
  const driverPaid = (driverId: string) => state.driverPays.filter((pay) => pay.driverId === driverId).reduce((sum, pay) => sum + pay.amount, 0);

  const copyInviteCode = async () => {
    if (!inviteCode) return;
    await navigator.clipboard?.writeText(inviteCode);
  };

  const sendInvoice = async (event: React.FormEvent) => {
    event.preventDefault();
    const target = members.find((member) => member.driverUserId === invoiceMemberId);
    if (!target || !session) return;
    setInvoiceBusy(true);
    try {
      const driverLogs = state.logs.filter((log) => log.driverId === target.id);
      const driver = state.drivers.find((item) => item.id === target.id);
      const total = driverLogs.reduce((sum, log) => sum + (driver?.dailyRate || log.amount || 0), 0);
      const today = new Date().toISOString().split("T")[0];
      const html = createInvoiceHtml({
        invoiceId: `DRV-${today}-${target.id.slice(-6)}`,
        issuedAt: today,
        issuedTime: new Date().toLocaleTimeString("en-IN"),
        businessName: state.settings.businessName,
        companyName: state.settings.companyName || state.settings.businessName,
        ownerName: state.settings.ownerName || "",
        phone: state.settings.phone || "",
        email: state.settings.email || "",
        address: state.settings.address || "",
        bankName: state.settings.bankName || "",
        gstNumber: state.settings.gstNumber || "",
        upiId: state.settings.upiId || "",
        logoUrl: state.settings.logoUrl,
        customerName: target.profile.name,
        customerPhone: target.profile.phone,
        customerCompany: "Driver payment",
        customerAddress: target.profile.address || "",
        workStart: driverLogs.at(-1)?.date || today,
        workEnd: driverLogs[0]?.date || today,
        serviceLocation: state.settings.companyName || state.settings.businessName,
        lines: driverLogs.map((log) => ({ date: log.date, description: log.description || "Work entry", amount: driver?.dailyRate || log.amount || 0 })),
        total,
        balanceDue: total,
        status: "PENDING",
      });
      const result = await sendDriverInvoice(session.access_token, target.driverUserId, invoiceTitle || "FleetX Driver Receipt", html);
      addInvoice(result.invoice);
      setInvoiceMemberId("");
    } finally {
      setInvoiceBusy(false);
    }
  };

  const revokeInvoice = async (invoiceId: string) => {
    if (!session) return;
    await revokeDriverInvoice(session.access_token, invoiceId);
    removeInvoice(invoiceId);
  };

  return (
    <Layout>
      <div className="fm-page-header">
        <div className="flex items-center gap-2">
          <Link href="/" className="text-muted-foreground"><ArrowLeft size={22} /></Link>
          <div><h1>Drivers</h1></div>
        </div>
        <div>
          <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
            <DialogTrigger asChild>
              <button onClick={() => setFormData({ ...formData, type: activeType })} className="fm-icon-button fm-primary-icon">
                <Plus size={24} strokeWidth={3} />
              </button>
            </DialogTrigger>
            <DialogContent className="w-[90vw] max-w-md rounded-2xl">
              <DialogHeader>
                <DialogTitle className="text-xl font-bold">{editingDriverId ? "Edit Driver" : "Add Driver"}</DialogTitle>
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
                <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Owner vehicle assignment (temporary override)<select value={formData.vehicleId || ""} onChange={e => setFormData({ ...formData, vehicleId: e.target.value || undefined })} className="mt-1 w-full bg-muted border-none rounded-xl p-4 font-semibold outline-none"><option value="">No temporary assignment</option>{state.vehicles.map((vehicle) => <option key={vehicle.id} value={vehicle.id}>{vehicle.name} ({vehicle.regNumber})</option>)}</select></label>
                <button type="submit" className="w-full bg-foreground text-background font-bold p-4 rounded-xl mt-4 active:scale-95 transition-transform">
                  {editingDriverId ? "Save Changes" : "Save Driver"}
                </button>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>
      <section className="mx-5 mt-4 space-y-4 rounded-2xl border border-primary/30 bg-primary/5 p-4">
        <div className="flex items-center justify-between gap-3">
          <div><h2 className="font-black">Driver Workspace Access</h2><p className="text-xs text-muted-foreground">Share this code with a driver. They choose their own permitted vehicles.</p></div>
          <button type="button" onClick={() => void copyInviteCode()} className="rounded-xl bg-primary px-4 py-3 text-lg font-black tracking-[0.18em] text-primary-foreground">{inviteCode || "—"}</button>
        </div>
        {members.length > 0 ? <div className="space-y-3">
          {members.map((member) => <div key={member.id} className="rounded-xl border border-border bg-card p-3">
            <div className="flex items-start justify-between gap-3"><div><strong>{member.profile.name || "Driver"}</strong><p className="text-xs text-muted-foreground">{member.profile.phone} • {member.profile.vehicleIds.length} permanent vehicle(s)</p></div><span className={`text-xs font-bold ${member.profile.status === "Blocked" ? "text-amber-300" : member.profile.status === "Removed" ? "text-rose-300" : "text-emerald-400"}`}>{member.profile.status || "Active"}</span></div>
            <div className="mt-3 flex flex-wrap gap-2">
              <a href={`tel:${member.profile.phone}`} className="rounded-lg bg-emerald-500/15 px-3 py-2 text-xs font-bold text-emerald-300"><Phone size={13} className="mr-1 inline" />Call</a>
              <label className="cursor-pointer rounded-lg bg-primary/15 px-3 py-2 text-xs font-bold text-primary"><FileUp size={13} className="mr-1 inline" />Send file<input type="file" accept="image/*,.pdf,.doc,.docx" className="sr-only" onChange={(event) => sendFileToMember(member, event)} /></label>
              {member.profile.status === "Blocked" ? <button type="button" disabled={memberBusy === member.id} onClick={() => void setMemberStatus(member, "Active")} className="rounded-lg bg-emerald-500/15 px-3 py-2 text-xs font-bold text-emerald-300"><RotateCcw size={13} className="mr-1 inline" />Unblock</button> : <button type="button" disabled={memberBusy === member.id} onClick={() => void setMemberStatus(member, "Blocked")} className="rounded-lg bg-amber-500/15 px-3 py-2 text-xs font-bold text-amber-300"><Ban size={13} className="mr-1 inline" />Block</button>}
              {member.profile.status !== "Removed" && <button type="button" disabled={memberBusy === member.id} onClick={() => void setMemberStatus(member, "Removed")} className="rounded-lg bg-rose-500/15 px-3 py-2 text-xs font-bold text-rose-300"><UserMinus size={13} className="mr-1 inline" />Remove</button>}
              <button type="button" disabled={memberBusy === member.id} onClick={() => void removeMemberPermanently(member)} className="rounded-lg border border-rose-400/30 px-3 py-2 text-xs font-bold text-rose-300"><Trash2 size={13} className="mr-1 inline" />Delete data</button>
            </div>
            {member.profile.documents.length > 0 && <div className="mt-2 flex flex-wrap gap-2">{member.profile.documents.map((document) => <a key={document.id} href={document.dataUrl} target="_blank" rel="noreferrer" className="rounded-lg bg-muted px-2 py-1 text-xs font-bold text-primary">{document.name}</a>)}</div>}
            {(member.profile.sharedFiles || []).length > 0 && <div className="mt-2 text-xs text-muted-foreground">Sent: {(member.profile.sharedFiles || []).map((file) => file.name).join(", ")}</div>}
          </div>)}
          <form onSubmit={sendInvoice} className="space-y-2 border-t border-border pt-3">
            <div className="text-xs font-black uppercase tracking-wider text-muted-foreground">Send receipt / invoice</div>
            <select required value={invoiceMemberId} onChange={(event) => setInvoiceMemberId(event.target.value)} className="w-full rounded-xl bg-muted p-3 font-semibold"><option value="">Select joined driver</option>{members.map((member) => <option key={member.driverUserId} value={member.driverUserId}>{member.profile.name || member.driverUserId}</option>)}</select>
            <input value={invoiceTitle} onChange={(event) => setInvoiceTitle(event.target.value)} className="w-full rounded-xl bg-muted p-3 font-semibold" placeholder="Invoice title" />
            <button disabled={invoiceBusy} type="submit" className="w-full rounded-xl bg-primary p-3 font-black text-primary-foreground">{invoiceBusy ? "Sending..." : "Send PDF Receipt"}</button>
          </form>
          {invoices.length > 0 && <div className="space-y-2 border-t border-border pt-3"><div className="text-xs font-black uppercase tracking-wider text-muted-foreground">Sent invoices</div>{invoices.map((invoice) => <div key={invoice.id} className="flex items-center justify-between gap-2 rounded-xl bg-muted p-3 text-sm"><span className="truncate">{invoice.title}</span>{invoice.revokedAt ? <span className="text-xs text-muted-foreground">Revoked</span> : <button type="button" onClick={() => void revokeInvoice(invoice.id)} className="shrink-0 text-xs font-bold text-rose-300">Revoke</button>}</div>)}</div>}
        </div> : <p className="text-sm text-muted-foreground">No joined drivers yet.</p>}
      </section>
      <div className="fm-tab-row">
        <button className={`fm-tab ${activeType === "Regular" ? "is-active" : ""}`} onClick={() => setActiveType("Regular")}>Regular ({state.drivers.filter((driver) => driver.type === "Regular").length})</button>
        <button className={`fm-tab ${activeType === "Temporary" ? "is-active" : ""}`} onClick={() => setActiveType("Temporary")}>Temporary ({state.drivers.filter((driver) => driver.type === "Temporary").length})</button>
      </div>

      <div className="px-5 py-6 space-y-4">
        {state.drivers.filter((driver) => driver.type === activeType).length === 0 ? (
          <div className="fm-driver-empty">
            <UserRoundPlus size={52} />
            <h3>No {activeType} Drivers</h3>
            <p>Add drivers to track daily work and payment history</p>
            <button type="button" onClick={() => { setFormData({ ...formData, type: activeType }); setIsAddOpen(true); }} className="fm-primary-button"><UserRoundPlus size={18} /> Add {activeType} Driver</button>
          </div>
        ) : (
          state.drivers.filter((driver) => driver.type === activeType).map(driver => (
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
                <div className="flex gap-2">
                  <button type="button" onClick={() => openEditDriver(driver)} className="rounded-xl border border-border p-2 text-primary" aria-label={`Edit ${driver.name}`}>
                    <Pencil size={17} />
                  </button>
                  <button type="button" onClick={() => deleteDriver(driver)} className="rounded-xl border border-rose-400/40 p-2 text-rose-300" aria-label={`Delete ${driver.name}`}>
                    <Trash2 size={17} />
                  </button>
                </div>
              </div>
               <div className="flex gap-2 pt-4 border-t border-border/50">
                 <button onClick={() => setDetailDriverId(driver.id)} className="flex-1 bg-primary/10 text-primary py-2.5 rounded-xl text-sm font-bold flex items-center justify-center gap-2 active:bg-primary/20">
                   <CalendarDays size={16} /> Work days
                 </button>
                  <button onClick={() => void downloadDriverReport(driver)} className="rounded-xl border border-border px-3 py-2.5 text-primary" aria-label={`Download report for ${driver.name}`}>
                    <Download size={16} />
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

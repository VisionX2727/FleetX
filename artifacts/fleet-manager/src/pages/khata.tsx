import { Layout } from "@/components/layout";
import { useStore, Customer, LedgerEntry } from "@/lib/store";
import { useState } from "react";
import { Plus, Users, ArrowUpRight, ArrowDownRight, Phone } from "lucide-react";
import QRCode from "qrcode";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { createInvoiceHtml, InvoiceData } from "@/lib/invoice";

export default function Khata() {
  const { state, dispatch } = useStore();
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isLedgerOpen, setIsLedgerOpen] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<string | null>(null);
  const [receiptCustomerId, setReceiptCustomerId] = useState<string | null>(null);
  const [qrDataUrl, setQrDataUrl] = useState("");
  const [invoicePreview, setInvoicePreview] = useState("");

  const [customerData, setCustomerData] = useState<Partial<Customer>>({ name: "", phone: "", company: "" });
  const [ledgerData, setLedgerData] = useState<Partial<LedgerEntry>>({ date: new Date().toISOString().split('T')[0], type: "Payment", amount: 0, description: "" });

  const handleCustomerSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    dispatch({ type: 'ADD_CUSTOMER', payload: customerData });
    setIsAddOpen(false);
    setCustomerData({ name: "", phone: "", company: "" });
  };

  const handleLedgerSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCustomer) return;
    dispatch({ type: 'ADD_LEDGER', payload: { ...ledgerData, customerId: selectedCustomer } });
    setIsLedgerOpen(false);
    setLedgerData({ date: new Date().toISOString().split('T')[0], type: "Payment", amount: 0, description: "" });
  };

  const getCustomerBalance = (customerId: string) => {
    const entries = state.ledgers.filter(l => l.customerId === customerId);
    return entries.reduce((acc, curr) => curr.type === 'Charge' ? acc + curr.amount : acc - curr.amount, 0);
  };

  const getCustomerCharges = (customerId: string) =>
    state.ledgers
      .filter((entry) => entry.customerId === customerId && entry.type === "Charge")
      .sort((a, b) => b.date.localeCompare(a.date));

  const generatePaymentQr = async (customer: Customer) => {
    const amount = getCustomerBalance(customer.id);
    if (amount <= 0) return;
    const upi = state.settings.upiId || "fleet-owner@upi";
    const payload = `upi://pay?pa=${encodeURIComponent(upi)}&pn=${encodeURIComponent(state.settings.businessName)}&am=${amount}&cu=INR`;
    setQrDataUrl(await QRCode.toDataURL(payload, { width: 260, margin: 2 }));
    setReceiptCustomerId(customer.id);
  };

  const getInvoiceData = (customer: Customer): InvoiceData => {
    const charges = getCustomerCharges(customer.id);
    const payments = state.ledgers.filter((entry) => entry.customerId === customer.id && entry.type === "Payment").sort((a, b) => b.date.localeCompare(a.date));
    const relatedLogs = charges.map((entry) => state.logs.find((log) => log.id === entry.logId)).filter(Boolean);
    const dates = charges.map((entry) => entry.date).sort();
    const total = charges.reduce((sum, entry) => sum + entry.amount, 0);
    const balanceDue = getCustomerBalance(customer.id);
    return {
      invoiceId: `FM-${new Date().getFullYear()}-${customer.id.slice(-6).toUpperCase()}`,
      issuedAt: new Date().toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }),
      businessName: state.settings.businessName || "Fleet Manager",
      ownerName: state.settings.ownerName || "",
      phone: state.settings.phone || "",
      email: state.settings.email || "",
      address: state.settings.address || "",
      bankName: state.settings.bankName || "",
      gstNumber: state.settings.gstNumber || "",
      upiId: state.settings.upiId || "",
      logoUrl: state.settings.logoUrl,
      customerName: customer.name,
      customerPhone: customer.phone,
      customerCompany: customer.company || "",
      customerAddress: customer.address || "",
      workStart: dates[0] || new Date().toISOString().split("T")[0],
      workEnd: dates[dates.length - 1] || new Date().toISOString().split("T")[0],
      serviceLocation: customer.address || "",
      lines: charges.map((entry, index) => ({
        date: entry.date,
        description: entry.description,
        amount: entry.amount,
        duration: relatedLogs[index]?.hours ? `Work Duration: ${relatedLogs[index]?.hours} hours` : undefined,
      })),
      total,
      balanceDue,
      status: balanceDue <= 0 ? "PAID" : "DUE",
      paymentDate: payments[0]?.date,
      paymentReference: payments[0]?.description,
    };
  };

  const downloadReceipt = (customer: Customer) => {
    const html = createInvoiceHtml(getInvoiceData(customer));
    const anchor = document.createElement("a");
    const blob = new Blob([html], { type: "text/html;charset=utf-8" });
    const invoiceName = `${customer.name.replace(/[^a-z0-9]+/gi, "-").replace(/^-|-$/g, "").toLowerCase() || "customer"}-invoice.html`;
    const url = URL.createObjectURL(blob);
    anchor.href = url;
    anchor.download = invoiceName;
    anchor.rel = "noopener";
    anchor.style.display = "none";
    document.body.appendChild(anchor);
    anchor.click();
    window.setTimeout(() => {
      document.body.removeChild(anchor);
      URL.revokeObjectURL(url);
    }, 1000);
  };

  const printReceipt = (customer: Customer) => {
    const html = createInvoiceHtml(getInvoiceData(customer));
    setInvoicePreview(html);
  };

  const openPrintWindow = () => {
    if (!invoicePreview) return;
    const printWindow = window.open("", "_blank");
    if (!printWindow) {
      return;
    }
    printWindow.document.open();
    printWindow.document.write(invoicePreview.replace("</body>", `<script>window.addEventListener('load',function(){setTimeout(function(){window.print()},250)})</script></body>`));
    printWindow.document.close();
  };

  const shareReceipt = async (customer: Customer) => {
    const html = createInvoiceHtml(getInvoiceData(customer));
    const fileName = `${customer.name.replace(/[^a-z0-9]+/gi, "-").toLowerCase() || "customer"}-invoice.html`;
    const file = new File([html], fileName, { type: "text/html" });
    if (navigator.share && (!navigator.canShare || navigator.canShare({ files: [file] }))) {
      try {
        await navigator.share({ title: `${state.settings.businessName} invoice`, text: `Invoice for ${customer.name}`, files: [file] });
        return;
      } catch (error) {
        if ((error as DOMException)?.name === "AbortError") return;
      }
    }
    downloadReceipt(customer);
  };

  return (
    <Layout>
      <div className="pt-12 px-6 pb-6 bg-card border-b border-border sticky top-0 z-10 shadow-sm">
        <div className="flex justify-between items-end">
          <div>
            <h1 className="text-3xl font-black tracking-tight">Khata</h1>
            <p className="text-sm text-muted-foreground font-medium mt-1">Customer Accounts</p>
          </div>
          <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
            <DialogTrigger asChild>
              <button className="bg-primary text-primary-foreground w-12 h-12 rounded-full flex items-center justify-center shadow-lg active:scale-95 transition-transform">
                <Plus size={24} strokeWidth={3} />
              </button>
            </DialogTrigger>
            <DialogContent className="w-[90vw] max-w-md rounded-2xl">
              <DialogHeader>
                <DialogTitle className="text-xl font-bold">Add Customer</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleCustomerSubmit} className="space-y-4 mt-4">
                <div>
                  <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1 block">Name</label>
                  <input required value={customerData.name} onChange={e => setCustomerData({...customerData, name: e.target.value})} className="w-full bg-muted border-none rounded-xl p-4 font-semibold outline-none focus:ring-2 focus:ring-primary" placeholder="e.g. Ramesh Kumar" />
                </div>
                <div>
                  <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1 block">Company (Optional)</label>
                  <input value={customerData.company} onChange={e => setCustomerData({...customerData, company: e.target.value})} className="w-full bg-muted border-none rounded-xl p-4 font-semibold outline-none focus:ring-2 focus:ring-primary" placeholder="e.g. Ramesh Builders" />
                </div>
                <div>
                  <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1 block">Phone</label>
                  <input required type="tel" value={customerData.phone} onChange={e => setCustomerData({...customerData, phone: e.target.value})} className="w-full bg-muted border-none rounded-xl p-4 font-semibold outline-none focus:ring-2 focus:ring-primary" placeholder="10 digit number" />
                </div>
                <div>
                  <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1 block">Billing Address / Site Location</label>
                  <textarea value={customerData.address || ""} onChange={e => setCustomerData({...customerData, address: e.target.value})} className="w-full bg-muted border-none rounded-xl p-4 font-semibold outline-none focus:ring-2 focus:ring-primary min-h-20" placeholder="Address or work site location" />
                </div>
                <button type="submit" className="w-full bg-foreground text-background font-bold p-4 rounded-xl mt-4 active:scale-95 transition-transform">
                  Save Customer
                </button>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="px-6 py-6 space-y-4">
        {state.customers.length === 0 ? (
          <div className="text-center py-12 bg-card rounded-2xl border border-border border-dashed">
            <Users size={48} className="mx-auto text-muted-foreground opacity-30 mb-4" />
            <h3 className="text-lg font-bold">No customers yet</h3>
            <p className="text-sm text-muted-foreground mt-1">Add your clients to manage their ledgers.</p>
          </div>
        ) : (
           [...state.customers].sort((a, b) => Number(Boolean(a.completed)) - Number(Boolean(b.completed))).map(customer => {
            const bal = getCustomerBalance(customer.id);
            const isDue = bal > 0;
            return (
              <div key={customer.id} className="bg-card rounded-2xl border border-border p-5 shadow-sm">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="text-xl font-bold">{customer.name}</h3>
                    {customer.company && <div className="text-sm font-semibold text-muted-foreground">{customer.company}</div>}
                    <div className="text-xs font-medium text-muted-foreground flex items-center gap-1 mt-1">
                      <Phone size={12} /> {customer.phone}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-0.5">Balance</div>
                    <div className={`text-xl font-black ${isDue ? 'text-destructive' : bal < 0 ? 'text-green-600' : 'text-foreground'}`}>
                      {isDue ? `₹${bal.toLocaleString()}` : bal < 0 ? `+₹${Math.abs(bal).toLocaleString()}` : '₹0'}
                    </div>
                    {isDue && <div className="text-[10px] font-bold text-destructive uppercase">Due</div>}
                  </div>
                </div>
                 <div className="flex gap-2 pt-4 border-t border-border/50">
                  <Dialog open={isLedgerOpen && selectedCustomer === customer.id} onOpenChange={(open) => {
                    setIsLedgerOpen(open);
                    if(open) setSelectedCustomer(customer.id);
                  }}>
                    <DialogTrigger asChild>
                      <button className="flex-1 bg-green-100 text-green-700 py-2.5 rounded-xl text-sm font-bold flex items-center justify-center gap-2 active:bg-green-200">
                        <ArrowDownRight size={16} /> Payment In
                      </button>
                    </DialogTrigger>
                    <DialogContent className="w-[90vw] max-w-md rounded-2xl">
                      <DialogHeader>
                        <DialogTitle className="text-xl font-bold">Add Payment for {customer.name}</DialogTitle>
                      </DialogHeader>
                      <form onSubmit={handleLedgerSubmit} className="space-y-4 mt-4">
                         <div>
                          <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1 block">Date</label>
                          <input type="date" required value={ledgerData.date} onChange={e => setLedgerData({...ledgerData, date: e.target.value})} className="w-full bg-muted border-none rounded-xl p-4 font-semibold outline-none focus:ring-2 focus:ring-primary" />
                        </div>
                        <div>
                          <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1 block">Amount (₹)</label>
                          <input type="number" required value={ledgerData.amount || ''} onChange={e => setLedgerData({...ledgerData, amount: Number(e.target.value)})} className="w-full bg-muted border-none rounded-xl p-4 font-semibold outline-none focus:ring-2 focus:ring-primary" placeholder="5000" />
                        </div>
                        <div>
                          <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1 block">Type</label>
                          <select required value={ledgerData.type} onChange={e => setLedgerData({...ledgerData, type: e.target.value as any})} className="w-full bg-muted border-none rounded-xl p-4 font-semibold outline-none focus:ring-2 focus:ring-primary">
                            <option value="Payment">Payment Received</option>
                            <option value="Charge">Bill/Charge Added</option>
                          </select>
                        </div>
                        <div>
                          <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1 block">Notes / Reference</label>
                          <input value={ledgerData.description} onChange={e => setLedgerData({...ledgerData, description: e.target.value})} className="w-full bg-muted border-none rounded-xl p-4 font-semibold outline-none focus:ring-2 focus:ring-primary" placeholder="UPI txn id or cash" />
                        </div>
                        <button type="submit" className="w-full bg-foreground text-background font-bold p-4 rounded-xl mt-4 active:scale-95 transition-transform">
                          Save Entry
                        </button>
                      </form>
                    </DialogContent>
                  </Dialog>
                  
                   <button onClick={() => setReceiptCustomerId(customer.id)} className="flex-1 bg-muted text-foreground py-2.5 rounded-xl text-sm font-bold flex items-center justify-center gap-2 active:bg-muted/80">
                     View Ledger
                  </button>
                </div>
                 <div className="flex items-center justify-between mt-3">
                   <span className={`text-xs font-bold uppercase ${customer.completed ? "text-green-600" : "text-muted-foreground"}`}>
                     {customer.completed ? "Work complete" : `${getCustomerCharges(customer.id).length} work entries`}
                   </span>
                   <button onClick={() => dispatch({ type: "TOGGLE_CUSTOMER_COMPLETE", payload: customer.id })} className="text-xs font-bold text-primary">
                     {customer.completed ? "Reopen customer" : "Mark work complete"}
                   </button>
                 </div>
              </div>
            )
          })
        )}
      </div>
      <Dialog open={Boolean(receiptCustomerId)} onOpenChange={(open) => { if (!open) { setReceiptCustomerId(null); setQrDataUrl(""); setInvoicePreview(""); } }}>
        <DialogContent className="w-[90vw] max-w-md rounded-2xl max-h-[90vh] overflow-y-auto">
          {receiptCustomerId && (() => {
            const customer = state.customers.find((item) => item.id === receiptCustomerId);
            if (!customer) return null;
            const charges = getCustomerCharges(customer.id);
            const total = getCustomerBalance(customer.id);
            return (
              <>
                <DialogHeader><DialogTitle className="text-xl font-bold">{customer.name} ledger</DialogTitle></DialogHeader>
                <div className="rounded-2xl bg-primary/10 p-5 text-center my-3">
                  <div className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Outstanding total</div>
                  <div className="text-3xl font-black mt-1">₹{total.toLocaleString()}</div>
                </div>
                <div className="space-y-2">
                  {charges.length === 0 ? <p className="text-sm text-muted-foreground">No work entries yet.</p> : charges.map((entry) => {
                    const vehicle = state.vehicles.find((item) => item.id === entry.vehicleId);
                    return <div key={entry.id} className="flex items-center justify-between rounded-xl bg-muted p-3"><div><div className="font-bold text-sm">{entry.description}</div><div className="text-xs text-muted-foreground">{entry.date} • {vehicle?.name || "Vehicle"}</div></div><div className="font-black">₹{entry.amount.toLocaleString()}</div></div>;
                  })}
                </div>
                <div className="grid grid-cols-2 gap-2 mt-4">
                  <button onClick={() => generatePaymentQr(customer)} className="bg-primary text-primary-foreground p-3 rounded-xl font-bold">Generate QR</button>
                   <button onClick={() => printReceipt(customer)} className="bg-foreground text-background p-3 rounded-xl font-bold">Print / Save PDF</button>
                </div>
                 <button onClick={() => downloadReceipt(customer)} className="w-full mt-2 border border-border text-foreground p-3 rounded-xl font-bold">Download invoice file</button>
                 {invoicePreview && <div className="mt-4 rounded-xl border border-border overflow-hidden bg-white"><iframe title="Invoice preview" srcDoc={invoicePreview} className="w-full h-[520px] border-0" /><button onClick={openPrintWindow} className="w-full bg-primary text-primary-foreground p-3 font-bold">Open preview &amp; print</button></div>}
                {qrDataUrl && <div className="mt-5 text-center"><img src={qrDataUrl} alt="Payment QR" className="w-56 h-56 mx-auto rounded-xl" /><p className="text-xs text-muted-foreground mt-2">Scan to pay ₹{total.toLocaleString("en-IN")}</p><button onClick={() => navigator.share?.({ title: `${state.settings.businessName} payment`, text: `Payment for ${customer.name}: ₹${total.toLocaleString("en-IN")}` })} className="mt-3 text-sm font-bold text-primary">Share payment request</button></div>}
                <button onClick={() => shareReceipt(customer)} className="w-full mt-2 border border-border text-foreground p-3 rounded-xl font-bold">Share receipt</button>
              </>
            );
          })()}
        </DialogContent>
      </Dialog>
    </Layout>
  );
}

import { Layout } from "@/components/layout";
import { useStore, Customer, LedgerEntry } from "@/lib/store";
import { useRef, useState } from "react";
import {
  Plus, Users, Phone, Download, Share2, ReceiptText, Search, Trash2,
  ArrowLeft, QrCode, CirclePlus, CheckCircle2, Clock3,
} from "lucide-react";
import QRCode from "qrcode";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { createInvoiceHtml, InvoiceData } from "@/lib/invoice";
import { createInvoicePdf } from "@/lib/pdf";

const today = () => new Date().toISOString().split("T")[0];

export default function Khata() {
  const { state, dispatch } = useStore();
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isPaymentOpen, setIsPaymentOpen] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<string | null>(null);
  const [qrDataUrl, setQrDataUrl] = useState("");
  const [qrOpen, setQrOpen] = useState(false);
  const [invoicePreview, setInvoicePreview] = useState("");
  const [receiptActionsOpen, setReceiptActionsOpen] = useState(false);
  const [completeCustomerId, setCompleteCustomerId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [khataTab, setKhataTab] = useState<"work" | "payments">("work");
  const [customerSection, setCustomerSection] = useState<"active" | "completed">("active");
  const customerPressTimer = useRef<number | null>(null);
  const customerLongPressed = useRef(false);
  const [customerData, setCustomerData] = useState<Partial<Customer>>({ name: "", phone: "", company: "" });
  const [ledgerData, setLedgerData] = useState<Partial<LedgerEntry>>({
    date: today(), type: "Payment", amount: 0, description: "", paymentMode: "Cash",
  });

  const selected = state.customers.find((customer) => customer.id === selectedCustomer) || null;

  const getCustomerCharges = (customerId: string) =>
    state.ledgers
      .filter((entry) => entry.customerId === customerId && entry.type === "Charge")
      .sort((a, b) => b.date.localeCompare(a.date));

  const getCustomerPayments = (customerId: string) =>
    state.ledgers
      .filter((entry) => entry.customerId === customerId && entry.type === "Payment")
      .sort((a, b) => b.date.localeCompare(a.date));

  const getCustomerSubtotal = (customerId: string) =>
    getCustomerCharges(customerId).reduce((sum, entry) => sum + entry.amount, 0);

  const getCustomerGst = (customer: Customer) =>
    customer.addGst && state.settings.gstPercentage
      ? Math.round(getCustomerSubtotal(customer.id) * (state.settings.gstPercentage / 100) * 100) / 100
      : 0;

  const getChargeAmount = (entry: LedgerEntry, customer: Customer) =>
    Math.round(entry.amount * (customer.addGst && state.settings.gstPercentage ? 1 + state.settings.gstPercentage / 100 : 1) * 100) / 100;

  const getCustomerBalance = (customer: Customer) =>
    state.ledgers
      .filter((entry) => entry.customerId === customer.id)
      .reduce((balance, entry) => entry.type === "Charge" ? balance + getChargeAmount(entry, customer) : balance - entry.amount, 0);

  const getReceived = (customerId: string) =>
    getCustomerPayments(customerId).reduce((sum, entry) => sum + entry.amount, 0);

  const handleCustomerSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    dispatch({ type: "ADD_CUSTOMER", payload: customerData });
    setIsAddOpen(false);
    setCustomerData({ name: "", phone: "", company: "" });
  };

  const openPayment = () => {
    if (!selected) return;
    setLedgerData({ date: today(), type: "Payment", amount: 0, description: "", paymentMode: "Cash" });
    setIsPaymentOpen(true);
  };

  const handleLedgerSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    if (!selected || !ledgerData.amount || ledgerData.amount <= 0) return;
    dispatch({
      type: "ADD_LEDGER",
      payload: { ...ledgerData, type: "Payment", customerId: selected.id, amount: Number(ledgerData.amount) },
    });
    setIsPaymentOpen(false);
    setLedgerData({ date: today(), type: "Payment", amount: 0, description: "", paymentMode: "Cash" });
  };

  const setPaymentMode = (paymentMode: string) => setLedgerData((current) => ({ ...current, paymentMode }));

  const generatePaymentQr = async (customer: Customer) => {
    const amount = Math.max(0, getCustomerBalance(customer));
    const upi = state.settings.upiId || "fleet-owner@upi";
    const amountPart = amount > 0 ? `&am=${amount}` : "";
    const companyName = state.settings.companyName || state.settings.businessName || "Fleet Manager";
    const payload = `upi://pay?pa=${encodeURIComponent(upi)}&pn=${encodeURIComponent(companyName)}${amountPart}&cu=INR`;
    try {
      const dataUrl = await QRCode.toDataURL(payload, { width: 280, margin: 2, errorCorrectionLevel: "M" });
      setQrDataUrl(dataUrl);
      setQrOpen(true);
    } catch (error) {
      console.error("Could not generate payment QR", error);
    }
  };

  const getInvoiceData = (customer: Customer): InvoiceData => {
    const charges = getCustomerCharges(customer.id);
    const payments = getCustomerPayments(customer.id);
    const dates = charges.map((entry) => entry.date).sort();
    const subtotal = getCustomerSubtotal(customer.id);
    const gstAmount = getCustomerGst(customer);
    const total = subtotal + gstAmount;
    return {
      invoiceId: `RC-${today()}-${customer.phone.replace(/\D/g, "").slice(-4) || customer.id.slice(-4).toUpperCase()}`,
      issuedAt: new Date().toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }),
      issuedTime: new Date().toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" }),
      businessName: state.settings.businessName || "Fleet Manager",
      companyName: state.settings.companyName || state.settings.businessName || "Fleet Manager",
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
      workStart: dates[0] || today(),
      workEnd: dates[dates.length - 1] || today(),
      serviceLocation: customer.address || "",
      lines: charges.map((entry) => {
        const relatedLog = state.logs.find((log) => log.id === entry.logId);
        const vehicle = relatedLog ? state.vehicles.find((item) => item.id === relatedLog.vehicleId) : undefined;
        const duration = relatedLog
          ? vehicle?.type === "Hywa" || vehicle?.type === "Tipper"
            ? `Trips: ${relatedLog.trips || 0} • Diesel: ${relatedLog.diesel || 0} L`
            : relatedLog.hours ? `Work Duration: ${relatedLog.hours} hours` : undefined
          : undefined;
        return {
          date: entry.date,
          description: `${vehicle?.name ? `${vehicle.name} - ` : ""}${entry.description || customer.address || customer.company || "Work entry"}`,
          amount: entry.amount,
          duration,
        };
      }),
      payments: payments.map((payment) => ({
        date: payment.date,
        amount: payment.amount,
        paymentMode: payment.paymentMode,
        description: payment.description,
      })),
      total,
      subtotal,
      gstPercentage: state.settings.gstPercentage || 0,
      gstAmount,
      addGst: Boolean(customer.addGst && state.settings.gstPercentage),
      balanceDue: getCustomerBalance(customer),
      status: customer.paymentStatus === "Paid" ? "PAID" : customer.paymentStatus === "Delay" ? "DELAY" : "PENDING",
      paymentDate: payments[0]?.date,
      paymentReference: payments[0]?.description,
      paymentMode: payments[0]?.paymentMode || "—",
      delayStartDate: customer.delayStartDate,
      delayEndDate: customer.delayEndDate,
    };
  };

  const downloadBlob = (blob: Blob, name: string) => {
    const anchor = document.createElement("a");
    const url = URL.createObjectURL(blob);
    anchor.href = url;
    anchor.download = name;
    anchor.rel = "noopener";
    anchor.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  const downloadReceipt = async (customer: Customer) => {
    const name = `${customer.name.replace(/[^a-z0-9]+/gi, "-").toLowerCase() || "customer"}-receipt.pdf`;
    downloadBlob(await createInvoicePdf(getInvoiceData(customer)), name);
  };

  const shareReceipt = async (customer: Customer) => {
    const fileName = `${customer.name.replace(/[^a-z0-9]+/gi, "-").toLowerCase() || "customer"}-receipt.pdf`;
    const file = new File([await createInvoicePdf(getInvoiceData(customer))], fileName, { type: "application/pdf" });
    if (navigator.share && (!navigator.canShare || navigator.canShare({ files: [file] }))) {
      try {
        await navigator.share({ title: `${state.settings.businessName} receipt`, text: `Receipt for ${customer.name}`, files: [file] });
        return;
      } catch (error) {
        if ((error as DOMException)?.name === "AbortError") return;
      }
    }
    await downloadReceipt(customer);
  };

  const printReceipt = (customer: Customer) => setInvoicePreview(createInvoiceHtml(getInvoiceData(customer)));

  const openPrintWindow = () => {
    if (!invoicePreview) return;
    const printWindow = window.open("", "_blank");
    if (!printWindow) return;
    printWindow.document.open();
    printWindow.document.write(invoicePreview.replace("</body>", `<script>window.addEventListener('load',function(){setTimeout(function(){window.print()},250)})</script></body>`));
    printWindow.document.close();
  };

  const startCustomerPress = (customerId: string) => {
    customerLongPressed.current = false;
    if (customerPressTimer.current) window.clearTimeout(customerPressTimer.current);
    customerPressTimer.current = window.setTimeout(() => {
      customerLongPressed.current = true;
      setCompleteCustomerId(customerId);
      customerPressTimer.current = null;
    }, 550);
  };

  const endCustomerPress = () => {
    if (customerPressTimer.current) window.clearTimeout(customerPressTimer.current);
    customerPressTimer.current = null;
  };

  const downloadQr = async (customer: Customer) => {
    if (!qrDataUrl) return;
    const response = await fetch(qrDataUrl);
    downloadBlob(await response.blob(), `${customer.name}-payment-qr.png`);
  };

  const shareQr = async (customer: Customer) => {
    if (!qrDataUrl) return;
    const response = await fetch(qrDataUrl);
    const file = new File([await response.blob()], `${customer.name}-payment-qr.png`, { type: "image/png" });
    if (navigator.share && (!navigator.canShare || navigator.canShare({ files: [file] }))) {
      await navigator.share({ title: `${state.settings.businessName} payment QR`, text: `Payment request for ${customer.name}`, files: [file] });
    } else {
      await downloadQr(customer);
    }
  };

  const closeDetail = () => {
    setSelectedCustomer(null);
    setQrDataUrl("");
    setInvoicePreview("");
    setQrOpen(false);
    setReceiptActionsOpen(false);
  };

  if (selected) {
    const charges = getCustomerCharges(selected.id);
    const payments = getCustomerPayments(selected.id);
    const subtotal = getCustomerSubtotal(selected.id);
    const balance = getCustomerBalance(selected);
    const paid = selected.paymentStatus === "Paid";
    return (
      <Layout>
        <div className="fm-page-header">
          <button type="button" onClick={closeDetail} className="flex items-center gap-3 text-left">
            <ArrowLeft size={24} />
            <span><h1 className="!text-2xl">{selected.name}</h1><p>{selected.phone}</p></span>
          </button>
          <button type="button" className="fm-icon-button bg-[#183660] text-white" onClick={() => void shareReceipt(selected)} aria-label="Share receipt"><Share2 size={20} /></button>
        </div>
        <div className="px-5 py-5 pb-24 space-y-4">
          <section className="fm-card p-4">
            <div className="grid grid-cols-3 gap-2 text-center">
              <div><div className="text-xl font-black text-primary">₹{(subtotal + getCustomerGst(selected)).toLocaleString("en-IN")}</div><div className="text-xs text-muted-foreground">Total Work</div></div>
              <div><div className="text-xl font-black text-emerald-400">₹{getReceived(selected.id).toLocaleString("en-IN")}</div><div className="text-xs text-muted-foreground">Received</div></div>
              <div><div className="text-xl font-black text-rose-400">₹{balance.toLocaleString("en-IN")}</div><div className="text-xs text-muted-foreground">Outstanding</div></div>
            </div>
            <div className="mt-4 grid grid-cols-2 gap-3">
              <button type="button" onClick={() => dispatch({ type: "UPDATE_CUSTOMER", payload: { id: selected.id, paymentStatus: paid ? undefined : "Paid", paymentDate: paid ? undefined : today() } })} className={`rounded-2xl p-3 font-bold transition-colors ${paid ? "bg-emerald-500 text-white" : "border border-emerald-400 bg-transparent text-emerald-400"}`}><CheckCircle2 className="inline mr-1" size={18} /> Paid</button>
              <button type="button" onClick={() => dispatch({ type: "UPDATE_CUSTOMER", payload: { id: selected.id, paymentStatus: selected.paymentStatus === "Delay" ? undefined : "Delay", delayStartDate: selected.paymentStatus === "Delay" ? undefined : today(), delayEndDate: selected.paymentStatus === "Delay" ? undefined : today() } })} className={`rounded-2xl p-3 font-bold ${selected.paymentStatus === "Delay" ? "bg-amber-500/20 text-amber-300" : "border border-amber-400/50 bg-transparent text-amber-300"}`}><Clock3 className="inline mr-1" size={18} /> Delay</button>
            </div>
          </section>

          {selected.paymentStatus === "Delay" && <section className="fm-card grid grid-cols-2 gap-3 p-4">
            <label className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Delay from<input type="date" value={selected.delayStartDate || ""} onChange={(event) => dispatch({ type: "UPDATE_CUSTOMER", payload: { id: selected.id, delayStartDate: event.target.value } })} className="mt-1 w-full rounded-xl bg-muted p-3 text-sm font-semibold text-foreground outline-none" /></label>
            <label className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Delay until<input type="date" value={selected.delayEndDate || ""} onChange={(event) => dispatch({ type: "UPDATE_CUSTOMER", payload: { id: selected.id, delayEndDate: event.target.value } })} className="mt-1 w-full rounded-xl bg-muted p-3 text-sm font-semibold text-foreground outline-none" /></label>
          </section>}

          {state.settings.gstPercentage ? (
            <button type="button" onClick={() => dispatch({ type: "UPDATE_CUSTOMER", payload: { id: selected.id, addGst: !selected.addGst } })} className={`w-full rounded-xl border p-3 text-left text-sm font-bold ${selected.addGst ? "border-emerald-400 bg-emerald-500/15 text-emerald-300" : "border-border bg-card text-muted-foreground"}`}>
              <span className="mr-2 inline-flex h-5 w-5 items-center justify-center rounded border border-current">{selected.addGst ? "✓" : ""}</span>
              Add GST ({state.settings.gstPercentage}%) {selected.addGst ? `• ₹${getCustomerGst(selected).toLocaleString("en-IN")} added` : ""}
            </button>
          ) : null}

          <div className="grid grid-cols-3 gap-3">
            <button type="button" onClick={() => void generatePaymentQr(selected)} className="rounded-2xl bg-primary p-3 text-sm font-bold text-primary-foreground"><QrCode className="mx-auto mb-1" size={19} />Pay QR</button>
            <button type="button" onClick={openPayment} className="rounded-2xl bg-blue-500 p-3 text-sm font-bold text-white"><CirclePlus className="mx-auto mb-1" size={19} />Payment</button>
            <button type="button" onClick={() => setReceiptActionsOpen(true)} className="rounded-2xl bg-violet-500 p-3 text-sm font-bold text-white"><ReceiptText className="mx-auto mb-1" size={19} />Receipt</button>
          </div>

          <div className="grid grid-cols-2 border-b border-border">
            <button type="button" onClick={() => setKhataTab("work")} className={`py-3 text-sm font-bold ${khataTab === "work" ? "border-b-2 border-primary text-primary" : "text-muted-foreground"}`}>Work Logs ({charges.length})</button>
            <button type="button" onClick={() => setKhataTab("payments")} className={`py-3 text-sm font-bold ${khataTab === "payments" ? "border-b-2 border-primary text-primary" : "text-muted-foreground"}`}>Payments ({payments.length})</button>
          </div>

          {khataTab === "work" ? (
            charges.length === 0 ? <p className="py-8 text-center text-sm text-muted-foreground">No work entries yet.</p> :
              <div className="space-y-3">{charges.map((entry) => {
                const vehicle = state.vehicles.find((item) => item.id === entry.vehicleId);
                return <div key={entry.id} className="flex items-center justify-between rounded-2xl border border-border bg-card p-4">
                  <div><div className="font-bold">{entry.description || "Work entry"}</div><div className="mt-1 text-xs text-muted-foreground">{entry.date} • {vehicle?.name || "Vehicle"}</div></div>
                  <div className="flex items-center gap-3"><span className="font-black text-primary">₹{getChargeAmount(entry, selected).toLocaleString("en-IN")}</span><button type="button" aria-label="Delete work entry" onClick={() => { if (window.confirm("Delete this Khata work entry?")) entry.logId ? dispatch({ type: "DELETE_LOG", payload: entry.logId }) : dispatch({ type: "DELETE_LEDGER", payload: entry.id }); }} className="text-rose-300"><Trash2 size={16} /></button></div>
                </div>;
              })}</div>
          ) : (
            payments.length === 0 ? <p className="py-8 text-center text-sm text-muted-foreground">No payments received yet.</p> :
              <div className="space-y-3">{payments.map((entry) => <div key={entry.id} className="flex items-center justify-between rounded-2xl border border-border bg-card p-4">
                <div><div className="font-bold">{entry.paymentMode || "Payment"} • Payment</div><div className="mt-1 text-xs text-muted-foreground">{entry.date} • {entry.description || "Received"}</div></div>
                <div className="flex items-center gap-3"><span className="font-black text-emerald-400">₹{entry.amount.toLocaleString("en-IN")}</span><button type="button" aria-label="Delete payment" onClick={() => { if (window.confirm("Delete this payment?")) dispatch({ type: "DELETE_LEDGER", payload: entry.id }); }} className="text-rose-300"><Trash2 size={16} /></button></div>
              </div>)}</div>
          )}

          <div className="grid grid-cols-2 gap-2">
            <button type="button" onClick={() => void downloadReceipt(selected)} className="rounded-xl border border-border p-3 text-sm font-bold"><Download className="mr-1 inline" size={15} />PDF</button>
            <button type="button" onClick={() => void shareReceipt(selected)} className="rounded-xl border border-border p-3 text-sm font-bold"><Share2 className="mr-1 inline" size={15} />Share PDF</button>
          </div>
          {invoicePreview && <div className="rounded-xl border border-border bg-white overflow-hidden"><iframe title="Receipt preview" srcDoc={invoicePreview} className="h-[520px] w-full border-0" /><button type="button" onClick={openPrintWindow} className="w-full bg-primary p-3 font-bold text-primary-foreground">Open preview &amp; print</button></div>}
        </div>
        <Dialog open={qrOpen} onOpenChange={setQrOpen}>
          <DialogContent className="w-[90vw] max-w-sm rounded-2xl text-center">
            <DialogHeader><DialogTitle className="text-xl font-black">Payment QR</DialogTitle></DialogHeader>
            {qrDataUrl && <><div className="mb-3 text-center text-lg font-black">{state.settings.companyName || state.settings.businessName || "Fleet Manager"}</div><img src={qrDataUrl} alt="Payment QR" className="mx-auto h-64 w-64 rounded-xl bg-white p-2" /><p className="text-sm text-muted-foreground">Scan to pay {Math.max(0, balance) ? `₹${Math.max(0, balance).toLocaleString("en-IN")}` : "any amount"}</p><div className="mt-3 flex justify-center gap-5"><button type="button" onClick={() => void downloadQr(selected)} className="text-sm font-bold text-primary"><Download className="mr-1 inline" size={14} />Download QR</button><button type="button" onClick={() => void shareQr(selected)} className="text-sm font-bold text-primary"><Share2 className="mr-1 inline" size={14} />Share QR</button></div></>}
          </DialogContent>
        </Dialog>
        <Dialog open={receiptActionsOpen} onOpenChange={setReceiptActionsOpen}>
          <DialogContent className="w-[90vw] max-w-sm rounded-2xl">
            <DialogHeader><DialogTitle className="text-xl font-black">Receipt</DialogTitle></DialogHeader>
            <div className="grid gap-3 pt-3">
              <button type="button" onClick={() => { setReceiptActionsOpen(false); void shareReceipt(selected); }} className="rounded-xl bg-primary p-4 font-bold text-primary-foreground"><Share2 className="mr-2 inline" size={18} />Share PDF</button>
              <button type="button" onClick={() => { setReceiptActionsOpen(false); void downloadReceipt(selected); }} className="rounded-xl border border-border p-4 font-bold"><Download className="mr-2 inline" size={18} />Download PDF</button>
              <button type="button" onClick={() => { setReceiptActionsOpen(false); printReceipt(selected); }} className="rounded-xl border border-border p-4 font-bold"><ReceiptText className="mr-2 inline" size={18} />View Receipt</button>
            </div>
          </DialogContent>
        </Dialog>
        <Dialog open={isPaymentOpen} onOpenChange={setIsPaymentOpen}>
          <DialogContent className="w-full max-w-md rounded-t-[28px] border-border bg-card p-6 sm:rounded-2xl">
            <DialogHeader><DialogTitle className="text-2xl font-black">Add Payment Received</DialogTitle></DialogHeader>
            <form onSubmit={handleLedgerSubmit} className="space-y-5 pt-2">
              <input aria-label="Amount" type="number" min="1" required value={ledgerData.amount || ""} onChange={(event) => setLedgerData({ ...ledgerData, amount: Number(event.target.value) })} placeholder="Amount ₹" className="w-full rounded-2xl border-2 border-primary bg-background p-6 text-center text-3xl font-black outline-none placeholder:text-muted-foreground" />
              <div><div className="mb-2 text-sm font-semibold text-muted-foreground">Payment Method</div><div className="flex gap-2 overflow-x-auto">
                {["Cash", "UPI", "Bank", "Cheque"].map((mode) => <button type="button" key={mode} onClick={() => setPaymentMode(mode)} className={`rounded-full border px-4 py-3 text-sm font-bold whitespace-nowrap ${ledgerData.paymentMode === mode ? "border-primary text-primary" : "border-border bg-background text-muted-foreground"}`}>{mode}</button>)}
              </div></div>
              <input value={ledgerData.description || ""} onChange={(event) => setLedgerData({ ...ledgerData, description: event.target.value })} placeholder="Note (optional)" className="w-full rounded-xl border border-border bg-background p-4 text-base outline-none" />
              <div className="grid grid-cols-2 gap-3"><button type="button" onClick={() => setIsPaymentOpen(false)} className="rounded-2xl bg-[#244a7a] p-4 text-lg font-bold text-white">Cancel</button><button type="submit" className="rounded-2xl bg-emerald-500 p-4 text-lg font-bold text-white">＋ Add</button></div>
            </form>
          </DialogContent>
        </Dialog>
      </Layout>
    );
  }

  const visibleCustomers = state.customers.filter((customer) => {
    const matchesSearch = `${customer.name} ${customer.company || ""} ${customer.phone} ${customer.address || ""}`.toLowerCase().includes(search.toLowerCase());
    return matchesSearch && Boolean(customer.completed) === (customerSection === "completed");
  });
  return (
    <Layout>
      <div className="fm-page-header">
        <div><h1>Khata Book</h1></div>
        <button type="button" className="fm-icon-button fm-primary-icon" onClick={() => setIsAddOpen(true)} aria-label="Add customer"><Plus size={24} strokeWidth={3} /></button>
      </div>
       <div className="border-b border-border bg-[#1b2d3c] px-5 py-4">
         <div className="relative"><Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={19} /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search customers..." className="w-full bg-transparent py-1 pl-9 text-lg outline-none placeholder:text-muted-foreground" /></div>
         <div className="mt-4 grid grid-cols-2 rounded-xl bg-background/40 p-1">
           <button type="button" onClick={() => setCustomerSection("active")} className={`rounded-lg p-2 text-sm font-bold ${customerSection === "active" ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}>Active Customers ({state.customers.filter((customer) => !customer.completed).length})</button>
           <button type="button" onClick={() => setCustomerSection("completed")} className={`rounded-lg p-2 text-sm font-bold ${customerSection === "completed" ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}>Work Complete ({state.customers.filter((customer) => customer.completed).length})</button>
         </div>
       </div>
      <div className="px-5 py-5 pb-24 space-y-4">
        <div className="rounded-2xl border border-primary/20 bg-[#3a2200] p-4 text-sm text-amber-200">ⓘ Tap a customer to open Khata.</div>
         {visibleCustomers.length === 0 ? <div className="fm-empty-state min-h-48 rounded-2xl border border-border bg-card"><Users size={48} /><p>{customerSection === "completed" ? "No completed customers yet" : "No customers yet"}</p></div> :
          visibleCustomers.map((customer) => {
            const total = getCustomerSubtotal(customer.id) + getCustomerGst(customer);
             return <div key={customer.id} onPointerDown={() => startCustomerPress(customer.id)} onPointerUp={endCustomerPress} onPointerCancel={endCustomerPress} onPointerLeave={endCustomerPress} onClick={() => { if (customerLongPressed.current) { customerLongPressed.current = false; return; } setSelectedCustomer(customer.id); setKhataTab("work"); }} className="w-full cursor-pointer rounded-2xl border border-[#244a7a] bg-card p-4 text-left transition-colors active:bg-secondary">
              <div className="flex items-center gap-4"><div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-[#454545] text-3xl font-black text-primary">{customer.name.slice(0, 1).toUpperCase()}</div><div className="min-w-0 flex-1"><h3 className="text-xl font-black">{customer.name}</h3><div className="mt-1 flex items-center gap-1 text-sm text-muted-foreground"><Phone size={14} />{customer.phone}</div>{customer.address && <div className="text-sm text-muted-foreground">{customer.address}</div>}<div className="mt-1 text-sm text-muted-foreground">{getCustomerCharges(customer.id).length} work logs</div></div><div className="text-right"><div className="text-xl font-black text-primary">₹{total.toLocaleString("en-IN")}</div><div className="text-xs text-muted-foreground">Total Work</div><div className="mt-2 text-muted-foreground">›</div></div></div>
               <div className="mt-3 grid grid-cols-2 gap-2">
                 <button type="button" onClick={(event) => { event.stopPropagation(); setSelectedCustomer(customer.id); setKhataTab("work"); }} className="rounded-xl bg-primary/15 p-2 text-sm font-bold text-primary">{customerSection === "completed" ? "Open history" : "Open Khata"}</button>
                 {customerSection === "completed"
                   ? <button type="button" onClick={(event) => { event.stopPropagation(); dispatch({ type: "TOGGLE_CUSTOMER_COMPLETE", payload: customer.id }); }} className="rounded-xl bg-emerald-500 p-2 text-sm font-bold text-white">Active Customer</button>
                   : <span className="rounded-xl border border-border p-2 text-center text-xs font-semibold text-muted-foreground">Long press to complete</span>}
               </div>
             </div>;
          })}
      </div>
      <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
        <DialogContent className="w-[90vw] max-w-md rounded-2xl"><DialogHeader><DialogTitle className="text-xl font-bold">Add Customer</DialogTitle></DialogHeader>
          <form onSubmit={handleCustomerSubmit} className="space-y-4 pt-3">
            <input required value={customerData.name || ""} onChange={(event) => setCustomerData({ ...customerData, name: event.target.value })} placeholder="Customer name" className="w-full rounded-xl bg-muted p-4 font-semibold outline-none" />
            <input required type="tel" value={customerData.phone || ""} onChange={(event) => setCustomerData({ ...customerData, phone: event.target.value })} placeholder="Phone number" className="w-full rounded-xl bg-muted p-4 font-semibold outline-none" />
            <input value={customerData.company || ""} onChange={(event) => setCustomerData({ ...customerData, company: event.target.value })} placeholder="Company (optional)" className="w-full rounded-xl bg-muted p-4 font-semibold outline-none" />
            <textarea value={customerData.address || ""} onChange={(event) => setCustomerData({ ...customerData, address: event.target.value })} placeholder="Address / site location (optional)" className="min-h-20 w-full rounded-xl bg-muted p-4 font-semibold outline-none" />
            <button type="submit" className="w-full rounded-xl bg-foreground p-4 font-bold text-background">Save Customer</button>
          </form>
        </DialogContent>
      </Dialog>
      <Dialog open={Boolean(completeCustomerId)} onOpenChange={(open) => !open && setCompleteCustomerId(null)}>
        <DialogContent className="w-[90vw] max-w-sm rounded-2xl">
          <DialogHeader><DialogTitle className="text-xl font-black">Mark customer complete?</DialogTitle></DialogHeader>
          <p className="py-2 text-sm text-muted-foreground">This customer will move to Work Complete and can be activated again later.</p>
          <div className="grid grid-cols-2 gap-3 pt-2">
            <button type="button" onClick={() => setCompleteCustomerId(null)} className="rounded-xl border border-border p-3 font-bold">Cancel</button>
            <button type="button" onClick={() => { if (completeCustomerId) dispatch({ type: "TOGGLE_CUSTOMER_COMPLETE", payload: completeCustomerId }); setCompleteCustomerId(null); }} className="rounded-xl bg-primary p-3 font-bold text-primary-foreground">Mark complete</button>
          </div>
        </DialogContent>
      </Dialog>
    </Layout>
  );
}
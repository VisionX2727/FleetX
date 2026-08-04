import { Layout } from "@/components/layout";
import { useRole } from "@/lib/role";
import { FileText, Download, Share2 } from "lucide-react";
import { createHtmlPdf } from "@/lib/pdf";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useState } from "react";

export default function DriverInvoices() {
  const { invoices = [] } = useRole();
  const [viewing, setViewing] = useState<NonNullable<typeof invoices>[number] | null>(null);
  const activeInvoices = invoices.filter((invoice) => !invoice.revokedAt);
  const download = async (html: string, title: string) => {
    const blob = await createHtmlPdf(html);
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `${title.replace(/\W+/g, "-").toLowerCase()}.pdf`;
    anchor.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  };
  return <Layout><header className="fm-page-header"><div><h1>Invoices</h1><p>Receipts sent by your owner</p></div></header><main className="fm-page-content space-y-3 pb-24">{activeInvoices.length ? activeInvoices.map((invoice) => <article key={invoice.id} className="fm-card p-4"><div className="flex items-center gap-3"><FileText className="text-primary" /><div className="min-w-0 flex-1"><strong className="block truncate">{invoice.title}</strong><small>{new Date(invoice.createdAt).toLocaleDateString("en-IN")}</small></div></div><div className="mt-3 grid grid-cols-3 gap-2"><button type="button" onClick={() => setViewing(invoice)} className="rounded-xl border border-border p-3 text-sm font-bold">View</button><button type="button" onClick={() => void download(invoice.html, invoice.title)} className="rounded-xl border border-border p-3 text-sm font-bold"><Download className="mr-1 inline" size={15} />PDF</button><button type="button" onClick={async () => { if (!navigator.share) return; const file = new File([await createHtmlPdf(invoice.html)], `${invoice.title}.pdf`, { type: "application/pdf" }); await navigator.share({ title: invoice.title, files: [file] }); }} className="rounded-xl border border-border p-3 text-sm font-bold"><Share2 className="mr-1 inline" size={15} />Share</button></div></article>) : <div className="fm-empty-state min-h-48"><FileText size={45} /><p>No invoices received yet.</p></div>}</main><Dialog open={Boolean(viewing)} onOpenChange={(open) => !open && setViewing(null)}><DialogContent className="h-[88vh] w-[94vw] max-w-3xl rounded-2xl"><DialogHeader><DialogTitle>{viewing?.title || "Invoice"}</DialogTitle></DialogHeader>{viewing && <iframe title={viewing.title} srcDoc={viewing.html} className="min-h-0 flex-1 rounded-xl border border-border bg-white" />}</DialogContent></Dialog></Layout>;
}
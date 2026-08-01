export type InvoiceLine = {
  date: string;
  description: string;
  amount: number;
  duration?: string;
};

export type InvoiceData = {
  invoiceId: string;
  issuedAt: string;
  businessName: string;
  ownerName: string;
  phone: string;
  email: string;
  address: string;
  bankName: string;
  gstNumber: string;
  upiId: string;
  logoUrl?: string;
  customerName: string;
  customerPhone: string;
  customerCompany: string;
  customerAddress: string;
  workStart: string;
  workEnd: string;
  serviceLocation: string;
  lines: InvoiceLine[];
  total: number;
  balanceDue: number;
  status: "PAID" | "DUE";
  paymentDate?: string;
  paymentReference?: string;
};

export function amountInWords(amount: number) {
  const ones = ["", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine", "Ten", "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen", "Seventeen", "Eighteen", "Nineteen"];
  const tens = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];
  const underThousand = (value: number): string => {
    if (value < 20) return ones[value];
    if (value < 100) return `${tens[Math.floor(value / 10)]}${value % 10 ? ` ${ones[value % 10]}` : ""}`;
    return `${ones[Math.floor(value / 100)]} Hundred${value % 100 ? ` ${underThousand(value % 100)}` : ""}`;
  };
  if (!Number.isFinite(amount) || amount <= 0) return "Zero Rupees Only";
  let value = Math.floor(amount);
  const parts: string[] = [];
  if (value >= 10000000) {
    parts.push(`${underThousand(Math.floor(value / 10000000))} Crore`);
    value %= 10000000;
  }
  if (value >= 100000) {
    parts.push(`${underThousand(Math.floor(value / 100000))} Lakh`);
    value %= 100000;
  }
  if (value >= 1000) {
    parts.push(`${underThousand(Math.floor(value / 1000))} Thousand`);
    value %= 1000;
  }
  if (value) parts.push(underThousand(value));
  return `${parts.join(" ")} Rupees Only`;
}

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (character) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;",
  }[character] || character));
}

function money(value: number) {
  return `₹${value.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function createInvoiceHtml(data: InvoiceData) {
  const rows = data.lines.map((line) => `
    <tr>
      <td>${escapeHtml(line.description)}${line.duration ? `<small>${escapeHtml(line.duration)}</small>` : ""}<span class="date">${escapeHtml(line.date)}</span></td>
      <td class="amount">${money(line.amount)}</td>
    </tr>`).join("");
  const logo = data.logoUrl ? `<img class="logo" src="${data.logoUrl}" alt="Business logo" />` : `<div class="logo-fallback">${escapeHtml(data.businessName.slice(0, 2).toUpperCase())}</div>`;
  return `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escapeHtml(data.customerName)} invoice</title><style>
    *{box-sizing:border-box}body{margin:0;background:#eef1f4;color:#101114;font-family:Arial,Helvetica,sans-serif;font-size:13px}.sheet{width:min(100%,820px);margin:0 auto;background:#fff;min-height:100vh;padding:28px 34px 22px}.brand{display:flex;align-items:center;gap:18px;padding-bottom:18px}.logo,.logo-fallback{width:108px;height:108px;object-fit:contain;border-radius:16px}.logo-fallback{display:flex;align-items:center;justify-content:center;background:#151515;color:#f5bb16;font-weight:900;font-size:30px}.business{font-size:29px;letter-spacing:1px;font-weight:700}.subtitle{font-size:19px;margin-top:5px;letter-spacing:.4px}.box{border:1px solid #5f6468;border-radius:6px;padding:12px 14px;margin-top:13px}.meta{display:flex;justify-content:space-between;font-weight:700;font-size:15px}.meta-row{margin-top:10px}.section-title{font-size:18px;font-weight:800;margin:20px 0 7px}.client-grid{display:grid;grid-template-columns:1fr 1.4fr;gap:5px 14px}.label{font-weight:700}.summary{width:100%;border-collapse:collapse;margin-top:8px}.summary th,.summary td{border:1px solid #777;padding:9px 10px;text-align:left}.summary th:last-child,.summary td:last-child{text-align:right;width:28%}.summary small,.summary .date{display:block;color:#555;font-size:11px;margin-top:3px}.total td{font-weight:800}.grand td{text-align:right!important;font-size:16px;font-weight:800}.words{border-bottom:1px solid #777;padding:13px 0;font-size:14px}.payment{margin-top:17px;display:grid;grid-template-columns:1fr 1fr;gap:18px}.payment ul{margin:5px 0 0;padding-left:18px;line-height:1.7}.sign{text-align:center;border-left:1px solid #ddd;padding-top:8px}.status{display:inline-block;padding:3px 8px;border-radius:4px;color:#fff;background:${data.status === "PAID" ? "#4f9c59" : "#c98219"};font-weight:700}.signature{font-family:cursive;font-size:24px;margin-top:16px}.footer{border-top:1px solid #777;margin-top:18px;padding-top:9px;text-align:center;font-size:12px}.actions{display:flex;gap:10px;margin-top:20px}.actions button{flex:1;padding:11px;border:1px solid #888;border-radius:6px;background:#e9ecef;font-weight:700}@media print{body{background:#fff}.sheet{width:100%;padding:18mm 15mm}.actions{display:none}}@media(max-width:600px){body{font-size:11px}.sheet{padding:16px 12px}.brand{gap:10px}.logo,.logo-fallback{width:70px;height:70px}.business{font-size:18px}.subtitle{font-size:12px}.meta{font-size:11px}.section-title{font-size:14px}.box{padding:9px}.summary th,.summary td{padding:6px 5px}.payment{gap:8px}.footer{font-size:9px}}
  </style></head><body><main class="sheet">
    <header class="brand">${logo}<div><div class="business">${escapeHtml(data.businessName)}</div><div class="subtitle">SERVICE INVOICE &amp; PROJECT REPORT</div></div></header>
    <section class="box"><div class="meta"><span>INVOICE ID: ${escapeHtml(data.invoiceId)}</span><span>Time: ${escapeHtml(data.issuedAt)}</span></div><div class="meta-row"><b>Work Date Range:</b> ${escapeHtml(data.workStart)} to ${escapeHtml(data.workEnd)}</div><div class="meta-row"><b>Service Location:</b> ${escapeHtml(data.serviceLocation || "—")}</div></section>
    <h2 class="section-title">CLIENT INFORMATION</h2><section class="box client-grid"><div class="label">Contact Person:</div><div>${escapeHtml(data.customerName)}</div><div class="label">Phone:</div><div>${escapeHtml(data.customerPhone || "—")}</div><div class="label">Billing Address:</div><div>${escapeHtml(data.customerCompany || data.customerAddress || "—")}</div><div></div><div>${escapeHtml(data.customerAddress || "—")}</div></section>
    <h2 class="section-title">PAYMENT SUMMARY</h2><table class="summary"><thead><tr><th>Description</th><th>Amount (INR)</th></tr></thead><tbody>${rows || `<tr><td>No work entries</td><td class="amount">${money(0)}</td></tr>`}<tr class="total"><td>Total Amount:</td><td>${money(data.total)}</td></tr><tr class="grand"><td colspan="2">Grand Total: ${money(data.total)}</td></tr></tbody></table>
    <div class="words"><b>Amount in Words:</b> ${escapeHtml(amountInWords(data.total))}</div>
    <h2 class="section-title">PAYMENT METHOD</h2><section class="payment"><div><ul><li>Invoice Issuing Date: ${escapeHtml(data.issuedAt)}</li><li>Payment Terms: 7 Days from Receipt</li><li>Reference UPI: ${escapeHtml(data.paymentReference || data.upiId || "—")}</li><li>Status: <span class="status">${data.status}</span></li><li>Balance Due: ${money(data.balanceDue)}</li><li>Date of Payment: ${escapeHtml(data.paymentDate || "—")}</li></ul></div><div class="sign"><b>[Secured Digital Seal]</b><div class="signature">${escapeHtml(data.ownerName || data.businessName)}</div><b>Authorized Signatory: Mr. ${escapeHtml(data.ownerName || data.businessName)}</b><br>Designation: Owner / Authorized Signatory</div></section>
    <div class="actions"><button type="button">Export as CSV</button><button type="button">Upload Supporting Documents</button><button type="button">Upload Supporting Documents</button></div>
    <footer class="footer">${escapeHtml(data.phone || "—")} &nbsp;•&nbsp; ${escapeHtml(data.email || "—")} &nbsp;•&nbsp; ${escapeHtml(data.bankName || "—")} &nbsp;•&nbsp; GSTIN: ${escapeHtml(data.gstNumber || "—")}</footer>
  </main></body></html>`;
}
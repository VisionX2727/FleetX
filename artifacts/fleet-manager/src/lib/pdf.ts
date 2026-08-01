import { InvoiceData } from "@/lib/invoice";

function escapePdfText(value: string) {
  return value.replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)");
}

function wrap(value: string, width = 88) {
  const words = value.split(/\s+/);
  const lines: string[] = [];
  let line = "";
  words.forEach((word) => {
    if (!word) return;
    if ((line + " " + word).trim().length > width && line) {
      lines.push(line);
      line = word;
    } else {
      line = `${line} ${word}`.trim();
    }
  });
  if (line) lines.push(line);
  return lines;
}

export function createInvoicePdf(data: InvoiceData) {
  const lines = [
    data.companyName || data.businessName || "Fleet Manager",
    data.businessName || "SERVICE INVOICE",
    data.address ? `Address: ${data.address}` : "",
    `Invoice ID: ${data.invoiceId}    Issued: ${data.issuedAt} ${data.issuedTime}`,
    `Customer: ${data.customerName}    Phone: ${data.customerPhone || "—"}`,
    `Billing address: ${data.customerAddress || data.customerCompany || "—"}`,
    `Work date range: ${data.workStart} to ${data.workEnd}`,
    `Service location: ${data.serviceLocation || "—"}`,
    "",
    "PAYMENT SUMMARY",
    ...data.lines.flatMap((line) => wrap(`${line.date} - ${line.description}: INR ${line.amount.toLocaleString("en-IN")}`)),
    "",
    `Subtotal: INR ${(data.subtotal ?? data.total).toLocaleString("en-IN")}`,
    ...(data.addGst && data.gstAmount ? [`GST (${data.gstPercentage || 0}%): INR ${data.gstAmount.toLocaleString("en-IN")}`] : []),
    ...(data.payments || []).flatMap((payment) => wrap(`Paid: ${payment.paymentMode || "Payment"}${payment.description ? ` - ${payment.description}` : ""} on ${payment.date}: INR ${payment.amount.toLocaleString("en-IN")}`)),
    `Grand Total: INR ${data.total.toLocaleString("en-IN")}`,
    `Amount in words: ${data.total.toLocaleString("en-IN")} rupees only`,
    "",
    "PAYMENT DETAILS",
    `Payment mode: ${data.paymentMode || "—"}`,
    `Status: ${data.status}`,
    `Balance due: INR ${data.balanceDue.toLocaleString("en-IN")}`,
    `Payment date: ${data.paymentDate || "—"}`,
    `Reference: ${data.paymentReference || "—"}`,
    "",
    `Authorized signatory: ${data.ownerName || data.companyName || "—"}`,
    `GSTIN: ${data.addGst ? data.gstNumber || "—" : "Not applicable"}`,
  ].filter(Boolean).flatMap(wrap);

  const content: string[] = ["BT", "/F1 10 Tf", "40 800 Td"];
  lines.forEach((line, index) => {
    if (index > 0) content.push("0 -14 Td");
    content.push(`(${escapePdfText(line)}) Tj`);
  });
  content.push("ET");
  const stream = content.join("\n");
  const objects = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    "<< /Type /Pages /Kids [5 0 R] /Count 1 >>",
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
    `<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`,
    "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 3 0 R >> >> /Contents 4 0 R >>",
  ];
  let pdf = "%PDF-1.4\n";
  const offsets = [0];
  objects.forEach((object, index) => {
    offsets[index + 1] = pdf.length;
    pdf += `${index + 1} 0 obj\n${object}\nendobj\n`;
  });
  const xref = pdf.length;
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  offsets.slice(1).forEach((offset) => { pdf += `${String(offset).padStart(10, "0")} 00000 n \n`; });
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`;
  return new Blob([pdf], { type: "application/pdf" });
}
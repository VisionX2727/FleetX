import html2canvas from "html2canvas";
import { jsPDF } from "jspdf";
import { createInvoiceHtml, InvoiceData } from "@/lib/invoice";

function waitForImages(root: HTMLElement) {
  return Promise.all(Array.from(root.querySelectorAll("img")).map((image) => {
    if (image.complete) return Promise.resolve();
    return new Promise<void>((resolve) => {
      image.addEventListener("load", () => resolve(), { once: true });
      image.addEventListener("error", () => resolve(), { once: true });
    });
  }));
}

export async function createHtmlPdf(html: string, width = 820): Promise<Blob> {
  const frame = document.createElement("iframe");
  frame.setAttribute("aria-hidden", "true");
  frame.style.cssText = `position:fixed;left:-10000px;top:0;width:${width}px;height:1400px;border:0;opacity:0;pointer-events:none;`;
  frame.srcdoc = html;
  document.body.appendChild(frame);
  try {
    await new Promise<void>((resolve) => {
      frame.addEventListener("load", () => resolve(), { once: true });
      window.setTimeout(resolve, 500);
    });
    const body = frame.contentDocument?.body;
    const sheet = frame.contentDocument?.querySelector(".sheet") as HTMLElement | null;
    if (!body || !sheet) throw new Error("PDF content could not be rendered");
    await waitForImages(body);
    const canvas = await html2canvas(sheet, { backgroundColor: "#ffffff", scale: Math.min(2, window.devicePixelRatio || 1.5), useCORS: true, logging: false });
    const pdf = new jsPDF({ unit: "mm", format: "a4", orientation: "portrait", compress: true });
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    const imageWidth = pageWidth;
    const imageHeight = (canvas.height * imageWidth) / canvas.width;
    const image = canvas.toDataURL("image/jpeg", 0.94);
    let remainingHeight = imageHeight;
    let offset = 0;
    pdf.addImage(image, "JPEG", 0, offset, imageWidth, imageHeight, undefined, "FAST");
    remainingHeight -= pageHeight;
    while (remainingHeight > 0) {
      offset -= pageHeight;
      pdf.addPage();
      pdf.addImage(image, "JPEG", 0, offset, imageWidth, imageHeight, undefined, "FAST");
      remainingHeight -= pageHeight;
    }
    return pdf.output("blob");
  } finally {
    frame.remove();
  }
}

export function createInvoicePdf(data: InvoiceData): Promise<Blob> {
  return createHtmlPdf(createInvoiceHtml(data));
}
import {
  formatCurrency,
  invoiceStatusLabel,
  invoiceTotalCents,
  type InvoiceDocument,
} from "./schema.ts";

export const INVOICE_PDF_EXTENSION = ".pdf";

const PAGE_WIDTH = 612;
const PAGE_HEIGHT = 792;
const MARGIN = 56;
const CONTENT_WIDTH = PAGE_WIDTH - MARGIN * 2;
const BOTTOM_LIMIT = MARGIN;

function escapePdfText(text: string): string {
  let out = "";
  for (const char of text) {
    const code = char.codePointAt(0) ?? 0;
    if (char === "\\") {
      out += "\\\\";
    } else if (char === "(") {
      out += "\\(";
    } else if (char === ")") {
      out += "\\)";
    } else if (code >= 0x20 && code <= 0x7e) {
      out += char;
    } else {
      out += "?";
    }
  }
  return out;
}

const HELVETICA_WIDTH_HINTS: Array<[RegExp, number]> = [
  [/^[0-9]$/, 0.556],
  [/^[A-Z]$/, 0.7],
  [/^[a-z]$/, 0.5],
  [/^ $/, 0.278],
  [/^[.,:;'!]$/, 0.278],
  [/^[()\-/]$/, 0.333],
];

export function estimateTextWidth(text: string, fontSize: number): number {
  let units = 0;
  for (const char of text) {
    const hint = HELVETICA_WIDTH_HINTS.find(([pattern]) => pattern.test(char));
    units += hint ? hint[1] : 0.5;
  }
  return units * fontSize;
}

function num(value: number): string {
  return Number(value.toFixed(3)).toString();
}

class PdfPageBuilder {
  private ops: string[] = [];

  text(
    x: number,
    y: number,
    value: string,
    options: { size?: number; bold?: boolean; align?: "left" | "right" } = {},
  ): void {
    const size = options.size ?? 11;
    const font = options.bold ? "F2" : "F1";
    let tx = x;
    if (options.align === "right") {
      tx = x - estimateTextWidth(value, size);
    }
    this.ops.push(
      `BT /${font} ${num(size)} Tf 1 0 0 1 ${num(tx)} ${num(y)} Tm (${escapePdfText(value)}) Tj ET`,
    );
  }

  line(x1: number, y1: number, x2: number, y2: number, width = 1): void {
    this.ops.push(`${num(width)} w ${num(x1)} ${num(y1)} m ${num(x2)} ${num(y2)} l S`);
  }

  rect(x: number, y: number, width: number, height: number): void {
    this.ops.push(`${num(x)} ${num(y)} ${num(width)} ${num(height)} re f`);
  }

  get content(): string {
    return this.ops.join("\n");
  }
}

export interface RenderInvoicePdfOptions {
  businessName?: string;
  businessEmail?: string;
}

const COLUMN_X = {
  description: MARGIN,
  quantity: PAGE_WIDTH - MARGIN - 200,
  unitPrice: PAGE_WIDTH - MARGIN - 120,
  amount: PAGE_WIDTH - MARGIN,
};

function renderTableHeader(page: PdfPageBuilder, y: number): number {
  page.text(COLUMN_X.description, y, "Description", { bold: true, size: 10 });
  page.text(COLUMN_X.quantity, y, "Qty", { bold: true, size: 10, align: "right" });
  page.text(COLUMN_X.unitPrice, y, "Unit Price", { bold: true, size: 10, align: "right" });
  page.text(COLUMN_X.amount, y, "Amount", { bold: true, size: 10, align: "right" });
  page.line(MARGIN, y - 6, PAGE_WIDTH - MARGIN, y - 6, 0.75);
  return y - 20;
}

export function renderInvoicePdf(
  invoice: InvoiceDocument,
  options: RenderInvoicePdfOptions = {},
): Uint8Array<ArrayBuffer> {
  const pages: PdfPageBuilder[] = [];
  let page = new PdfPageBuilder();
  pages.push(page);
  let y = PAGE_HEIGHT - MARGIN;

  const ensureSpace = (needed: number) => {
    if (y - needed < BOTTOM_LIMIT) {
      page = new PdfPageBuilder();
      pages.push(page);
      y = PAGE_HEIGHT - MARGIN;
    }
  };

  const businessName = options.businessName?.trim() || "Subbie";

  page.text(MARGIN, y, "INVOICE", { size: 26, bold: true });
  page.text(PAGE_WIDTH - MARGIN, y - 2, invoice.number, { size: 13, bold: true, align: "right" });
  page.text(PAGE_WIDTH - MARGIN, y - 18, invoiceStatusLabel(invoice.status), {
    size: 10,
    align: "right",
  });
  y -= 30;

  page.text(MARGIN, y, businessName, { size: 11, bold: true });
  if (options.businessEmail) {
    page.text(MARGIN, y - 14, options.businessEmail, { size: 9 });
  }

  page.text(MARGIN, y - 40, "Bill To", { size: 9 });
  page.text(MARGIN, y - 53, invoice.clientName, { size: 11, bold: true });
  if (invoice.clientEmail) {
    page.text(MARGIN, y - 66, invoice.clientEmail, { size: 9 });
  }

  page.text(PAGE_WIDTH - MARGIN - 160, y - 40, "Issued", { size: 9 });
  page.text(PAGE_WIDTH - MARGIN - 160, y - 53, invoice.issueDate, { size: 10 });
  page.text(PAGE_WIDTH - MARGIN - 80, y - 40, "Due", { size: 9 });
  page.text(PAGE_WIDTH - MARGIN - 80, y - 53, invoice.dueDate, { size: 10 });

  y -= 96;
  page.line(MARGIN, y, PAGE_WIDTH - MARGIN, y, 1.25);
  y -= 18;
  y = renderTableHeader(page, y);

  for (const item of invoice.items) {
    const itemNotes = item.notes?.trim() ?? "";
    ensureSpace(itemNotes ? 38 : 24);
    if (y === PAGE_HEIGHT - MARGIN) {
      y = renderTableHeader(page, y);
    }
    const baseDescription = item.description.trim() || "Item";
    const description = item.date ? `${baseDescription} (${item.date})` : baseDescription;
    page.text(COLUMN_X.description, y, description, { size: 10 });
    page.text(COLUMN_X.quantity, y, String(item.quantity), { size: 10, align: "right" });
    page.text(COLUMN_X.unitPrice, y, formatCurrency(item.unitPriceCents, invoice.currency), {
      size: 10,
      align: "right",
    });
    page.text(
      COLUMN_X.amount,
      y,
      formatCurrency(Math.round(item.quantity * item.unitPriceCents), invoice.currency),
      { size: 10, align: "right" },
    );
    y -= 16;
    if (itemNotes) {
      page.text(COLUMN_X.description, y + 3, itemNotes, { size: 8 });
      y -= 12;
    }
  }

  ensureSpace(36);
  y -= 6;
  page.line(MARGIN, y, PAGE_WIDTH - MARGIN, y, 0.75);
  y -= 20;
  page.text(COLUMN_X.unitPrice - 40, y, "Total", { size: 11, bold: true, align: "right" });
  page.text(COLUMN_X.amount, y, formatCurrency(invoiceTotalCents(invoice), invoice.currency), {
    size: 11,
    bold: true,
    align: "right",
  });
  y -= 30;

  if (invoice.notes.trim().length > 0) {
    ensureSpace(50);
    page.text(MARGIN, y, "Notes", { size: 9 });
    y -= 14;
    for (const rawLine of invoice.notes.split("\n")) {
      let remaining = rawLine;
      while (remaining.length > 0) {
        ensureSpace(16);
        let take = remaining.length;
        while (take > 0 && estimateTextWidth(remaining.slice(0, take), 9) > CONTENT_WIDTH) {
          take -= 1;
        }
        if (take <= 0) {
          take = 1;
        }
        let splitAt = take;
        if (take < remaining.length) {
          const lastSpace = remaining.slice(0, take).lastIndexOf(" ");
          if (lastSpace > 0) {
            splitAt = lastSpace;
          }
        }
        page.text(MARGIN, y, remaining.slice(0, splitAt), { size: 9 });
        remaining = remaining.slice(splitAt).replace(/^ /, "");
        y -= 13;
      }
      if (rawLine.length === 0) {
        ensureSpace(16);
        y -= 13;
      }
    }
  }

  for (const builtPage of pages) {
    builtPage.text(
      PAGE_WIDTH / 2 - estimateTextWidth("Created with Subbie", 8) / 2,
      MARGIN / 2,
      "Created with Subbie",
      { size: 8 },
    );
  }

  return buildPdfDocument(pages.map((builtPage) => builtPage.content));
}

function buildPdfDocument(pageContents: string[]): Uint8Array<ArrayBuffer> {
  const encoder = new TextEncoder();
  const chunks: Uint8Array[] = [];
  const offsets: number[] = [];
  let position = 0;

  const push = (chunk: string | Uint8Array) => {
    const bytes = typeof chunk === "string" ? encoder.encode(chunk) : chunk;
    chunks.push(bytes);
    position += bytes.length;
  };

  push("%PDF-1.4\n");

  const pageCount = pageContents.length;
  const catalogId = 1;
  const pagesId = 2;
  const firstPageId = 3;
  const fontRegularId = firstPageId + pageCount;
  const fontBoldId = fontRegularId + 1;
  const firstContentId = fontBoldId + 1;
  const objectCount = firstContentId + pageCount - 1;

  const startObject = (id: number) => {
    offsets[id] = position;
    push(`${id} 0 obj\n`);
  };

  startObject(catalogId);
  push(`<< /Type /Catalog /Pages ${pagesId} 0 R >>\nendobj\n`);

  startObject(pagesId);
  const kids = Array.from({ length: pageCount }, (_, i) => `${firstPageId + i} 0 R`).join(" ");
  push(`<< /Type /Pages /Kids [${kids}] /Count ${pageCount} >>\nendobj\n`);

  for (let i = 0; i < pageCount; i++) {
    const pageId = firstPageId + i;
    const contentId = firstContentId + i;
    startObject(pageId);
    push(
      `<< /Type /Page /Parent ${pagesId} 0 R /MediaBox [0 0 ${PAGE_WIDTH} ${PAGE_HEIGHT}] ` +
        `/Resources << /Font << /F1 ${fontRegularId} 0 R /F2 ${fontBoldId} 0 R >> >> ` +
        `/Contents ${contentId} 0 R >>\nendobj\n`,
    );
  }

  startObject(fontRegularId);
  push("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\nendobj\n");

  startObject(fontBoldId);
  push("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>\nendobj\n");

  for (let i = 0; i < pageCount; i++) {
    const contentId = firstContentId + i;
    const stream = encoder.encode(`${pageContents[i]}\n`);
    startObject(contentId);
    push(`<< /Length ${stream.length} >>\nstream\n`);
    push(stream);
    push("endstream\nendobj\n");
  }

  const xrefOffset = position;
  push(`xref\n0 ${objectCount + 1}\n`);
  push("0000000000 65535 f \n");
  for (let id = 1; id <= objectCount; id++) {
    push(`${String(offsets[id]).padStart(10, "0")} 00000 n \n`);
  }
  push(
    `trailer\n<< /Size ${objectCount + 1} /Root ${catalogId} 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`,
  );

  const total = chunks.reduce((sum, chunk) => sum + chunk.length, 0);
  const out = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    out.set(chunk, offset);
    offset += chunk.length;
  }
  return out;
}

export function createInvoicePdfFilename(invoice: InvoiceDocument): string {
  const base = invoice.number
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return `${base || "invoice"}${INVOICE_PDF_EXTENSION}`;
}

export function invoicePdfBlob(
  invoice: InvoiceDocument,
  options: RenderInvoicePdfOptions = {},
): Blob {
  return new Blob([renderInvoicePdf(invoice, options)], { type: "application/pdf" });
}

export function downloadInvoicePdf(
  invoice: InvoiceDocument,
  filename = createInvoicePdfFilename(invoice),
  options: RenderInvoicePdfOptions = {},
  bytes = renderInvoicePdf(invoice, options),
): Uint8Array<ArrayBuffer> {
  if (typeof document !== "undefined" && typeof URL !== "undefined") {
    const blob = new Blob([bytes], { type: "application/pdf" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = filename;
    anchor.style.display = "none";
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
    setTimeout(() => {
      URL.revokeObjectURL(url);
    }, 0);
  }
  return bytes;
}

export type SendInvoicePdfMethod = "shared" | "downloaded";

export interface SendInvoicePdfResult {
  method: SendInvoicePdfMethod;
  filename: string;
  bytes: Uint8Array<ArrayBuffer>;
}

export async function sendInvoicePdf(
  invoice: InvoiceDocument,
  options: RenderInvoicePdfOptions = {},
): Promise<SendInvoicePdfResult> {
  const filename = createInvoicePdfFilename(invoice);
  const bytes = renderInvoicePdf(invoice, options);
  const nav = typeof navigator !== "undefined" ? navigator : undefined;
  if (nav && typeof File !== "undefined") {
    const file = new File([bytes], filename, { type: "application/pdf" });
    const shareData = { files: [file], title: invoice.number, text: `Invoice ${invoice.number}` };
    if (typeof nav.canShare === "function" && nav.canShare(shareData)) {
      await nav.share(shareData);
      return { method: "shared", filename, bytes };
    }
  }
  downloadInvoicePdf(invoice, filename, options, bytes);
  return { method: "downloaded", filename, bytes };
}

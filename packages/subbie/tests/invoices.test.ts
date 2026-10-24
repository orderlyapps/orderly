import { expect, test } from "vite-plus/test";
import { getRxStorageMemory } from "rxdb/plugins/storage-memory";
import {
  addDaysToDateString,
  createInvoicePdfFilename,
  createInvoicesStore,
  formatCurrency,
  invoiceStatusColor,
  invoiceStatusLabel,
  invoiceTotalCents,
  isInvoiceDocument,
  isInvoiceStatus,
  isValidInvoiceId,
  nextInvoiceNumber,
  normalizeInvoiceDocument,
  normalizeInvoiceLineItem,
  renderInvoicePdf,
  sendInvoicePdf,
  toDateString,
  validateInvoiceInput,
  type CreateInvoiceInput,
} from "../src/feature/invoices/index.ts";

let storeCounter = 0;
function nextStoreName() {
  storeCounter += 1;
  return `subbie_test_${Date.now()}_${storeCounter}`;
}

function sampleInput(): CreateInvoiceInput {
  return {
    clientName: "Acme Corp",
    clientEmail: "billing@acme.com",
    currency: "USD",
    items: [
      { description: "Design work", quantity: 2, unitPriceCents: 125_000 },
      { description: "Consulting", quantity: 1.5, unitPriceCents: 40_000 },
    ],
    notes: "Net 30",
  };
}

test("validates invoice schema helpers", () => {
  expect(isInvoiceStatus("draft")).toBe(true);
  expect(isInvoiceStatus("sent")).toBe(true);
  expect(isInvoiceStatus("paid")).toBe(true);
  expect(isInvoiceStatus("overdue")).toBe(true);
  expect(isInvoiceStatus("pending")).toBe(false);
  expect(isInvoiceStatus(null)).toBe(false);

  expect(isValidInvoiceId("inv-1")).toBe(true);
  expect(isValidInvoiceId("")).toBe(false);

  expect(invoiceStatusColor("draft")).toBe("medium");
  expect(invoiceStatusColor("sent")).toBe("warning");
  expect(invoiceStatusColor("paid")).toBe("success");
  expect(invoiceStatusColor("overdue")).toBe("danger");
  expect(invoiceStatusLabel("sent")).toBe("Sent");

  expect(formatCurrency(125_000)).toBe("$1,250.00");
  expect(formatCurrency(0, "EUR")).toBe("€0.00");

  expect(toDateString(new Date(2026, 9, 24))).toBe("2026-10-24");
  expect(addDaysToDateString("2026-10-24", 30)).toBe("2026-11-23");
  expect(addDaysToDateString("2026-12-25", 30)).toBe("2027-01-24");

  expect(nextInvoiceNumber([], new Date(2026, 0, 5))).toBe("INV-2026-001");
  expect(nextInvoiceNumber(["INV-2026-003", "INV-2025-050"], new Date(2026, 0, 5))).toBe(
    "INV-2026-004",
  );
  expect(nextInvoiceNumber(["OTHER-1"], new Date(2026, 0, 5))).toBe("INV-2026-001");

  expect(
    invoiceTotalCents({
      items: [
        { id: "a", description: "x", quantity: 2, unitPriceCents: 125_000 },
        { id: "b", description: "y", quantity: 1.5, unitPriceCents: 40_000 },
      ],
    }),
  ).toBe(310_000);
});

test("validates create invoice input", () => {
  expect(() => validateInvoiceInput(sampleInput())).not.toThrow();
  expect(() => validateInvoiceInput({ ...sampleInput(), clientName: " " })).toThrow(
    "client name is required",
  );
  expect(() => validateInvoiceInput({ ...sampleInput(), items: [] })).toThrow(
    "at least one line item",
  );
  expect(() =>
    validateInvoiceInput({
      ...sampleInput(),
      items: [{ description: "", quantity: 1, unitPriceCents: 100 }],
    }),
  ).toThrow("needs a description");
  expect(() =>
    validateInvoiceInput({
      ...sampleInput(),
      items: [{ description: "x", quantity: 0, unitPriceCents: 100 }],
    }),
  ).toThrow("quantity must be greater than zero");
  expect(() =>
    validateInvoiceInput({
      ...sampleInput(),
      items: [{ description: "x", quantity: 1, unitPriceCents: -5 }],
    }),
  ).toThrow("unit price must be a non-negative integer");
  expect(() => validateInvoiceInput({ ...sampleInput(), currency: "usd" })).toThrow(
    "3-letter code",
  );
  expect(() => validateInvoiceInput({ ...sampleInput(), issueDate: "10/24/2026" })).toThrow(
    "YYYY-MM-DD",
  );
  expect(() => validateInvoiceInput({ ...sampleInput(), issueDate: "2026-02-31" })).toThrow(
    "YYYY-MM-DD",
  );
  expect(() =>
    validateInvoiceInput({
      ...sampleInput(),
      items: [{ description: "x", quantity: 1, unitPriceCents: 100, date: "10/24/2026" }],
    }),
  ).toThrow("line item date must be YYYY-MM-DD");
  expect(() =>
    validateInvoiceInput({
      ...sampleInput(),
      items: [
        {
          description: "x",
          quantity: 1,
          unitPriceCents: 100,
          date: "2026-10-24",
          notes: "Site visit",
        },
      ],
    }),
  ).not.toThrow();
});

test("normalizes documents and line items", () => {
  const doc = normalizeInvoiceDocument();
  expect(isValidInvoiceId(doc.id)).toBe(true);
  expect(doc.status).toBe("draft");
  expect(doc.currency).toBe("USD");
  expect(doc.items).toEqual([]);

  const normalized = normalizeInvoiceDocument({
    id: "abc",
    number: "INV-2026-001",
    clientName: "Acme",
    status: "bogus" as never,
    currency: "eur" as never,
  });
  expect(normalized.id).toBe("abc");
  expect(normalized.number).toBe("INV-2026-001");
  expect(normalized.clientName).toBe("Acme");
  expect(normalized.status).toBe("draft");
  expect(normalized.currency).toBe("USD");

  const item = normalizeInvoiceLineItem({ description: "x", quantity: 0, unitPriceCents: -1 });
  expect(item.id.length).toBeGreaterThan(0);
  expect(item.quantity).toBe(1);
  expect(item.unitPriceCents).toBe(0);
  expect(item.date).toBeUndefined();
  expect(item.notes).toBeUndefined();

  const itemWithDetails = normalizeInvoiceLineItem({
    description: "x",
    quantity: 1,
    unitPriceCents: 100,
    date: "2026-10-25",
    notes: "  Delivered on site  ",
  });
  expect(itemWithDetails.date).toBe("2026-10-25");
  expect(itemWithDetails.notes).toBe("Delivered on site");
});

test("creates, reads, updates and deletes invoices in the rxdb-backed store", async () => {
  const store = await createInvoicesStore({
    name: nextStoreName(),
    storage: getRxStorageMemory(),
  });
  try {
    expect(store.listInvoices()).toEqual([]);

    const created = await store.createInvoice(sampleInput());
    expect(isInvoiceDocument(created)).toBe(true);
    expect(created.number).toMatch(/^INV-\d{4}-001$/);
    expect(created.status).toBe("draft");
    expect(created.items).toHaveLength(2);
    expect(invoiceTotalCents(created)).toBe(310_000);

    const second = await store.createInvoice(sampleInput());
    expect(second.number).not.toBe(created.number);

    expect(store.listInvoices()).toHaveLength(2);
    expect(store.getInvoice(created.id)?.clientName).toBe("Acme Corp");

    const updated = await store.updateInvoice(created.id, {
      clientName: "  Acme Corp  ",
      notes: "Updated notes",
      items: [
        {
          id: "item-1",
          description: "Design work",
          quantity: 2,
          unitPriceCents: 125_000,
          date: "",
          notes: "  Trimmed note  ",
        },
      ],
    });
    expect(updated.clientName).toBe("Acme Corp");
    expect(updated.notes).toBe("Updated notes");
    expect(updated.items[0]?.date).toBeUndefined();
    expect(updated.items[0]?.notes).toBe("Trimmed note");
    expect(updated.updatedAt >= created.updatedAt).toBe(true);

    const paid = await store.setInvoiceStatus(created.id, "paid");
    expect(paid.status).toBe("paid");

    await expect(store.updateInvoice(created.id, { status: "bogus" as never })).rejects.toThrow(
      'Invalid invoice value for "status"',
    );
    await expect(store.updateInvoice(created.id, { items: [] })).rejects.toThrow(
      'Invalid invoice value for "items"',
    );
    await expect(
      store.updateInvoice(created.id, {
        items: [{ id: "1", description: "   ", quantity: 1, unitPriceCents: 100 }],
      }),
    ).rejects.toThrow('Invalid invoice value for "items"');
    await expect(store.updateInvoice("missing", { notes: "x" })).rejects.toThrow(
      "Invoice not found",
    );

    await store.deleteInvoice(created.id);
    expect(store.getInvoice(created.id)).toBeUndefined();
    expect(store.listInvoices()).toHaveLength(1);
    expect(store.listInvoices()[0].id).toBe(second.id);
  } finally {
    await store.close();
  }
});

test("renders a valid PDF document for an invoice", () => {
  const invoice = normalizeInvoiceDocument({
    id: "inv-1",
    number: "INV-2026-001",
    clientName: "Acme Corp",
    clientEmail: "billing@acme.com",
    currency: "USD",
    status: "sent",
    issueDate: "2026-10-01",
    dueDate: "2026-10-31",
    items: [
      { id: "i1", description: "Design work", quantity: 2, unitPriceCents: 125_000 },
      { id: "i2", description: "Tricky (chars) \\ ünïcode", quantity: 1, unitPriceCents: 500 },
    ],
    notes: "Please pay within 30 days.",
    createdAt: "2026-10-01T00:00:00.000Z",
    updatedAt: "2026-10-01T00:00:00.000Z",
  });

  const bytes = renderInvoicePdf(invoice);
  expect(bytes).toBeInstanceOf(Uint8Array);
  const text = new TextDecoder("latin1").decode(bytes);
  expect(text.startsWith("%PDF-1.4")).toBe(true);
  expect(text.trimEnd().endsWith("%%EOF")).toBe(true);
  expect(text).toContain("/Type /Catalog");
  expect(text).toContain("(INVOICE)");
  expect(text).toContain("(INV-2026-001)");
  expect(text).toContain("(Acme Corp)");
  expect(text).toContain("(Design work)");
  expect(text).toContain("($2,500.00)");
  // Reserved PDF string characters are escaped, non-ASCII replaced.
  expect(text).toContain("Tricky \\(chars\\) \\\\");
  expect(text).not.toContain("ünïcode");

  expect(createInvoicePdfFilename(invoice)).toBe("inv-2026-001.pdf");
  expect(createInvoicePdfFilename(normalizeInvoiceDocument({ number: "  " }))).toBe("invoice.pdf");
});

test("renders multi-page PDFs for long invoices", () => {
  const invoice = normalizeInvoiceDocument({
    id: "inv-big",
    number: "INV-2026-042",
    clientName: "Globex",
    currency: "USD",
    status: "draft",
    issueDate: "2026-10-01",
    dueDate: "2026-10-31",
    items: Array.from({ length: 60 }, (_, i) => ({
      id: `item-${i}`,
      description: `Line item ${i + 1}`,
      quantity: 1,
      unitPriceCents: 1_000,
    })),
    createdAt: "2026-10-01T00:00:00.000Z",
    updatedAt: "2026-10-01T00:00:00.000Z",
  });

  const bytes = renderInvoicePdf(invoice);
  const text = new TextDecoder("latin1").decode(bytes);
  expect(text).toContain("/Count 2");
  expect((text.match(/\/Type \/Page[^s]/g) ?? []).length).toBe(2);
  expect(text).toContain("($600.00)");
});

test("sendInvoicePdf falls back to download when sharing is unavailable", async () => {
  const invoice = normalizeInvoiceDocument({
    id: "inv-send",
    number: "INV-2026-007",
    clientName: "Initech",
    currency: "USD",
    status: "draft",
    issueDate: "2026-10-01",
    dueDate: "2026-10-31",
    items: [{ id: "i1", description: "Work", quantity: 1, unitPriceCents: 10_000 }],
    createdAt: "2026-10-01T00:00:00.000Z",
    updatedAt: "2026-10-01T00:00:00.000Z",
  });

  const result = await sendInvoicePdf(invoice);
  expect(result.method).toBe("downloaded");
  expect(result.filename).toBe("inv-2026-007.pdf");
  expect(result.bytes.byteLength).toBeGreaterThan(500);
});

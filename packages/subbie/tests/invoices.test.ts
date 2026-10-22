import { expect, test } from "vite-plus/test";
import {
  formatCurrency,
  invoiceStatusColor,
  invoiceStatusLabel,
  listInvoices,
} from "../src/lib/invoices.ts";

test("formats cents as a currency string", () => {
  expect(formatCurrency(125_000)).toBe("$1,250.00");
  expect(formatCurrency(0)).toBe("$0.00");
});

test("maps invoice statuses to badge colors", () => {
  expect(invoiceStatusColor("paid")).toBe("success");
  expect(invoiceStatusColor("pending")).toBe("warning");
  expect(invoiceStatusColor("overdue")).toBe("danger");
});

test("maps invoice statuses to display labels", () => {
  expect(invoiceStatusLabel("paid")).toBe("Paid");
  expect(invoiceStatusLabel("pending")).toBe("Pending");
  expect(invoiceStatusLabel("overdue")).toBe("Overdue");
});

test("lists invoices with unique ids and valid statuses", () => {
  const invoices = listInvoices();
  expect(invoices.length).toBeGreaterThan(0);
  expect(new Set(invoices.map((invoice) => invoice.id)).size).toBe(invoices.length);
  for (const invoice of invoices) {
    expect(["paid", "pending", "overdue"]).toContain(invoice.status);
  }
});

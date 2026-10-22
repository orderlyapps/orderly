export type InvoiceStatus = "paid" | "pending" | "overdue";

export interface Invoice {
  id: string;
  client: string;
  amountCents: number;
  status: InvoiceStatus;
}

const INVOICE_STATUS_COLORS: Record<InvoiceStatus, string> = {
  paid: "success",
  pending: "warning",
  overdue: "danger",
};

const INVOICE_STATUS_LABELS: Record<InvoiceStatus, string> = {
  paid: "Paid",
  pending: "Pending",
  overdue: "Overdue",
};

export function invoiceStatusColor(status: InvoiceStatus): string {
  return INVOICE_STATUS_COLORS[status];
}

export function invoiceStatusLabel(status: InvoiceStatus): string {
  return INVOICE_STATUS_LABELS[status];
}

export function formatCurrency(amountCents: number, currency = "USD"): string {
  return new Intl.NumberFormat("en-US", { style: "currency", currency }).format(amountCents / 100);
}

export function listInvoices(): Invoice[] {
  return [
    { id: "INV-2026-001", client: "Acme Corp", amountCents: 125_000, status: "paid" },
    { id: "INV-2026-002", client: "Globex Inc", amountCents: 340_000, status: "pending" },
    { id: "INV-2026-003", client: "Initech LLC", amountCents: 78_000, status: "overdue" },
  ];
}

export const INVOICE_STATUSES = ["draft", "sent", "paid", "overdue"] as const;

export type InvoiceStatus = (typeof INVOICE_STATUSES)[number];

export interface InvoiceLineItem {
  id: string;
  description: string;
  quantity: number;
  unitPriceCents: number;
  date?: string;
  notes?: string;
}

export interface InvoiceDocument {
  id: string;
  number: string;
  clientName: string;
  clientEmail: string;
  status: InvoiceStatus;
  issueDate: string;
  dueDate: string;
  items: InvoiceLineItem[];
  gstRate: number;
  notes: string;
  createdAt: string;
  updatedAt: string;
}

export type InvoiceKey = Exclude<keyof InvoiceDocument, "id">;

export type InvoicePatch = Partial<Omit<InvoiceDocument, "id">>;

export interface CreateInvoiceInput {
  clientName: string;
  clientEmail?: string;
  issueDate?: string;
  dueDate?: string;
  items: Array<Omit<InvoiceLineItem, "id">>;
  gstRate?: number;
  notes?: string;
}

export const INVOICE_ID_MAX_LENGTH = 128;

export const INVOICE_NUMBER_MAX_LENGTH = 64;

export const DEFAULT_PAYMENT_TERMS_DAYS = 30;

const INVOICE_STATUS_COLORS: Record<InvoiceStatus, string> = {
  draft: "medium",
  sent: "warning",
  paid: "success",
  overdue: "danger",
};

const INVOICE_STATUS_LABELS: Record<InvoiceStatus, string> = {
  draft: "Draft",
  sent: "Sent",
  paid: "Paid",
  overdue: "Overdue",
};

export function invoiceStatusColor(status: InvoiceStatus): string {
  return INVOICE_STATUS_COLORS[status];
}

export function invoiceStatusLabel(status: InvoiceStatus): string {
  return INVOICE_STATUS_LABELS[status];
}

export function formatAmount(amountCents: number): string {
  return new Intl.NumberFormat("en-AU", { style: "currency", currency: "AUD" }).format(
    amountCents / 100,
  );
}

export function isInvoiceStatus(value: unknown): value is InvoiceStatus {
  return typeof value === "string" && (INVOICE_STATUSES as readonly string[]).includes(value);
}

export function isValidInvoiceId(value: unknown): value is string {
  return typeof value === "string" && value.length > 0 && value.length <= INVOICE_ID_MAX_LENGTH;
}

export function isInvoiceDateString(value: unknown): value is string {
  if (typeof value !== "string") {
    return false;
  }
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) {
    return false;
  }
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  if (month < 1 || month > 12 || day < 1 || day > 31) {
    return false;
  }
  const date = new Date(0);
  date.setFullYear(year, month - 1, day);
  return date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day;
}

export function isInvoiceGstRate(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value) && value >= 0 && value <= 1;
}

export function isNonNegativeInteger(value: unknown): value is number {
  return typeof value === "number" && Number.isInteger(value) && value >= 0;
}

export function isPositiveQuantity(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value) && value > 0;
}

export function isInvoiceLineItem(value: unknown): value is InvoiceLineItem {
  if (typeof value !== "object" || value === null) {
    return false;
  }
  const candidate = value as Record<string, unknown>;
  return (
    typeof candidate.id === "string" &&
    candidate.id.length > 0 &&
    isNonEmptyString(candidate.description) &&
    isPositiveQuantity(candidate.quantity) &&
    isNonNegativeInteger(candidate.unitPriceCents) &&
    (candidate.date === undefined ||
      candidate.date === "" ||
      isInvoiceDateString(candidate.date)) &&
    (candidate.notes === undefined || typeof candidate.notes === "string")
  );
}

export function isInvoiceItems(value: unknown): value is InvoiceLineItem[] {
  return Array.isArray(value) && value.length > 0 && value.every(isInvoiceLineItem);
}

type InvoiceValidatorMap = {
  [K in InvoiceKey]: (value: unknown) => value is InvoiceDocument[K];
};

const isNonEmptyString = (value: unknown): value is string =>
  typeof value === "string" && value.trim().length > 0;

const isStringField = (value: unknown): value is string => typeof value === "string";

const INVOICE_VALIDATORS: InvoiceValidatorMap = {
  number: (value): value is string =>
    typeof value === "string" &&
    value.trim().length > 0 &&
    value.length <= INVOICE_NUMBER_MAX_LENGTH,
  clientName: isNonEmptyString,
  clientEmail: isStringField,
  status: isInvoiceStatus,
  issueDate: isInvoiceDateString,
  dueDate: isInvoiceDateString,
  items: isInvoiceItems,
  gstRate: isInvoiceGstRate,
  notes: isStringField,
  createdAt: isNonEmptyString,
  updatedAt: isNonEmptyString,
};

export const INVOICE_KEYS: readonly InvoiceKey[] = Object.freeze(
  Object.keys(INVOICE_VALIDATORS) as InvoiceKey[],
);

export function isInvoiceValue<K extends InvoiceKey>(
  key: K,
  value: unknown,
): value is InvoiceDocument[K] {
  return INVOICE_VALIDATORS[key](value);
}

export function isInvoiceDocument(value: unknown): value is InvoiceDocument {
  if (typeof value !== "object" || value === null) {
    return false;
  }
  const candidate = value as Record<string, unknown>;
  if (!isValidInvoiceId(candidate.id)) {
    return false;
  }
  return INVOICE_KEYS.every((key) => isInvoiceValue(key, candidate[key]));
}

export function generateDocumentId(): string {
  const cryptoApi = globalThis.crypto as Crypto | undefined;
  if (cryptoApi && typeof cryptoApi.randomUUID === "function") {
    return cryptoApi.randomUUID();
  }
  return `inv_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
}

export function toDateString(date: Date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function addDaysToDateString(dateString: string, days: number): string {
  const [year, month, day] = dateString.split("-").map(Number);
  const date = new Date(year, month - 1, day + days);
  return toDateString(date);
}

export function nextInvoiceNumber(
  existingNumbers: readonly string[],
  date: Date = new Date(),
): string {
  const year = date.getFullYear();
  const prefix = `INV-${year}-`;
  let maxSequence = 0;
  for (const number of existingNumbers) {
    if (typeof number !== "string" || !number.startsWith(prefix)) {
      continue;
    }
    const sequence = Number(number.slice(prefix.length));
    if (Number.isInteger(sequence) && sequence > maxSequence) {
      maxSequence = sequence;
    }
  }
  return `${prefix}${String(maxSequence + 1).padStart(3, "0")}`;
}

export function invoiceTotalCents(invoice: Pick<InvoiceDocument, "items">): number {
  return invoice.items.reduce(
    (total, item) => total + Math.round(item.quantity * item.unitPriceCents),
    0,
  );
}

export function invoiceGstCents(invoice: Pick<InvoiceDocument, "items" | "gstRate">): number {
  if (!isInvoiceGstRate(invoice.gstRate) || invoice.gstRate <= 0) {
    return 0;
  }
  return Math.round(invoiceTotalCents(invoice) * invoice.gstRate);
}

export function invoiceGrandTotalCents(
  invoice: Pick<InvoiceDocument, "items" | "gstRate">,
): number {
  return invoiceTotalCents(invoice) + invoiceGstCents(invoice);
}

export function normalizeInvoiceLineItem(value?: Partial<InvoiceLineItem> | null): InvoiceLineItem {
  const normalized: InvoiceLineItem = {
    id: typeof value?.id === "string" && value.id.length > 0 ? value.id : generateDocumentId(),
    description: typeof value?.description === "string" ? value.description : "",
    quantity: isPositiveQuantity(value?.quantity) ? value.quantity : 1,
    unitPriceCents: isNonNegativeInteger(value?.unitPriceCents) ? value.unitPriceCents : 0,
  };
  if (isInvoiceDateString(value?.date)) {
    normalized.date = value.date;
  }
  if (typeof value?.notes === "string" && value.notes.trim().length > 0) {
    normalized.notes = value.notes.trim();
  }
  return normalized;
}

export function normalizeInvoiceDocument(value?: Partial<InvoiceDocument> | null): InvoiceDocument {
  const now = new Date().toISOString();
  const normalized: InvoiceDocument = {
    id: isValidInvoiceId(value?.id) ? value.id : generateDocumentId(),
    number: "",
    clientName: "",
    clientEmail: "",
    status: "draft",
    issueDate: toDateString(),
    dueDate: addDaysToDateString(toDateString(), DEFAULT_PAYMENT_TERMS_DAYS),
    items: [],
    gstRate: 0,
    notes: "",
    createdAt: now,
    updatedAt: now,
  };
  if (!value) {
    return normalized;
  }
  for (const key of INVOICE_KEYS) {
    const candidate = value[key];
    if (isInvoiceValue(key, candidate)) {
      (normalized as unknown as Record<string, unknown>)[key] = candidate;
    }
  }
  return normalized;
}

export function validateInvoiceInput(input: CreateInvoiceInput): CreateInvoiceInput {
  if (typeof input !== "object" || input === null) {
    throw new Error("Invalid invoice: input must be an object");
  }
  if (!isNonEmptyString(input.clientName)) {
    throw new Error("Invalid invoice: client name is required");
  }
  if (input.clientEmail !== undefined && typeof input.clientEmail !== "string") {
    throw new Error("Invalid invoice: client email must be a string");
  }
  if (input.issueDate !== undefined && !isInvoiceDateString(input.issueDate)) {
    throw new Error("Invalid invoice: issue date must be YYYY-MM-DD");
  }
  if (input.dueDate !== undefined && !isInvoiceDateString(input.dueDate)) {
    throw new Error("Invalid invoice: due date must be YYYY-MM-DD");
  }
  if (!Array.isArray(input.items) || input.items.length === 0) {
    throw new Error("Invalid invoice: at least one line item is required");
  }
  for (const item of input.items) {
    if (!isNonEmptyString(item?.description)) {
      throw new Error("Invalid invoice: every line item needs a description");
    }
    if (!isPositiveQuantity(item.quantity)) {
      throw new Error("Invalid invoice: line item quantity must be greater than zero");
    }
    if (!isNonNegativeInteger(item.unitPriceCents)) {
      throw new Error("Invalid invoice: line item unit price must be a non-negative integer");
    }
    if (item.date !== undefined && item.date !== "" && !isInvoiceDateString(item.date)) {
      throw new Error("Invalid invoice: line item date must be YYYY-MM-DD");
    }
    if (item.notes !== undefined && typeof item.notes !== "string") {
      throw new Error("Invalid invoice: line item notes must be a string");
    }
  }
  if (input.gstRate !== undefined && !isInvoiceGstRate(input.gstRate)) {
    throw new Error("Invalid invoice: GST rate must be a number between 0 and 1");
  }
  if (input.notes !== undefined && typeof input.notes !== "string") {
    throw new Error("Invalid invoice: notes must be a string");
  }
  return input;
}

import { z } from "zod";

import {
  DEFAULT_INVOICE_CURRENCY,
  generateDocumentId,
  isCurrencyCode,
  isInvoiceDateString,
  toDateString,
} from "../invoices/schema.ts";

export const BANK_ID_MAX_LENGTH = 128;

export const BANK_TRANSACTION_TYPES = ["payment", "receipt"] as const;

export type BankTransactionType = (typeof BANK_TRANSACTION_TYPES)[number];

const BANK_TRANSACTION_TYPE_LABELS: Record<BankTransactionType, string> = {
  payment: "Payment",
  receipt: "Receipt",
};

const BANK_TRANSACTION_TYPE_COLORS: Record<BankTransactionType, string> = {
  payment: "danger",
  receipt: "success",
};

export function bankTransactionTypeLabel(type: BankTransactionType): string {
  return BANK_TRANSACTION_TYPE_LABELS[type];
}

export function bankTransactionTypeColor(type: BankTransactionType): string {
  return BANK_TRANSACTION_TYPE_COLORS[type];
}

export function isBankTransactionType(value: unknown): value is BankTransactionType {
  return typeof value === "string" && (BANK_TRANSACTION_TYPES as readonly string[]).includes(value);
}

const nonBlankString = z.string().refine((value) => value.trim().length > 0);

const bankIdSchema = z.string().min(1).max(BANK_ID_MAX_LENGTH);

const currencySchema = z.string().refine((value) => isCurrencyCode(value), {
  error: "currency must be a 3-letter code",
});

const dateStringSchema = z.string().refine((value) => isInvoiceDateString(value), {
  error: "date must be YYYY-MM-DD",
});

const optionalDateStringSchema = z
  .string()
  .refine((value) => value === "" || isInvoiceDateString(value), {
    error: "date must be YYYY-MM-DD",
  });

export const BANK_CSV_COLUMN_ROLES = [
  "ignore",
  "date",
  "description",
  "amount",
  "debit",
  "credit",
  "balance",
] as const;

export type BankCsvColumnRole = (typeof BANK_CSV_COLUMN_ROLES)[number];

const BANK_CSV_COLUMN_ROLE_LABELS: Record<BankCsvColumnRole, string> = {
  ignore: "Ignore",
  date: "Date",
  description: "Description",
  amount: "Amount (Signed)",
  debit: "Debit (Payment)",
  credit: "Credit (Receipt)",
  balance: "Balance",
};

export function bankCsvColumnRoleLabel(role: BankCsvColumnRole): string {
  return BANK_CSV_COLUMN_ROLE_LABELS[role];
}

export function isBankCsvColumnRole(value: unknown): value is BankCsvColumnRole {
  return typeof value === "string" && (BANK_CSV_COLUMN_ROLES as readonly string[]).includes(value);
}

export interface BankCsvPreset {
  hasHeader: boolean;
  dateColumn: string;
  descriptionColumn: string;
  amountColumn: string;
  debitColumn: string;
  creditColumn: string;
  balanceColumn: string;
}

export const DEFAULT_BANK_CSV_PRESET: BankCsvPreset = Object.freeze({
  hasHeader: true,
  dateColumn: "Date",
  descriptionColumn: "Description",
  amountColumn: "Amount",
  debitColumn: "Debit",
  creditColumn: "Credit",
  balanceColumn: "Balance",
});

export const DEFAULT_HEADERLESS_BANK_CSV_PRESET: BankCsvPreset = Object.freeze({
  hasHeader: false,
  dateColumn: "0",
  descriptionColumn: "1",
  amountColumn: "2",
  debitColumn: "",
  creditColumn: "",
  balanceColumn: "3",
});

export const bankCsvPresetSchema = z.object({
  hasHeader: z.boolean(),
  dateColumn: nonBlankString,
  descriptionColumn: nonBlankString,
  amountColumn: z.string(),
  debitColumn: z.string(),
  creditColumn: z.string(),
  balanceColumn: z.string(),
});

function fieldOrDefault<T>(schema: z.ZodType<T>, value: unknown, fallback: T): T {
  const parsed = schema.safeParse(value);
  return parsed.success ? parsed.data : fallback;
}

export function isBankCsvPreset(value: unknown): value is BankCsvPreset {
  return bankCsvPresetSchema.safeParse(value).success;
}

function normalizeHeaderlessColumnIndex(raw: string | undefined, fallback: string): string {
  if (typeof raw !== "string") {
    return fallback;
  }
  const trimmed = raw.trim();
  if (trimmed === "") {
    return "";
  }
  return /^\d+$/.test(trimmed) ? trimmed : fallback;
}

export function normalizeBankCsvPreset(value?: Partial<BankCsvPreset> | null): BankCsvPreset {
  const hasHeader =
    typeof value?.hasHeader === "boolean" ? value.hasHeader : DEFAULT_BANK_CSV_PRESET.hasHeader;

  if (!hasHeader) {
    const debitColumn = normalizeHeaderlessColumnIndex(
      value?.debitColumn,
      DEFAULT_HEADERLESS_BANK_CSV_PRESET.debitColumn,
    );
    const creditColumn = normalizeHeaderlessColumnIndex(
      value?.creditColumn,
      DEFAULT_HEADERLESS_BANK_CSV_PRESET.creditColumn,
    );
    const hasSplitColumns = debitColumn.length > 0 || creditColumn.length > 0;
    const rawAmount = normalizeHeaderlessColumnIndex(
      value?.amountColumn,
      hasSplitColumns ? "" : DEFAULT_HEADERLESS_BANK_CSV_PRESET.amountColumn,
    );
    const allValueColumnsEmpty =
      rawAmount.length === 0 && debitColumn.length === 0 && creditColumn.length === 0;

    return {
      hasHeader: false,
      dateColumn:
        normalizeHeaderlessColumnIndex(
          value?.dateColumn,
          DEFAULT_HEADERLESS_BANK_CSV_PRESET.dateColumn,
        ) || DEFAULT_HEADERLESS_BANK_CSV_PRESET.dateColumn,
      descriptionColumn:
        normalizeHeaderlessColumnIndex(
          value?.descriptionColumn,
          DEFAULT_HEADERLESS_BANK_CSV_PRESET.descriptionColumn,
        ) || DEFAULT_HEADERLESS_BANK_CSV_PRESET.descriptionColumn,
      amountColumn: allValueColumnsEmpty
        ? DEFAULT_HEADERLESS_BANK_CSV_PRESET.amountColumn
        : rawAmount,
      debitColumn,
      creditColumn,
      balanceColumn: normalizeHeaderlessColumnIndex(
        value?.balanceColumn,
        DEFAULT_HEADERLESS_BANK_CSV_PRESET.balanceColumn,
      ),
    };
  }

  const dateColumn =
    typeof value?.dateColumn === "string" &&
    value.dateColumn.trim().length > 0 &&
    !/^\d+$/.test(value.dateColumn.trim())
      ? value.dateColumn.trim()
      : DEFAULT_BANK_CSV_PRESET.dateColumn;
  const descriptionColumn =
    typeof value?.descriptionColumn === "string" &&
    value.descriptionColumn.trim().length > 0 &&
    !/^\d+$/.test(value.descriptionColumn.trim())
      ? value.descriptionColumn.trim()
      : DEFAULT_BANK_CSV_PRESET.descriptionColumn;
  const hasExplicitSplitColumns =
    value?.amountColumn === undefined &&
    ((typeof value?.debitColumn === "string" &&
      value.debitColumn.trim().length > 0 &&
      !/^\d+$/.test(value.debitColumn.trim())) ||
      (typeof value?.creditColumn === "string" &&
        value.creditColumn.trim().length > 0 &&
        !/^\d+$/.test(value.creditColumn.trim())));
  const rawAmountColumn =
    typeof value?.amountColumn === "string" && !/^\d+$/.test(value.amountColumn.trim())
      ? value.amountColumn.trim()
      : hasExplicitSplitColumns
        ? ""
        : DEFAULT_BANK_CSV_PRESET.amountColumn;
  const rawDebitColumn =
    typeof value?.debitColumn === "string" && !/^\d+$/.test(value.debitColumn.trim())
      ? value.debitColumn.trim()
      : DEFAULT_BANK_CSV_PRESET.debitColumn;
  const rawCreditColumn =
    typeof value?.creditColumn === "string" && !/^\d+$/.test(value.creditColumn.trim())
      ? value.creditColumn.trim()
      : DEFAULT_BANK_CSV_PRESET.creditColumn;
  const balanceColumn =
    typeof value?.balanceColumn === "string" && !/^\d+$/.test(value.balanceColumn.trim())
      ? value.balanceColumn.trim()
      : DEFAULT_BANK_CSV_PRESET.balanceColumn;

  const allValueColumnsEmpty =
    rawAmountColumn.length === 0 && rawDebitColumn.length === 0 && rawCreditColumn.length === 0;

  return {
    hasHeader: true,
    dateColumn,
    descriptionColumn,
    amountColumn: allValueColumnsEmpty ? DEFAULT_BANK_CSV_PRESET.amountColumn : rawAmountColumn,
    debitColumn: allValueColumnsEmpty ? DEFAULT_BANK_CSV_PRESET.debitColumn : rawDebitColumn,
    creditColumn: allValueColumnsEmpty ? DEFAULT_BANK_CSV_PRESET.creditColumn : rawCreditColumn,
    balanceColumn,
  };
}

export function mergeBankCsvPreset(
  base: BankCsvPreset,
  patch?: Partial<BankCsvPreset> | null,
): BankCsvPreset {
  if (!patch) {
    return normalizeBankCsvPreset(base);
  }
  if (typeof patch.hasHeader === "boolean" && patch.hasHeader !== base.hasHeader) {
    return normalizeBankCsvPreset(patch);
  }
  const hasPatchSplitColumns =
    (typeof patch.debitColumn === "string" && patch.debitColumn.trim().length > 0) ||
    (typeof patch.creditColumn === "string" && patch.creditColumn.trim().length > 0);
  const hasPatchAmountColumn =
    typeof patch.amountColumn === "string" && patch.amountColumn.trim().length > 0;

  const merged: Partial<BankCsvPreset> = {
    ...base,
    ...patch,
  };
  if (patch.amountColumn === undefined && hasPatchSplitColumns) {
    merged.amountColumn = "";
  } else if (
    patch.debitColumn === undefined &&
    patch.creditColumn === undefined &&
    hasPatchAmountColumn &&
    (!base.hasHeader || base.amountColumn === "")
  ) {
    merged.debitColumn = "";
    merged.creditColumn = "";
  }
  return normalizeBankCsvPreset(merged);
}

export function columnRolesFromPreset(
  preset: Partial<BankCsvPreset>,
  minColumns = 4,
): BankCsvColumnRole[] {
  const roleByIndex = new Map<number, BankCsvColumnRole>();
  let maxIndex = Math.max(0, minColumns - 1);

  const assignIndex = (raw: string | undefined, role: BankCsvColumnRole) => {
    if (typeof raw !== "string") {
      return;
    }
    const trimmed = raw.trim();
    if (/^\d+$/.test(trimmed)) {
      const idx = Number(trimmed);
      roleByIndex.set(idx, role);
      if (idx > maxIndex) {
        maxIndex = idx;
      }
    }
  };

  assignIndex(preset.dateColumn, "date");
  assignIndex(preset.descriptionColumn, "description");
  assignIndex(preset.amountColumn, "amount");
  assignIndex(preset.debitColumn, "debit");
  assignIndex(preset.creditColumn, "credit");
  assignIndex(preset.balanceColumn, "balance");

  if (roleByIndex.size === 0 && preset.dateColumn !== "" && preset.descriptionColumn !== "") {
    const normalized = normalizeBankCsvPreset({ ...preset, hasHeader: false });
    return columnRolesFromPreset(normalized, minColumns);
  }

  return Array.from({ length: maxIndex + 1 }, (_, idx) => roleByIndex.get(idx) ?? "ignore");
}

export function presetFromColumnRoles(roles: readonly BankCsvColumnRole[]): BankCsvPreset {
  const findColumn = (target: BankCsvColumnRole): string => {
    const index = roles.indexOf(target);
    return index === -1 ? "" : String(index);
  };

  return {
    hasHeader: false,
    dateColumn: findColumn("date"),
    descriptionColumn: findColumn("description"),
    amountColumn: findColumn("amount"),
    debitColumn: findColumn("debit"),
    creditColumn: findColumn("credit"),
    balanceColumn: findColumn("balance"),
  };
}

export function assignColumnRole(
  roles: readonly BankCsvColumnRole[],
  columnIndex: number,
  nextRole: BankCsvColumnRole,
): BankCsvColumnRole[] {
  const length = Math.max(roles.length, columnIndex + 1);
  return Array.from({ length }, (_, idx) => {
    const existing = roles[idx] ?? "ignore";
    if (idx === columnIndex) {
      return nextRole;
    }
    if (nextRole !== "ignore" && existing === nextRole) {
      return "ignore";
    }
    return existing;
  });
}

const bankAccountFields = {
  id: bankIdSchema,
  name: nonBlankString,
  institution: z.string(),
  accountNumber: z.string(),
  currency: currencySchema,
  csvPreset: bankCsvPresetSchema,
  notes: z.string(),
  createdAt: nonBlankString,
  updatedAt: nonBlankString,
};

export const bankAccountDocumentSchema = z.object(bankAccountFields);

export const createBankAccountInputSchema = z.object(
  {
    name: z
      .string({ error: "account name is required" })
      .refine((value) => value.trim().length > 0, { error: "account name is required" }),
    institution: z.string({ error: "institution must be a string" }).optional(),
    accountNumber: z.string({ error: "account number must be a string" }).optional(),
    currency: currencySchema.optional(),
    csvPreset: bankCsvPresetSchema.partial().optional(),
    notes: z.string({ error: "notes must be a string" }).optional(),
  },
  { error: "input must be an object" },
);

export type BankAccountDocument = z.infer<typeof bankAccountDocumentSchema>;

export type BankAccountPatch = Partial<Omit<BankAccountDocument, "id" | "csvPreset">> & {
  csvPreset?: Partial<BankCsvPreset>;
};

export type CreateBankAccountInput = z.infer<typeof createBankAccountInputSchema>;

export function isValidBankId(value: unknown): value is string {
  return bankIdSchema.safeParse(value).success;
}

export function isBankAccountDocument(value: unknown): value is BankAccountDocument {
  return bankAccountDocumentSchema.safeParse(value).success;
}

export function normalizeBankAccountDocument(
  value?:
    | (Partial<Omit<BankAccountDocument, "csvPreset">> & { csvPreset?: Partial<BankCsvPreset> })
    | null,
): BankAccountDocument {
  const now = new Date().toISOString();
  return {
    id: fieldOrDefault(bankAccountFields.id, value?.id, generateDocumentId()),
    name: fieldOrDefault(bankAccountFields.name, value?.name, "").trim(),
    institution: fieldOrDefault(bankAccountFields.institution, value?.institution, "").trim(),
    accountNumber: fieldOrDefault(bankAccountFields.accountNumber, value?.accountNumber, "").trim(),
    currency: fieldOrDefault(bankAccountFields.currency, value?.currency, DEFAULT_INVOICE_CURRENCY),
    csvPreset: normalizeBankCsvPreset(value?.csvPreset),
    notes: fieldOrDefault(bankAccountFields.notes, value?.notes, ""),
    createdAt: fieldOrDefault(bankAccountFields.createdAt, value?.createdAt, now),
    updatedAt: fieldOrDefault(bankAccountFields.updatedAt, value?.updatedAt, now),
  };
}

export function validateBankAccountInput(input: CreateBankAccountInput): CreateBankAccountInput {
  const parsed = createBankAccountInputSchema.safeParse(input);
  if (!parsed.success) {
    throw new Error(`Invalid bank account: ${parsed.error.issues[0]?.message ?? "invalid input"}`);
  }
  return parsed.data;
}

const bankCategoryFields = {
  id: bankIdSchema,
  name: nonBlankString,
  type: z.enum(BANK_TRANSACTION_TYPES, {
    error: "category type must be payment or receipt",
  }),
  description: z.string(),
  isDefault: z.boolean(),
  createdAt: nonBlankString,
  updatedAt: nonBlankString,
};

export const bankCategoryDocumentSchema = z.object(bankCategoryFields);

export const createBankCategoryInputSchema = z.object(
  {
    name: z
      .string({ error: "category name is required" })
      .refine((value) => value.trim().length > 0, { error: "category name is required" }),
    type: z.enum(BANK_TRANSACTION_TYPES, {
      error: "category type must be payment or receipt",
    }),
    description: z.string({ error: "description must be a string" }).optional(),
    isDefault: z.boolean({ error: "isDefault must be a boolean" }).optional(),
  },
  { error: "input must be an object" },
);

export type BankCategoryDocument = z.infer<typeof bankCategoryDocumentSchema>;

export type BankCategoryPatch = Partial<Omit<BankCategoryDocument, "id">>;

export type CreateBankCategoryInput = z.infer<typeof createBankCategoryInputSchema>;

export interface DefaultBankCategorySeed {
  id: string;
  name: string;
  type: BankTransactionType;
  description: string;
}

export const DEFAULT_BANK_CATEGORIES: readonly DefaultBankCategorySeed[] = Object.freeze([
  {
    id: "cat_receipt_customer_receipts",
    name: "Customer Receipts",
    type: "receipt",
    description: "Payments received from customers and invoices",
  },
  {
    id: "cat_receipt_other_income",
    name: "Other Income",
    type: "receipt",
    description: "Interest, refunds, and miscellaneous receipts",
  },
  {
    id: "cat_payment_materials_supplies",
    name: "Materials & Supplies",
    type: "payment",
    description: "Raw materials, consumables, and job supplies",
  },
  {
    id: "cat_payment_tools_equipment",
    name: "Tools & Equipment",
    type: "payment",
    description: "Tools, machinery, and equipment purchases or hire",
  },
  {
    id: "cat_payment_subcontractors",
    name: "Subcontractors",
    type: "payment",
    description: "Payments to subcontractors and trade labour",
  },
  {
    id: "cat_payment_vehicle_travel",
    name: "Vehicle & Travel",
    type: "payment",
    description: "Fuel, vehicle maintenance, parking, and travel",
  },
  {
    id: "cat_payment_office_admin",
    name: "Office & Admin",
    type: "payment",
    description: "Software, phone, insurance, and admin expenses",
  },
  {
    id: "cat_payment_tax_government",
    name: "Tax & Government",
    type: "payment",
    description: "GST, BAS, income tax, and registration fees",
  },
]);

export function isBankCategoryDocument(value: unknown): value is BankCategoryDocument {
  return bankCategoryDocumentSchema.safeParse(value).success;
}

export function normalizeBankCategoryDocument(
  value?: Partial<BankCategoryDocument> | null,
): BankCategoryDocument {
  const now = new Date().toISOString();
  return {
    id: fieldOrDefault(bankCategoryFields.id, value?.id, generateDocumentId()),
    name: fieldOrDefault(bankCategoryFields.name, value?.name, "").trim(),
    type: fieldOrDefault(bankCategoryFields.type, value?.type, "payment"),
    description: fieldOrDefault(bankCategoryFields.description, value?.description, "").trim(),
    isDefault: fieldOrDefault(bankCategoryFields.isDefault, value?.isDefault, false),
    createdAt: fieldOrDefault(bankCategoryFields.createdAt, value?.createdAt, now),
    updatedAt: fieldOrDefault(bankCategoryFields.updatedAt, value?.updatedAt, now),
  };
}

export function validateBankCategoryInput(input: CreateBankCategoryInput): CreateBankCategoryInput {
  const parsed = createBankCategoryInputSchema.safeParse(input);
  if (!parsed.success) {
    throw new Error(`Invalid bank category: ${parsed.error.issues[0]?.message ?? "invalid input"}`);
  }
  return parsed.data;
}

const bankStatementFields = {
  id: bankIdSchema,
  accountId: bankIdSchema,
  filename: nonBlankString,
  importedAt: nonBlankString,
  lineCount: z.number().int().nonnegative(),
  startDate: optionalDateStringSchema,
  endDate: optionalDateStringSchema,
  createdAt: nonBlankString,
  updatedAt: nonBlankString,
};

export const bankStatementDocumentSchema = z.object(bankStatementFields);

export type BankStatementDocument = z.infer<typeof bankStatementDocumentSchema>;

export interface CreateBankStatementInput {
  accountId: string;
  filename: string;
  importedAt?: string;
  lineCount?: number;
  startDate?: string;
  endDate?: string;
}

export function isBankStatementDocument(value: unknown): value is BankStatementDocument {
  return bankStatementDocumentSchema.safeParse(value).success;
}

export function normalizeBankStatementDocument(
  value?: Partial<BankStatementDocument> | null,
): BankStatementDocument {
  const now = new Date().toISOString();
  return {
    id: fieldOrDefault(bankStatementFields.id, value?.id, generateDocumentId()),
    accountId: fieldOrDefault(bankStatementFields.accountId, value?.accountId, "").trim(),
    filename: fieldOrDefault(bankStatementFields.filename, value?.filename, "statement.csv").trim(),
    importedAt: fieldOrDefault(bankStatementFields.importedAt, value?.importedAt, now),
    lineCount: fieldOrDefault(bankStatementFields.lineCount, value?.lineCount, 0),
    startDate: fieldOrDefault(bankStatementFields.startDate, value?.startDate, ""),
    endDate: fieldOrDefault(bankStatementFields.endDate, value?.endDate, ""),
    createdAt: fieldOrDefault(bankStatementFields.createdAt, value?.createdAt, now),
    updatedAt: fieldOrDefault(bankStatementFields.updatedAt, value?.updatedAt, now),
  };
}

export interface BankLineAllocation {
  id: string;
  categoryId: string;
  amountCents: number;
  notes?: string;
}

export const bankLineAllocationSchema = z.object({
  id: bankIdSchema,
  categoryId: bankIdSchema,
  amountCents: z.number().int().nonnegative({
    error: "allocation amount must be a non-negative integer",
  }),
  notes: z.string().optional(),
});

export const bankLineAllocationInputSchema = z.object({
  id: bankIdSchema.optional(),
  categoryId: z
    .string({ error: "allocation categoryId is required" })
    .refine((value) => value.trim().length > 0 && value.length <= BANK_ID_MAX_LENGTH, {
      error: "allocation categoryId is required",
    }),
  amountCents: z
    .number({ error: "allocation amount must be a non-negative integer" })
    .refine((value) => Number.isInteger(value) && value >= 0, {
      error: "allocation amount must be a non-negative integer",
    }),
  notes: z.string({ error: "allocation notes must be a string" }).optional(),
});

export type BankLineAllocationInput = z.infer<typeof bankLineAllocationInputSchema>;

export function isBankLineAllocation(value: unknown): value is BankLineAllocation {
  return bankLineAllocationSchema.safeParse(value).success;
}

export function normalizeBankLineAllocation(
  value?: Partial<BankLineAllocation> | null,
): BankLineAllocation {
  const normalized: BankLineAllocation = {
    id:
      typeof value?.id === "string" && value.id.trim().length > 0
        ? value.id.trim()
        : generateDocumentId(),
    categoryId: typeof value?.categoryId === "string" ? value.categoryId.trim() : "",
    amountCents:
      typeof value?.amountCents === "number" &&
      Number.isInteger(value.amountCents) &&
      value.amountCents >= 0
        ? value.amountCents
        : 0,
  };
  if (typeof value?.notes === "string" && value.notes.trim().length > 0) {
    normalized.notes = value.notes.trim();
  }
  return normalized;
}

const bankStatementLineFields = {
  id: bankIdSchema,
  statementId: z.string(),
  accountId: bankIdSchema,
  date: dateStringSchema,
  description: nonBlankString,
  type: z.enum(BANK_TRANSACTION_TYPES, {
    error: "line type must be payment or receipt",
  }),
  amountCents: z.number().int().nonnegative(),
  balanceCents: z.number().int().optional(),
  invoiceIds: z.array(bankIdSchema),
  allocations: z.array(bankLineAllocationSchema),
  notes: z.string(),
  createdAt: nonBlankString,
  updatedAt: nonBlankString,
};

export const bankStatementLineDocumentSchema = z.object(bankStatementLineFields);

export const createBankStatementLineInputSchema = z.object(
  {
    statementId: z.string({ error: "statementId must be a string" }).optional(),
    accountId: z
      .string({ error: "accountId is required" })
      .refine((value) => value.trim().length > 0 && value.length <= BANK_ID_MAX_LENGTH, {
        error: "accountId is required",
      }),
    date: dateStringSchema,
    description: z
      .string({ error: "description is required" })
      .refine((value) => value.trim().length > 0, { error: "description is required" }),
    type: z.enum(BANK_TRANSACTION_TYPES, {
      error: "line type must be payment or receipt",
    }),
    amountCents: z
      .number({ error: "amount must be a non-negative integer" })
      .refine((value) => Number.isInteger(value) && value >= 0, {
        error: "amount must be a non-negative integer",
      }),
    balanceCents: z
      .number({ error: "balance must be an integer" })
      .refine((value) => Number.isInteger(value), { error: "balance must be an integer" })
      .optional(),
    invoiceIds: z.array(bankIdSchema).optional(),
    allocations: z.array(bankLineAllocationInputSchema).optional(),
    notes: z.string({ error: "notes must be a string" }).optional(),
  },
  { error: "input must be an object" },
);

export type BankStatementLineDocument = z.infer<typeof bankStatementLineDocumentSchema>;

export type BankStatementLinePatch = Partial<
  Omit<BankStatementLineDocument, "id" | "allocations">
> & {
  allocations?: BankLineAllocationInput[];
};

export type CreateBankStatementLineInput = z.infer<typeof createBankStatementLineInputSchema>;

export function isBankStatementLineDocument(value: unknown): value is BankStatementLineDocument {
  return bankStatementLineDocumentSchema.safeParse(value).success;
}

export function normalizeBankStatementLineDocument(
  value?:
    | (Partial<Omit<BankStatementLineDocument, "allocations">> & {
        allocations?: Array<Partial<BankLineAllocation>>;
      })
    | null,
): BankStatementLineDocument {
  const now = new Date().toISOString();
  const normalized: BankStatementLineDocument = {
    id: fieldOrDefault(bankStatementLineFields.id, value?.id, generateDocumentId()),
    statementId: fieldOrDefault(bankStatementLineFields.statementId, value?.statementId, "").trim(),
    accountId: fieldOrDefault(bankStatementLineFields.accountId, value?.accountId, "").trim(),
    date: fieldOrDefault(bankStatementLineFields.date, value?.date, toDateString()),
    description: fieldOrDefault(bankStatementLineFields.description, value?.description, "").trim(),
    type: fieldOrDefault(bankStatementLineFields.type, value?.type, "payment"),
    amountCents: fieldOrDefault(bankStatementLineFields.amountCents, value?.amountCents, 0),
    invoiceIds: Array.isArray(value?.invoiceIds)
      ? Array.from(
          new Set(
            value.invoiceIds
              .filter((id): id is string => typeof id === "string" && id.trim().length > 0)
              .map((id) => id.trim()),
          ),
        )
      : [],
    allocations: Array.isArray(value?.allocations)
      ? value.allocations
          .map((entry) => normalizeBankLineAllocation(entry))
          .filter((entry) => entry.categoryId.length > 0)
      : [],
    notes: fieldOrDefault(bankStatementLineFields.notes, value?.notes, ""),
    createdAt: fieldOrDefault(bankStatementLineFields.createdAt, value?.createdAt, now),
    updatedAt: fieldOrDefault(bankStatementLineFields.updatedAt, value?.updatedAt, now),
  };
  if (typeof value?.balanceCents === "number" && Number.isInteger(value.balanceCents)) {
    normalized.balanceCents = value.balanceCents;
  }
  return normalized;
}

export function validateBankStatementLineInput(
  input: CreateBankStatementLineInput,
): CreateBankStatementLineInput {
  const parsed = createBankStatementLineInputSchema.safeParse(input);
  if (!parsed.success) {
    throw new Error(
      `Invalid bank statement line: ${parsed.error.issues[0]?.message ?? "invalid input"}`,
    );
  }
  const totalAllocated = (parsed.data.allocations ?? []).reduce(
    (sum, item) => sum + item.amountCents,
    0,
  );
  if (totalAllocated > parsed.data.amountCents) {
    throw new Error("Invalid bank statement line: allocated total exceeds line amount");
  }
  return parsed.data;
}

export function signedStatementLineAmountCents(
  line: Pick<BankStatementLineDocument, "type" | "amountCents">,
): number {
  return line.type === "payment" ? -line.amountCents : line.amountCents;
}

export function allocatedAmountCents(line: Pick<BankStatementLineDocument, "allocations">): number {
  return line.allocations.reduce((total, entry) => total + entry.amountCents, 0);
}

export function unallocatedAmountCents(
  line: Pick<BankStatementLineDocument, "amountCents" | "allocations">,
): number {
  return Math.max(0, line.amountCents - allocatedAmountCents(line));
}

export function isLineFullyAllocated(
  line: Pick<BankStatementLineDocument, "amountCents" | "allocations">,
): boolean {
  return line.allocations.length > 0 && allocatedAmountCents(line) === line.amountCents;
}

export interface BankingCashFlowSummary {
  currency: string;
  receiptCount: number;
  paymentCount: number;
  totalReceiptsCents: number;
  totalPaymentsCents: number;
  netCashFlowCents: number;
}

export interface BankingCategorisationSummary {
  totalLines: number;
  categorisedLines: number;
  partiallyCategorisedLines: number;
  uncategorisedLines: number;
  needsAttentionLines: number;
  linkedInvoiceLineCount: number;
  totalAllocatedCents: number;
  totalUnallocatedCents: number;
  completionPercent: number;
}

export interface BankAccountOverviewItem {
  account: BankAccountDocument;
  statementCount: number;
  lineCount: number;
  totalReceiptsCents: number;
  totalPaymentsCents: number;
  netCashFlowCents: number;
  latestBalanceCents?: number;
  latestTransactionDate?: string;
  uncategorisedLineCount: number;
}

export interface BankCategoryOverviewItem {
  category: BankCategoryDocument;
  allocationCount: number;
  lineCount: number;
  allocatedCents: number;
  currency: string;
}

export interface SummarizeBankingOverviewInput {
  accounts: readonly BankAccountDocument[];
  categories: readonly BankCategoryDocument[];
  statements: readonly BankStatementDocument[];
  statementLines: readonly BankStatementLineDocument[];
}

export interface BankingOverviewSummary {
  currency: string;
  cashFlow: BankingCashFlowSummary;
  cashFlowByCurrency: BankingCashFlowSummary[];
  categorisation: BankingCategorisationSummary;
  accountSummaries: BankAccountOverviewItem[];
  categorySummaries: BankCategoryOverviewItem[];
  totalAccounts: number;
  totalCategories: number;
  paymentCategoryCount: number;
  receiptCategoryCount: number;
  totalStatements: number;
  totalLines: number;
}

function compareStatementLinesNewestFirst(
  a: BankStatementLineDocument,
  b: BankStatementLineDocument,
): number {
  if (a.date !== b.date) {
    return a.date < b.date ? 1 : -1;
  }
  if (a.createdAt !== b.createdAt) {
    return a.createdAt < b.createdAt ? 1 : -1;
  }
  return a.id.localeCompare(b.id);
}

export function summarizeBankingOverview(
  input: SummarizeBankingOverviewInput,
): BankingOverviewSummary {
  const primaryCurrency = input.accounts[0]?.currency ?? DEFAULT_INVOICE_CURRENCY;
  const accountById = new Map(input.accounts.map((account) => [account.id, account]));
  const sortedLines = [...input.statementLines].sort(compareStatementLinesNewestFirst);

  let receiptCount = 0;
  let paymentCount = 0;
  let totalReceiptsCents = 0;
  let totalPaymentsCents = 0;

  const cashFlowByCurrencyMap = new Map<string, BankingCashFlowSummary>();
  const ensureCurrencyBucket = (currency: string): BankingCashFlowSummary => {
    const existing = cashFlowByCurrencyMap.get(currency);
    if (existing) {
      return existing;
    }
    const created: BankingCashFlowSummary = {
      currency,
      receiptCount: 0,
      paymentCount: 0,
      totalReceiptsCents: 0,
      totalPaymentsCents: 0,
      netCashFlowCents: 0,
    };
    cashFlowByCurrencyMap.set(currency, created);
    return created;
  };

  for (const account of input.accounts) {
    ensureCurrencyBucket(account.currency);
  }

  let categorisedLines = 0;
  let partiallyCategorisedLines = 0;
  let uncategorisedLines = 0;
  let linkedInvoiceLineCount = 0;
  let totalAllocatedCents = 0;
  let totalUnallocatedCents = 0;

  for (const line of sortedLines) {
    const lineCurrency = accountById.get(line.accountId)?.currency ?? primaryCurrency;
    const bucket = ensureCurrencyBucket(lineCurrency);

    if (line.type === "receipt") {
      receiptCount += 1;
      totalReceiptsCents += line.amountCents;
      bucket.receiptCount += 1;
      bucket.totalReceiptsCents += line.amountCents;
    } else {
      paymentCount += 1;
      totalPaymentsCents += line.amountCents;
      bucket.paymentCount += 1;
      bucket.totalPaymentsCents += line.amountCents;
    }
    bucket.netCashFlowCents = bucket.totalReceiptsCents - bucket.totalPaymentsCents;

    const allocated = allocatedAmountCents(line);
    const unallocated = unallocatedAmountCents(line);
    totalAllocatedCents += allocated;
    totalUnallocatedCents += unallocated;

    if (isLineFullyAllocated(line)) {
      categorisedLines += 1;
    } else if (line.allocations.length > 0) {
      partiallyCategorisedLines += 1;
    } else {
      uncategorisedLines += 1;
    }

    if (line.invoiceIds.length > 0) {
      linkedInvoiceLineCount += 1;
    }
  }

  const cashFlow: BankingCashFlowSummary = {
    currency: primaryCurrency,
    receiptCount,
    paymentCount,
    totalReceiptsCents,
    totalPaymentsCents,
    netCashFlowCents: totalReceiptsCents - totalPaymentsCents,
  };

  const cashFlowByCurrency =
    cashFlowByCurrencyMap.size > 0 ? [...cashFlowByCurrencyMap.values()] : [cashFlow];

  const totalLines = sortedLines.length;
  const needsAttentionLines = uncategorisedLines + partiallyCategorisedLines;
  const completionPercent =
    totalLines === 0 ? 100 : Math.round((categorisedLines / totalLines) * 100);

  const accountSummaries: BankAccountOverviewItem[] = input.accounts.map((account) => {
    const accountStatements = input.statements.filter((stmt) => stmt.accountId === account.id);
    const accountLines = sortedLines.filter((line) => line.accountId === account.id);
    let accReceipts = 0;
    let accPayments = 0;
    let uncategorisedLineCount = 0;

    for (const line of accountLines) {
      if (line.type === "receipt") {
        accReceipts += line.amountCents;
      } else {
        accPayments += line.amountCents;
      }
      if (!isLineFullyAllocated(line)) {
        uncategorisedLineCount += 1;
      }
    }

    const latestLineWithBalance = accountLines.find(
      (line) => typeof line.balanceCents === "number",
    );
    const summary: BankAccountOverviewItem = {
      account,
      statementCount: accountStatements.length,
      lineCount: accountLines.length,
      totalReceiptsCents: accReceipts,
      totalPaymentsCents: accPayments,
      netCashFlowCents: accReceipts - accPayments,
      uncategorisedLineCount,
    };
    if (latestLineWithBalance?.balanceCents !== undefined) {
      summary.latestBalanceCents = latestLineWithBalance.balanceCents;
    }
    if (accountLines[0]?.date) {
      summary.latestTransactionDate = accountLines[0].date;
    }
    return summary;
  });

  const categorySummaries: BankCategoryOverviewItem[] = input.categories
    .map((category) => {
      let allocationCount = 0;
      let lineCount = 0;
      let allocatedCents = 0;
      let matchedCurrency: string | undefined;

      for (const line of sortedLines) {
        const matching = line.allocations.filter((entry) => entry.categoryId === category.id);
        if (matching.length > 0) {
          lineCount += 1;
          allocationCount += matching.length;
          for (const entry of matching) {
            allocatedCents += entry.amountCents;
          }
          if (!matchedCurrency) {
            matchedCurrency = accountById.get(line.accountId)?.currency;
          }
        }
      }

      return {
        category,
        allocationCount,
        lineCount,
        allocatedCents,
        currency: matchedCurrency ?? primaryCurrency,
      };
    })
    .sort(
      (a, b) =>
        b.allocatedCents - a.allocatedCents ||
        b.lineCount - a.lineCount ||
        a.category.name.localeCompare(b.category.name),
    );

  const paymentCategoryCount = input.categories.filter((cat) => cat.type === "payment").length;
  const receiptCategoryCount = input.categories.filter((cat) => cat.type === "receipt").length;

  return {
    currency: primaryCurrency,
    cashFlow,
    cashFlowByCurrency,
    categorisation: {
      totalLines,
      categorisedLines,
      partiallyCategorisedLines,
      uncategorisedLines,
      needsAttentionLines,
      linkedInvoiceLineCount,
      totalAllocatedCents,
      totalUnallocatedCents,
      completionPercent,
    },
    accountSummaries,
    categorySummaries,
    totalAccounts: input.accounts.length,
    totalCategories: input.categories.length,
    paymentCategoryCount,
    receiptCategoryCount,
    totalStatements: input.statements.length,
    totalLines,
  };
}

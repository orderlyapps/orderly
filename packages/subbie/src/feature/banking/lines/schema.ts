import { z } from "zod";

import { generateDocumentId, toDateString } from "../../invoices/schema.ts";
import type { BankCategoryDocument } from "../categories/schema.ts";
import {
  BANK_ID_MAX_LENGTH,
  BANK_TRANSACTION_TYPES,
  bankIdSchema,
  dateStringSchema,
  fieldOrDefault,
  nonBlankString,
} from "../types.ts";
import {
  bankLineAllocationInputSchema,
  bankLineAllocationSchema,
  isLineFullyAllocated,
  normalizeBankLineAllocation,
  type BankLineAllocation,
  type BankLineAllocationInput,
} from "./gst.ts";

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
  isPrivate: z.boolean(),
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
    isPrivate: z.boolean({ error: "isPrivate must be a boolean" }).optional(),
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
  const isPrivate = fieldOrDefault(bankStatementLineFields.isPrivate, value?.isPrivate, false);
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
    allocations:
      !isPrivate && Array.isArray(value?.allocations)
        ? value.allocations
            .map((entry) => normalizeBankLineAllocation(entry))
            .filter((entry) => entry.categoryId.length > 0)
        : [],
    isPrivate,
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
  for (const item of parsed.data.allocations ?? []) {
    if (item.gstFreeAmountCents !== undefined && item.gstFreeAmountCents > item.amountCents) {
      throw new Error(
        "Invalid bank statement line: GST free amount cannot exceed allocation amount",
      );
    }
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

export const BANKING_LINE_CATEGORISATION_FILTERS = [
  "all",
  "categorised",
  "partially-categorised",
  "uncategorised",
  "private",
] as const;

export type BankingLineCategorisationFilter = (typeof BANKING_LINE_CATEGORISATION_FILTERS)[number];

export function isBankingLineCategorisationFilter(
  value: unknown,
): value is BankingLineCategorisationFilter {
  return (
    typeof value === "string" &&
    (BANKING_LINE_CATEGORISATION_FILTERS as readonly string[]).includes(value)
  );
}

export const BANKING_LINE_TYPE_FILTERS = ["all", "payment", "receipt"] as const;

export type BankingLineTypeFilter = (typeof BANKING_LINE_TYPE_FILTERS)[number];

export function isBankingLineTypeFilter(value: unknown): value is BankingLineTypeFilter {
  return (
    typeof value === "string" && (BANKING_LINE_TYPE_FILTERS as readonly string[]).includes(value)
  );
}

export interface FilterStatementLinesOptions {
  accountId?: string;
  categorisation?: BankingLineCategorisationFilter;
  type?: BankingLineTypeFilter;
  categoryId?: string;
  searchQuery?: string;
  categories?: readonly BankCategoryDocument[];
}

export function filterStatementLines(
  lines: readonly BankStatementLineDocument[],
  options: FilterStatementLinesOptions = {},
): BankStatementLineDocument[] {
  const accountId = options.accountId?.trim() ?? "";
  const categorisation = options.categorisation ?? "all";
  const type = options.type ?? "all";
  const categoryId = options.categoryId?.trim() ?? "";
  const searchQuery = options.searchQuery?.trim().toLowerCase() ?? "";
  const categoryNameById =
    searchQuery.length > 0 && options.categories
      ? new Map(options.categories.map((cat) => [cat.id, cat.name.toLowerCase()]))
      : null;

  return lines.filter((line) => {
    if (accountId.length > 0 && line.accountId !== accountId) {
      return false;
    }
    if (type !== "all" && line.type !== type) {
      return false;
    }
    switch (categorisation) {
      case "categorised":
        if (!line.isPrivate && !isLineFullyAllocated(line)) {
          return false;
        }
        break;
      case "partially-categorised":
        if (line.isPrivate || line.allocations.length === 0 || isLineFullyAllocated(line)) {
          return false;
        }
        break;
      case "uncategorised":
        if (line.isPrivate || line.allocations.length > 0) {
          return false;
        }
        break;
      case "private":
        if (!line.isPrivate) {
          return false;
        }
        break;
      default:
        break;
    }
    if (
      categoryId.length > 0 &&
      !line.allocations.some((allocation) => allocation.categoryId === categoryId)
    ) {
      return false;
    }
    if (searchQuery.length > 0) {
      const matchesDescription = line.description.toLowerCase().includes(searchQuery);
      const matchesDate = line.date.toLowerCase().includes(searchQuery);
      const matchesNotes = line.notes.toLowerCase().includes(searchQuery);
      const matchesAllocation = line.allocations.some((allocation) => {
        const categoryName = categoryNameById?.get(allocation.categoryId) ?? "";
        const allocNotes = allocation.notes?.toLowerCase() ?? "";
        return categoryName.includes(searchQuery) || allocNotes.includes(searchQuery);
      });
      if (!matchesDescription && !matchesDate && !matchesNotes && !matchesAllocation) {
        return false;
      }
    }
    return true;
  });
}

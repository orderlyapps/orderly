import { z } from "zod";

import { generateDocumentId } from "../../invoices/schema.ts";
import { BANK_ID_MAX_LENGTH, bankIdSchema, type BankTransactionType } from "../types.ts";

export const BANK_GST_RATE = 0.1;

export const BANK_GST_TYPES = ["gst", "gst-free", "part-gst"] as const;

export type BankGstType = (typeof BANK_GST_TYPES)[number];

const BANK_GST_TYPE_LABELS: Record<BankGstType, string> = {
  gst: "GST",
  "gst-free": "GST Free",
  "part-gst": "Part GST",
};

export function bankGstTypeLabel(type: BankGstType): string {
  return BANK_GST_TYPE_LABELS[type];
}

export function isBankGstType(value: unknown): value is BankGstType {
  return typeof value === "string" && (BANK_GST_TYPES as readonly string[]).includes(value);
}

export function bankGstRateLabel(gstRate: number): string {
  const percent = Math.round(gstRate * 10000) / 100;
  return `${percent}%`;
}

export interface BankLineAllocation {
  id: string;
  categoryId: string;
  amountCents: number;
  gstType?: BankGstType;
  gstFreeAmountCents?: number;
  notes?: string;
}

export const bankLineAllocationSchema = z.object({
  id: bankIdSchema,
  categoryId: bankIdSchema,
  amountCents: z.number().int().nonnegative({
    error: "allocation amount must be a non-negative integer",
  }),
  gstType: z.enum(BANK_GST_TYPES).optional(),
  gstFreeAmountCents: z
    .number()
    .int()
    .nonnegative({
      error: "GST free amount must be a non-negative integer",
    })
    .optional(),
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
  gstType: z
    .enum(BANK_GST_TYPES, {
      error: "allocation gstType must be gst, gst-free, or part-gst",
    })
    .optional(),
  gstFreeAmountCents: z
    .number({ error: "GST free amount must be a non-negative integer" })
    .refine((value) => Number.isInteger(value) && value >= 0, {
      error: "GST free amount must be a non-negative integer",
    })
    .optional(),
  notes: z.string({ error: "allocation notes must be a string" }).optional(),
});

export type BankLineAllocationInput = z.infer<typeof bankLineAllocationInputSchema>;

export function isBankLineAllocation(value: unknown): value is BankLineAllocation {
  return bankLineAllocationSchema.safeParse(value).success;
}

export function normalizeBankLineAllocation(
  value?: Partial<BankLineAllocation> | null,
): BankLineAllocation {
  const amountCents =
    typeof value?.amountCents === "number" &&
    Number.isInteger(value.amountCents) &&
    value.amountCents >= 0
      ? value.amountCents
      : 0;
  const normalized: BankLineAllocation = {
    id:
      typeof value?.id === "string" && value.id.trim().length > 0
        ? value.id.trim()
        : generateDocumentId(),
    categoryId: typeof value?.categoryId === "string" ? value.categoryId.trim() : "",
    amountCents,
  };
  if (isBankGstType(value?.gstType)) {
    normalized.gstType = value.gstType;
    if (value.gstType === "part-gst") {
      const rawGstFree =
        typeof value.gstFreeAmountCents === "number" &&
        Number.isInteger(value.gstFreeAmountCents) &&
        value.gstFreeAmountCents >= 0
          ? value.gstFreeAmountCents
          : 0;
      normalized.gstFreeAmountCents = Math.min(amountCents, rawGstFree);
    }
  }
  if (typeof value?.notes === "string" && value.notes.trim().length > 0) {
    normalized.notes = value.notes.trim();
  }
  return normalized;
}

export function signedStatementLineAmountCents(line: {
  type: BankTransactionType;
  amountCents: number;
}): number {
  return line.type === "payment" ? -line.amountCents : line.amountCents;
}

export function allocatedAmountCents(line: {
  allocations: readonly Pick<BankLineAllocation, "amountCents">[];
}): number {
  return line.allocations.reduce((total, entry) => total + entry.amountCents, 0);
}

export function unallocatedAmountCents(line: {
  amountCents: number;
  allocations: readonly Pick<BankLineAllocation, "amountCents">[];
}): number {
  return Math.max(0, line.amountCents - allocatedAmountCents(line));
}

export function isLineFullyAllocated(line: {
  amountCents: number;
  allocations: readonly Pick<BankLineAllocation, "amountCents">[];
}): boolean {
  return line.allocations.length > 0 && allocatedAmountCents(line) === line.amountCents;
}

export function allocationGstFreeAmountCents(
  allocation: Pick<BankLineAllocation, "amountCents" | "gstType" | "gstFreeAmountCents">,
): number {
  const gstType = allocation.gstType ?? "gst";
  if (gstType === "gst-free") {
    return allocation.amountCents;
  }
  if (gstType === "part-gst") {
    const raw =
      typeof allocation.gstFreeAmountCents === "number" &&
      Number.isInteger(allocation.gstFreeAmountCents) &&
      allocation.gstFreeAmountCents >= 0
        ? allocation.gstFreeAmountCents
        : 0;
    return Math.min(allocation.amountCents, raw);
  }
  return 0;
}

export function allocationTaxableAmountCents(
  allocation: Pick<BankLineAllocation, "amountCents" | "gstType" | "gstFreeAmountCents">,
): number {
  return Math.max(0, allocation.amountCents - allocationGstFreeAmountCents(allocation));
}

export function calculateGstFromInclusiveCents(
  taxableInclusiveCents: number,
  gstRate = BANK_GST_RATE,
): number {
  if (!Number.isFinite(taxableInclusiveCents) || taxableInclusiveCents <= 0 || gstRate <= 0) {
    return 0;
  }
  if (gstRate === BANK_GST_RATE) {
    return Math.round(taxableInclusiveCents / 11);
  }
  return Math.round((taxableInclusiveCents * gstRate) / (1 + gstRate));
}

export function allocationGstAmountCents(
  allocation: Pick<BankLineAllocation, "amountCents" | "gstType" | "gstFreeAmountCents">,
  gstRate = BANK_GST_RATE,
): number {
  return calculateGstFromInclusiveCents(allocationTaxableAmountCents(allocation), gstRate);
}

export function allocationNetAmountCents(
  allocation: Pick<BankLineAllocation, "amountCents" | "gstType" | "gstFreeAmountCents">,
  gstRate = BANK_GST_RATE,
): number {
  return Math.max(0, allocation.amountCents - allocationGstAmountCents(allocation, gstRate));
}

export function lineGstAmountCents(
  line: {
    allocations: readonly Pick<
      BankLineAllocation,
      "amountCents" | "gstType" | "gstFreeAmountCents"
    >[];
  },
  gstRate = BANK_GST_RATE,
): number {
  return line.allocations.reduce(
    (total, allocation) => total + allocationGstAmountCents(allocation, gstRate),
    0,
  );
}

export function lineGstFreeAmountCents(line: {
  allocations: readonly Pick<
    BankLineAllocation,
    "amountCents" | "gstType" | "gstFreeAmountCents"
  >[];
}): number {
  return line.allocations.reduce(
    (total, allocation) => total + allocationGstFreeAmountCents(allocation),
    0,
  );
}

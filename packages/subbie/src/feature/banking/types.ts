import { z } from "zod";

import { isCurrencyCode, isInvoiceDateString } from "../invoices/schema.ts";

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

export const nonBlankString = z.string().refine((value) => value.trim().length > 0);

export const bankIdSchema = z.string().min(1).max(BANK_ID_MAX_LENGTH);

export const currencySchema = z.string().refine((value) => isCurrencyCode(value), {
  error: "currency must be a 3-letter code",
});

export const dateStringSchema = z.string().refine((value) => isInvoiceDateString(value), {
  error: "date must be YYYY-MM-DD",
});

export const optionalDateStringSchema = z
  .string()
  .refine((value) => value === "" || isInvoiceDateString(value), {
    error: "date must be YYYY-MM-DD",
  });

export function isValidBankId(value: unknown): value is string {
  return bankIdSchema.safeParse(value).success;
}

export function fieldOrDefault<T>(schema: z.ZodType<T>, value: unknown, fallback: T): T {
  const parsed = schema.safeParse(value);
  return parsed.success ? parsed.data : fallback;
}

export function pluralize(count: number, singular: string, plural = `${singular}s`): string {
  return `${count} ${count === 1 ? singular : plural}`;
}

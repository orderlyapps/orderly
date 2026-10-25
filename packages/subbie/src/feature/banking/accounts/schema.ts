import { z } from "zod";

import { DEFAULT_INVOICE_CURRENCY, generateDocumentId } from "../../invoices/schema.ts";
import {
  bankCsvPresetSchema,
  normalizeBankCsvPreset,
  type BankCsvPreset,
} from "../statements/schema.ts";
import { bankIdSchema, currencySchema, fieldOrDefault, nonBlankString } from "../types.ts";

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

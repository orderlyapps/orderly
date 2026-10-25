import { z } from "zod";

import { generateDocumentId } from "../../invoices/schema.ts";
import {
  BANK_TRANSACTION_TYPES,
  bankIdSchema,
  fieldOrDefault,
  nonBlankString,
  type BankTransactionType,
} from "../types.ts";

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

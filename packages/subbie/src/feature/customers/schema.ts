import { z } from "zod";

import { generateDocumentId } from "../invoices/schema.ts";

export const CUSTOMER_ID_MAX_LENGTH = 128;

const nonBlankString = z.string().refine((value) => value.trim().length > 0);

const customerIdSchema = z.string().min(1).max(CUSTOMER_ID_MAX_LENGTH);

const customerFields = {
  id: customerIdSchema,
  name: nonBlankString,
  email: z.string(),
  phone: z.string(),
  notes: z.string(),
  createdAt: nonBlankString,
  updatedAt: nonBlankString,
};

export const customerDocumentSchema = z.object(customerFields);

export const createCustomerInputSchema = z.object(
  {
    name: z
      .string({ error: "name is required" })
      .refine((value) => value.trim().length > 0, { error: "name is required" }),
    email: z.string({ error: "email must be a string" }).optional(),
    phone: z.string({ error: "phone must be a string" }).optional(),
    notes: z.string({ error: "notes must be a string" }).optional(),
  },
  { error: "input must be an object" },
);

export type CustomerDocument = z.infer<typeof customerDocumentSchema>;

export type CustomerPatch = Partial<Omit<CustomerDocument, "id">>;

export type CreateCustomerInput = z.infer<typeof createCustomerInputSchema>;

export function isValidCustomerId(value: unknown): value is string {
  return customerIdSchema.safeParse(value).success;
}

export function isCustomerDocument(value: unknown): value is CustomerDocument {
  return customerDocumentSchema.safeParse(value).success;
}

function fieldOrDefault<T>(schema: z.ZodType<T>, value: unknown, fallback: T): T {
  const parsed = schema.safeParse(value);
  return parsed.success ? parsed.data : fallback;
}

export function normalizeCustomerDocument(
  value?: Partial<CustomerDocument> | null,
): CustomerDocument {
  const now = new Date().toISOString();
  return {
    id: fieldOrDefault(customerFields.id, value?.id, generateDocumentId()),
    name: fieldOrDefault(customerFields.name, value?.name, "").trim(),
    email: fieldOrDefault(customerFields.email, value?.email, "").trim(),
    phone: fieldOrDefault(customerFields.phone, value?.phone, "").trim(),
    notes: fieldOrDefault(customerFields.notes, value?.notes, ""),
    createdAt: fieldOrDefault(customerFields.createdAt, value?.createdAt, now),
    updatedAt: fieldOrDefault(customerFields.updatedAt, value?.updatedAt, now),
  };
}

export function validateCustomerInput(input: CreateCustomerInput): CreateCustomerInput {
  const parsed = createCustomerInputSchema.safeParse(input);
  if (!parsed.success) {
    throw new Error(`Invalid customer: ${parsed.error.issues[0]?.message ?? "invalid input"}`);
  }
  return parsed.data;
}

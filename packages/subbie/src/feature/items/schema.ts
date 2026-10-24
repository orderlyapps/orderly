import { z } from "zod";

import { generateDocumentId } from "../invoices/schema.ts";

export const ITEM_ID_MAX_LENGTH = 128;

const nonBlankString = z.string().refine((value) => value.trim().length > 0);

const itemIdSchema = z.string().min(1).max(ITEM_ID_MAX_LENGTH);

const itemFields = {
  id: itemIdSchema,
  name: nonBlankString,
  description: z.string(),
  unitPriceCents: z.number().int().nonnegative(),
  unit: z.string(),
  createdAt: nonBlankString,
  updatedAt: nonBlankString,
};

export const itemDocumentSchema = z.object(itemFields);

export const createItemInputSchema = z.object(
  {
    name: z
      .string({ error: "name is required" })
      .refine((value) => value.trim().length > 0, { error: "name is required" }),
    description: z.string({ error: "description must be a string" }).optional(),
    unitPriceCents: z
      .number({ error: "unit price must be a non-negative integer" })
      .refine((value) => Number.isInteger(value) && value >= 0, {
        error: "unit price must be a non-negative integer",
      }),
    unit: z.string({ error: "unit must be a string" }).optional(),
  },
  { error: "input must be an object" },
);

export type ItemDocument = z.infer<typeof itemDocumentSchema>;

export type ItemPatch = Partial<Omit<ItemDocument, "id">>;

export type CreateItemInput = z.infer<typeof createItemInputSchema>;

export function isValidItemId(value: unknown): value is string {
  return itemIdSchema.safeParse(value).success;
}

export function isItemDocument(value: unknown): value is ItemDocument {
  return itemDocumentSchema.safeParse(value).success;
}

function fieldOrDefault<T>(schema: z.ZodType<T>, value: unknown, fallback: T): T {
  const parsed = schema.safeParse(value);
  return parsed.success ? parsed.data : fallback;
}

export function normalizeItemDocument(value?: Partial<ItemDocument> | null): ItemDocument {
  const now = new Date().toISOString();
  return {
    id: fieldOrDefault(itemFields.id, value?.id, generateDocumentId()),
    name: fieldOrDefault(itemFields.name, value?.name, "").trim(),
    description: fieldOrDefault(itemFields.description, value?.description, "").trim(),
    unitPriceCents: fieldOrDefault(itemFields.unitPriceCents, value?.unitPriceCents, 0),
    unit: fieldOrDefault(itemFields.unit, value?.unit, "").trim(),
    createdAt: fieldOrDefault(itemFields.createdAt, value?.createdAt, now),
    updatedAt: fieldOrDefault(itemFields.updatedAt, value?.updatedAt, now),
  };
}

export function validateItemInput(input: CreateItemInput): CreateItemInput {
  const parsed = createItemInputSchema.safeParse(input);
  if (!parsed.success) {
    throw new Error(`Invalid item: ${parsed.error.issues[0]?.message ?? "invalid input"}`);
  }
  return parsed.data;
}

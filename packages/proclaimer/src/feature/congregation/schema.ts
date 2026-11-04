import { z } from "zod";

export const CONGREGATION_TABLE = "congregation";

export const CONGREGATION_NAME_MAX_LENGTH = 128;

export const congregationRowIdSchema = z.string().min(1);

export const congregationNameSchema = z.string().min(1).max(CONGREGATION_NAME_MAX_LENGTH);

// Mirrors the Supabase "congregation" table:
// - Real congregations (those actually using the app) have NO congregation_id (null/undefined)
// - Congregations WITH a congregation_id are "placeholder" congregations created by a real
//   congregation to reference a congregation that is NOT using the app
export const congregationSchema = z.object({
  id: congregationRowIdSchema.optional(),
  name: congregationNameSchema,
  congregation_id: congregationRowIdSchema.nullish(),
  password: z.string().nullish(),
});

export type Congregation = z.infer<typeof congregationSchema>;

export function isCongregationRowId(value: unknown): value is string {
  return congregationRowIdSchema.safeParse(value).success;
}

export function isCongregationName(value: unknown): value is string {
  return congregationNameSchema.safeParse(value).success;
}

export function isCongregation(value: unknown): value is Congregation {
  return congregationSchema.safeParse(value).success;
}

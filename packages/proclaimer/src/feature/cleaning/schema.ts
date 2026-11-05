import { z } from "zod";

export const CLEAN_MAJOR_TABLE = "clean_major";
export const CLEAN_MINOR_TABLE = "clean_minor";
export const GROUP_TABLE = "group";

// Mirrors the Supabase "clean_major"/"clean_minor" tables
// (per-congregation, keyed by week_id + congregation_id)
export const cleaningAssignmentSchema = z.object({
  week_id: z.string(),
  congregation_id: z.uuid(),
  group_id: z.uuid(),
});

export type CleaningAssignmentRow = z.infer<typeof cleaningAssignmentSchema>;

// Mirrors the Supabase "group" table (field service groups)
export const groupSchema = z.object({
  id: z.uuid(),
  congregation_id: z.uuid().nullable().default(null),
  name: z.string(),
});

export type GroupRow = z.infer<typeof groupSchema>;

import { z } from "zod";

export const REPORT_TABLE = "report";

// Mirrors the Supabase "report" table: one field-service report per publisher
// per service month. `confidential_id` is the publisher id and `date` is the
// first of the report month.
/**
 * Hour credits a pioneer can claim alongside ministry hours — stored as a
 * jsonb object of credit type to hours. The catchall keeps unknown keys
 * intact (including `school`, the legacy credit type written by the previous
 * app) so edits can't silently drop credits this version doesn't know about;
 * `school` is never displayed or counted.
 */
export const creditHoursSchema = z
  .object({
    ldc: z.number(),
    bethel: z.number(),
    hlc: z.number(),
    pioneer_school: z.number(),
    elders_school: z.number(),
  })
  .partial()
  .catchall(z.number());

/** Legacy credit type kept in stored data but excluded from display and totals. */
export const LEGACY_SCHOOL_CREDIT = "school";

export type CreditHours = z.infer<typeof creditHoursSchema>;

/** Credit types the report editor offers, in display order. */
export const CREDIT_HOUR_FIELDS = [
  { key: "ldc", label: "LDC" },
  { key: "bethel", label: "Bethel" },
  { key: "hlc", label: "HLC" },
  { key: "pioneer_school", label: "Pioneer school" },
  { key: "elders_school", label: "Elders school" },
] as const;

export const CREDIT_HOUR_LABELS: Record<string, string> = Object.fromEntries(
  CREDIT_HOUR_FIELDS.map(({ key, label }) => [key, label]),
);

export const reportSchema = z.object({
  confidential_id: z.uuid(),
  congregation_id: z.uuid(),
  date: z.string(),
  active: z.boolean(),
  hours: z.number().nullable().default(null),
  bible_studies: z.number().nullable().default(null),
  // `.catch(null)` keeps a malformed value (e.g. non-numeric entries written
  // by another client) from failing the whole report row's parse.
  credit_hours: creditHoursSchema.nullable().default(null).catch(null),
  aux_pio: z.boolean().default(false),
  reg_pio: z.boolean().default(false),
  spe_pio: z.boolean().default(false),
  reported_elsewhere: z.boolean().default(false),
});

export type Report = z.infer<typeof reportSchema>;

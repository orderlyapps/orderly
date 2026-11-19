import { z } from "zod";

export const REPORT_TABLE = "report";

// Mirrors the Supabase "report" table: one field-service report per publisher
// per service month. `confidential_id` is the publisher id and `date` is the
// first of the report month.
export const reportSchema = z.object({
  confidential_id: z.uuid(),
  congregation_id: z.uuid(),
  date: z.string(),
  active: z.boolean(),
  hours: z.number().nullable().default(null),
  bible_studies: z.number().nullable().default(null),
});

export type Report = z.infer<typeof reportSchema>;

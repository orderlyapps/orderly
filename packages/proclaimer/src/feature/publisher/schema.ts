import { z } from "zod";

export const PUBLISHER_TABLE = "publisher";

export const publisherRowIdSchema = z.string().min(1);

export const publisherStandingSchema = z.enum([
  "elder",
  "ministerial_servant",
  "publisher",
  "unbaptised_publisher",
  "associate",
  "congregation",
  "other",
]);

export type PublisherStanding = z.infer<typeof publisherStandingSchema>;

export const publisherTypeSchema = z.enum([
  "publisher",
  "unbaptised_publisher",
  "regular_pioneer",
  "special_pioneer",
  "continuous_auxiliary",
  "inactive",
  "speaker",
  "associate",
  "removed",
  "circuit_overseer",
  "congregation",
  "child",
  "spouse",
]);

export type PublisherType = z.infer<typeof publisherTypeSchema>;

// Mirrors the Supabase "publisher" table
export const publisherSchema = z.object({
  id: publisherRowIdSchema.optional(),
  first_name: z.string(),
  middle_name: z.string().nullish(),
  last_name: z.string(),
  display_name: z.string().nullish(),
  congregation_id: z.string().nullish(),
  // DB columns are unconstrained text shared with other apps; unknown values
  // fall back to null so the row is kept instead of dropped.
  standing: publisherStandingSchema.nullish().catch(null),
  type: publisherTypeSchema.nullish().catch(null),
  gender: z.enum(["male", "female"]).nullish(),
  group_id: z.string().nullish(),
  family_id: z.string().nullish(),
  archived_at: z.string().nullish(),
  auth_id: z.string().nullish(),
});

export type Publisher = z.infer<typeof publisherSchema>;

export function isPublisherRowId(value: unknown): value is string {
  return publisherRowIdSchema.safeParse(value).success;
}

export function getPublisherDisplayName(publisher: Publisher): string {
  const first =
    typeof publisher.display_name === "string" && publisher.display_name.trim().length > 0
      ? publisher.display_name
      : publisher.first_name;
  return `${publisher.last_name}, ${first}`;
}

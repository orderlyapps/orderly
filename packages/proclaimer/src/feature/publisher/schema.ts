import { z } from "zod";

export const PUBLISHER_TABLE = "publisher";

export const publisherRowIdSchema = z.string().min(1);

// Mirrors the Supabase "publisher" table
export const publisherSchema = z.object({
  id: publisherRowIdSchema.optional(),
  first_name: z.string(),
  middle_name: z.string().nullish(),
  last_name: z.string(),
  display_name: z.string().nullish(),
  congregation_id: z.string().nullish(),
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

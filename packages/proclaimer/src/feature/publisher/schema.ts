export const PUBLISHER_TABLE = "publisher";

// Mirrors the Supabase "publisher" table
export type Publisher = {
  id?: string;
  first_name: string;
  middle_name?: string | null;
  last_name: string;
  display_name?: string | null;
  congregation_id?: string | null;
  auth_id?: string | null;
};

export function isPublisherRowId(value: unknown): value is string {
  return typeof value === "string" && value.length > 0;
}

export function getPublisherDisplayName(publisher: Publisher): string {
  const first =
    typeof publisher.display_name === "string" && publisher.display_name.trim().length > 0
      ? publisher.display_name
      : publisher.first_name;
  return `${publisher.last_name}, ${first}`;
}

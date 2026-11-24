import { z } from "zod";

import { mapSearchable } from "../maps/schema.ts";

export const MAP_TAG_TABLE = "map_tag";
export const MAP_TAG_ASSIGNMENT_TABLE = "map_tag_assignment";

// Mirrors the Supabase "map_tag" table: named tags a congregation can assign
// to its maps. Names are unique per congregation.
export const mapTagRowSchema = z.object({
  id: z.string().min(1).optional(),
  congregation_id: z.string().min(1),
  name: z.string(),
});

export type MapTagRow = z.infer<typeof mapTagRowSchema>;

// Mirrors "map_tag_assignment": one row per tag assigned to a map.
export const mapTagAssignmentRowSchema = z.object({
  id: z.string().min(1).optional(),
  map_id: z.string().min(1),
  tag_id: z.string().min(1),
});

export type MapTagAssignmentRow = z.infer<typeof mapTagAssignmentRowSchema>;

// Alphabetical ordering for tag pickers and lists, matching the numeric
// ordering used for map and block names.
export function sortMapTags(tags: MapTagRow[] | null | undefined): MapTagRow[] {
  return [...(tags ?? [])].sort((a, b) =>
    a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: "base" }),
  );
}

// Alphanumeric-normalized lookup (shared with map search) so a "New Tag"
// entry reuses an existing tag whose name differs only by case, punctuation,
// or diacritics instead of creating a near-duplicate.
export function findMapTagByName(
  tags: MapTagRow[] | null | undefined,
  name: string,
): MapTagRow | null {
  const needle = mapSearchable(name);
  if (!needle) {
    return null;
  }
  return (tags ?? []).find((tag) => mapSearchable(tag.name) === needle) ?? null;
}

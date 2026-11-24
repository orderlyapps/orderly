import { createSupabaseTableCollection, getCachedCollection } from "../../backend/collections.ts";
import {
  MAP_TAG_ASSIGNMENT_TABLE,
  MAP_TAG_TABLE,
  mapTagAssignmentRowSchema,
  mapTagRowSchema,
  type MapTagAssignmentRow,
  type MapTagRow,
} from "./schema.ts";

export function createMapTagCollection(congregationId: string) {
  return createSupabaseTableCollection<MapTagRow>({
    table: MAP_TAG_TABLE,
    id: `${MAP_TAG_TABLE}:${congregationId}`,
    select: "id,congregation_id,name",
    match: { congregation_id: congregationId },
    schema: mapTagRowSchema,
  });
}

export type MapTagCollection = ReturnType<typeof createMapTagCollection>;

export function createMapTagAssignmentCollection(mapId: string) {
  return createSupabaseTableCollection<MapTagAssignmentRow>({
    table: MAP_TAG_ASSIGNMENT_TABLE,
    id: `${MAP_TAG_ASSIGNMENT_TABLE}:${mapId}`,
    select: "id,map_id,tag_id",
    match: { map_id: mapId },
    keyColumns: ["map_id", "tag_id"],
    schema: mapTagAssignmentRowSchema,
  });
}

export type MapTagAssignmentCollection = ReturnType<typeof createMapTagAssignmentCollection>;

// Matches the composite getKey in createSupabaseTableCollection for
// keyColumns ["map_id", "tag_id"]
export function mapTagAssignmentKey(mapId: string, tagId: string): string {
  return JSON.stringify([mapId, tagId]);
}

const defaultTagCollections = new Map<string, MapTagCollection>();
const defaultAssignmentCollections = new Map<string, MapTagAssignmentCollection>();

export function getMapTagCollection(congregationId: string): MapTagCollection {
  const key = congregationId.trim();
  return getCachedCollection(defaultTagCollections, key, () => createMapTagCollection(key));
}

export function getMapTagAssignmentCollection(mapId: string): MapTagAssignmentCollection {
  const key = mapId.trim();
  return getCachedCollection(defaultAssignmentCollections, key, () =>
    createMapTagAssignmentCollection(key),
  );
}

export async function resetMapTagCollectionsForTesting(): Promise<void> {
  const collections = [...defaultTagCollections.values(), ...defaultAssignmentCollections.values()];
  defaultTagCollections.clear();
  defaultAssignmentCollections.clear();
  await Promise.all(collections.map((collection) => collection.cleanup().catch(() => {})));
}

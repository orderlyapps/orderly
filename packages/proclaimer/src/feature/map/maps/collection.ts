import { createSupabaseTableCollection, getCachedCollection } from "../../backend/collections.ts";
import { MAP_TABLE, mapRowSchema, type MapRow } from "./schema.ts";

export function createMapCollection(congregationId: string) {
  return createSupabaseTableCollection<MapRow>({
    table: MAP_TABLE,
    id: `${MAP_TABLE}:${congregationId}`,
    select: "id,congregation_id,name,details,url,boundary,blocks",
    match: { congregation_id: congregationId },
    schema: mapRowSchema,
  });
}

export type MapCollection = ReturnType<typeof createMapCollection>;

const defaultCollections = new Map<string, MapCollection>();

export function getMapCollection(congregationId: string): MapCollection {
  const key = congregationId.trim();
  return getCachedCollection(defaultCollections, key, () => createMapCollection(key));
}

export async function resetMapCollectionsForTesting(): Promise<void> {
  const collections = [...defaultCollections.values()];
  defaultCollections.clear();
  await Promise.all(collections.map((collection) => collection.cleanup().catch(() => {})));
}

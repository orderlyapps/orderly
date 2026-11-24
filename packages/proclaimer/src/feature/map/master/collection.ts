import { createSupabaseTableCollection, getCachedCollection } from "../../backend/collections.ts";
import { MAP_MASTER_TABLE, mapMasterRowSchema, type MapMasterRow } from "./schema.ts";

export function createMapMasterCollection(congregationId: string) {
  return createSupabaseTableCollection<MapMasterRow>({
    table: MAP_MASTER_TABLE,
    id: `${MAP_MASTER_TABLE}:${congregationId}`,
    select: "congregation_id,boundary,details",
    match: { congregation_id: congregationId },
    idColumn: "congregation_id",
    schema: mapMasterRowSchema,
  });
}

export type MapMasterCollection = ReturnType<typeof createMapMasterCollection>;

const defaultCollections = new Map<string, MapMasterCollection>();

export function getMapMasterCollection(congregationId: string): MapMasterCollection {
  const key = congregationId.trim();
  return getCachedCollection(defaultCollections, key, () => createMapMasterCollection(key));
}

export async function resetMapMasterCollectionsForTesting(): Promise<void> {
  const collections = [...defaultCollections.values()];
  defaultCollections.clear();
  await Promise.all(collections.map((collection) => collection.cleanup().catch(() => {})));
}

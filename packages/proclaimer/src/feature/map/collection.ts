import { createSupabaseTableCollection, getCachedCollection } from "../backend/collections.ts";
import {
  MAP_MASTER_TABLE,
  TERRITORY_MAP_TABLE,
  mapMasterSchema,
  territoryMapSchema,
  type MapMasterRow,
  type TerritoryMap,
} from "./territory.ts";

export function createTerritoryMapCollection(congregationId: string) {
  return createSupabaseTableCollection<TerritoryMap>({
    table: TERRITORY_MAP_TABLE,
    id: `${TERRITORY_MAP_TABLE}:${congregationId}`,
    select: "id,congregation_id,name,details,url,boundary,blocks",
    match: { congregation_id: congregationId },
    schema: territoryMapSchema,
  });
}

export type TerritoryMapCollection = ReturnType<typeof createTerritoryMapCollection>;

export function createMapMasterCollection(congregationId: string) {
  return createSupabaseTableCollection<MapMasterRow>({
    table: MAP_MASTER_TABLE,
    id: `${MAP_MASTER_TABLE}:${congregationId}`,
    select: "congregation_id,boundary,details",
    match: { congregation_id: congregationId },
    keyColumns: ["congregation_id"],
    schema: mapMasterSchema,
  });
}

export type MapMasterCollection = ReturnType<typeof createMapMasterCollection>;

const territoryMapCollections = new Map<string, TerritoryMapCollection>();
const mapMasterCollections = new Map<string, MapMasterCollection>();

export function getTerritoryMapCollection(congregationId: string): TerritoryMapCollection {
  const key = congregationId.trim();
  return getCachedCollection(territoryMapCollections, key, () => createTerritoryMapCollection(key));
}

export function getMapMasterCollection(congregationId: string): MapMasterCollection {
  const key = congregationId.trim();
  return getCachedCollection(mapMasterCollections, key, () => createMapMasterCollection(key));
}

export async function resetTerritoryCollectionsForTesting(): Promise<void> {
  const collections = [...territoryMapCollections.values(), ...mapMasterCollections.values()];
  territoryMapCollections.clear();
  mapMasterCollections.clear();
  await Promise.all(collections.map((collection) => collection.cleanup().catch(() => {})));
}

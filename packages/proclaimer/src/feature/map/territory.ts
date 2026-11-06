import { z } from "zod";

export const TERRITORY_MAP_TABLE = "map";
export const MAP_MASTER_TABLE = "map_master";

/** A `[longitude, latitude]` position as stored in the jsonb boundary columns. */
export const territoryPositionSchema = z.tuple([z.number(), z.number()]);

export type TerritoryPosition = z.infer<typeof territoryPositionSchema>;

export const territoryBlockSchema = z.object({
  id: z.string(),
  name: z.string(),
  type: z.enum(["face", "block"]),
  coordinates: z.array(territoryPositionSchema),
});

export type TerritoryBlock = z.infer<typeof territoryBlockSchema>;

// Mirrors the Supabase "map" table: a territory card with an outline and
// optional street blocks ("block" polygons / "face" street lines) inside it.
export const territoryMapSchema = z.object({
  id: z.string().optional(),
  congregation_id: z.string(),
  name: z.string(),
  details: z.string().nullish(),
  url: z.string().nullish(),
  boundary: z.array(territoryPositionSchema).nullable(),
  blocks: z.array(territoryBlockSchema).nullable(),
});

export type TerritoryMap = z.infer<typeof territoryMapSchema>;

// Mirrors the Supabase "map_master" table: a single outline per congregation
// bounding its whole territory. `boundary` is loose jsonb, validated at render.
export const mapMasterSchema = z.object({
  congregation_id: z.string(),
  boundary: z.unknown(),
  details: z.string().nullish(),
});

export type MapMasterRow = z.infer<typeof mapMasterSchema>;

// Minimal GeoJSON shapes understood by the map layers. Kept local so the
// package doesn't need @types/geojson; structurally compatible with mapbox-gl.
export type TerritoryGeometry =
  | { type: "Polygon"; coordinates: number[][][] }
  | { type: "LineString"; coordinates: number[][] };

export interface TerritoryFeature<P> {
  type: "Feature";
  geometry: TerritoryGeometry;
  properties: P;
}

export interface TerritoryFeatureCollection<P> {
  type: "FeatureCollection";
  features: TerritoryFeature<P>[];
}

export interface MasterBoundaryProperties {
  details: string | null;
}

export interface TerritoryMapProperties {
  id: string | null;
  name: string;
  details: string | null;
}

export interface TerritoryBlockProperties {
  id: string;
  name: string;
  kind: TerritoryBlock["type"];
  mapId: string | null;
}

export interface TerritoryGeoJson {
  master: TerritoryFeatureCollection<MasterBoundaryProperties>;
  maps: TerritoryFeatureCollection<TerritoryMapProperties>;
  blocks: TerritoryFeatureCollection<TerritoryBlockProperties>;
}

export const EMPTY_TERRITORY_GEOJSON: TerritoryGeoJson = {
  master: { type: "FeatureCollection", features: [] },
  maps: { type: "FeatureCollection", features: [] },
  blocks: { type: "FeatureCollection", features: [] },
};

/** `[sw, ne]` corner pair, assignable to mapbox's `LngLatBoundsLike`. */
export type TerritoryBounds = [[number, number], [number, number]];

export function isTerritoryRing(value: unknown): value is TerritoryPosition[] {
  return (
    Array.isArray(value) &&
    value.length > 0 &&
    value.every(
      (point) =>
        Array.isArray(point) &&
        point.length >= 2 &&
        typeof point[0] === "number" &&
        typeof point[1] === "number",
    )
  );
}

function withClosedRing(ring: TerritoryPosition[]): TerritoryPosition[] {
  const first = ring[0];
  const last = ring[ring.length - 1];
  return first[0] === last[0] && first[1] === last[1] ? ring : [...ring, first];
}

/** Polygon geometry from a stored ring; needs at least 4 positions. */
export function ringToPolygon(ring: unknown): TerritoryGeometry | null {
  if (!isTerritoryRing(ring) || ring.length < 4) {
    return null;
  }
  return { type: "Polygon", coordinates: [withClosedRing(ring)] };
}

/** Polygon geometry for a block; a triangle (3 positions) is enough. */
export function blockToPolygon(ring: unknown): TerritoryGeometry | null {
  if (!isTerritoryRing(ring) || ring.length < 3) {
    return null;
  }
  return { type: "Polygon", coordinates: [withClosedRing(ring)] };
}

/** LineString geometry for a "face" block (one side of a street). */
export function blockToLineString(ring: unknown): TerritoryGeometry | null {
  if (!isTerritoryRing(ring) || ring.length < 2) {
    return null;
  }
  return { type: "LineString", coordinates: ring };
}

export function ringBounds(ring: unknown): TerritoryBounds | null {
  if (!isTerritoryRing(ring)) {
    return null;
  }
  let west = Infinity;
  let south = Infinity;
  let east = -Infinity;
  let north = -Infinity;
  for (const [lng, lat] of ring) {
    if (lng < west) west = lng;
    if (lng > east) east = lng;
    if (lat < south) south = lat;
    if (lat > north) north = lat;
  }
  return [
    [west, south],
    [east, north],
  ];
}

export function unionBounds(
  a: TerritoryBounds | null,
  b: TerritoryBounds | null,
): TerritoryBounds | null {
  if (!a) return b;
  if (!b) return a;
  return [
    [Math.min(a[0][0], b[0][0]), Math.min(a[0][1], b[0][1])],
    [Math.max(a[1][0], b[1][0]), Math.max(a[1][1], b[1][1])],
  ];
}

function geometryBounds(geometry: TerritoryGeometry): TerritoryBounds | null {
  return ringBounds(geometry.type === "Polygon" ? geometry.coordinates[0] : geometry.coordinates);
}

/** Bounds for one territory map row: its boundary, or any drawn blocks. */
export function territoryMapBounds(territoryMap: TerritoryMap): TerritoryBounds | null {
  let bounds = ringBounds(territoryMap.boundary);
  for (const block of territoryMap.blocks ?? []) {
    bounds = unionBounds(bounds, ringBounds(block.coordinates));
  }
  return bounds;
}

/** Bounds covering every feature across all three collections, or null when empty. */
export function geoJsonBounds(geojson: TerritoryGeoJson): TerritoryBounds | null {
  let bounds: TerritoryBounds | null = null;
  for (const collection of [geojson.master, geojson.maps, geojson.blocks]) {
    for (const feature of collection.features) {
      bounds = unionBounds(bounds, geometryBounds(feature.geometry));
    }
  }
  return bounds;
}

/** Projects stored rows into the three feature collections rendered on the map. */
export function buildTerritoryGeoJson(
  maps: TerritoryMap[],
  masterRows: MapMasterRow[],
): TerritoryGeoJson {
  const master: TerritoryFeature<MasterBoundaryProperties>[] = [];
  const mapFeatures: TerritoryFeature<TerritoryMapProperties>[] = [];
  const blockFeatures: TerritoryFeature<TerritoryBlockProperties>[] = [];

  for (const row of masterRows) {
    const geometry = ringToPolygon(row.boundary);
    if (geometry) {
      master.push({
        type: "Feature",
        geometry,
        properties: { details: row.details ?? null },
      });
    }
  }

  for (const row of maps) {
    const geometry = ringToPolygon(row.boundary);
    if (geometry) {
      mapFeatures.push({
        type: "Feature",
        geometry,
        properties: { id: row.id ?? null, name: row.name, details: row.details ?? null },
      });
    }
    for (const block of row.blocks ?? []) {
      const blockGeometry =
        block.type === "face"
          ? blockToLineString(block.coordinates)
          : blockToPolygon(block.coordinates);
      if (blockGeometry) {
        blockFeatures.push({
          type: "Feature",
          geometry: blockGeometry,
          properties: {
            id: block.id,
            name: block.name,
            kind: block.type,
            mapId: row.id ?? null,
          },
        });
      }
    }
  }

  return {
    master: { type: "FeatureCollection", features: master },
    maps: { type: "FeatureCollection", features: mapFeatures },
    blocks: { type: "FeatureCollection", features: blockFeatures },
  };
}

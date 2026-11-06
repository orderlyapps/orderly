import { z } from "zod";

export const MAP_TABLE = "map";

export const MAP_POLYGON_COLOR = "#9ca3af";
export const MAP_SELECTED_COLOR = "#ef4444";
export const MAP_VERTEX_MIN_ZOOM = 14;
export const MAP_LABEL_MIN_ZOOM = MAP_VERTEX_MIN_ZOOM - 2;
export const MAP_LINE_MIN_ZOOM = MAP_VERTEX_MIN_ZOOM - 2;

const coordinateSchema = z.tuple([z.number(), z.number()]);

export const mapBoundarySchema = z.array(coordinateSchema);

export type MapBoundary = z.infer<typeof mapBoundarySchema>;

export const mapBlockSchema = z.object({
  id: z.string(),
  name: z.string(),
  type: z.enum(["face", "block"]),
  coordinates: z.array(coordinateSchema),
});

export type MapBlock = z.infer<typeof mapBlockSchema>;

// Mirrors the Supabase "map" table: one row per territory map belonging to a
// congregation. `boundary` is a closed ring of [lng, lat] coordinates; `blocks`
// subdivides the map into named street blocks.
export const mapRowSchema = z.object({
  id: z.string().min(1).optional(),
  congregation_id: z.string().min(1),
  name: z.string(),
  details: z.string().nullish(),
  url: z.string().nullish(),
  boundary: mapBoundarySchema.nullish(),
  blocks: z.array(mapBlockSchema).nullish(),
});

export type MapRow = z.infer<typeof mapRowSchema>;

// [west, south, east, north] — assignable to mapbox-gl's LngLatBoundsLike.
export type MapBounds = [minLng: number, minLat: number, maxLng: number, maxLat: number];

export type MapPolygonFeature = {
  type: "Feature";
  geometry: { type: "Polygon"; coordinates: number[][][] };
  properties: { id: string | null; name: string; details: string | null };
};

export type MapPolygonsGeoJSON = {
  type: "FeatureCollection";
  features: MapPolygonFeature[];
};

export function isValidBoundary(boundary: unknown): boundary is MapBoundary {
  return mapBoundarySchema.safeParse(boundary).success && (boundary as MapBoundary).length > 0;
}

export function isClosedRing(boundary: MapBoundary): boolean {
  if (boundary.length < 4) {
    return false;
  }
  const first = boundary[0];
  const last = boundary[boundary.length - 1];
  return first[0] === last[0] && first[1] === last[1];
}

export function ensureClosedRing(boundary: MapBoundary): MapBoundary {
  return isClosedRing(boundary) ? boundary : [...boundary, boundary[0]];
}

export function boundaryToBounds(boundary: unknown): MapBounds | null {
  if (!isValidBoundary(boundary) || boundary.length < 4) {
    return null;
  }
  let minLng = boundary[0][0];
  let maxLng = boundary[0][0];
  let minLat = boundary[0][1];
  let maxLat = boundary[0][1];
  for (const [lng, lat] of boundary) {
    if (lng < minLng) minLng = lng;
    if (lng > maxLng) maxLng = lng;
    if (lat < minLat) minLat = lat;
    if (lat > maxLat) maxLat = lat;
  }
  return [minLng, minLat, maxLng, maxLat];
}

export function boundariesToBounds(boundaries: unknown[]): MapBounds | null {
  let minLng = Infinity;
  let maxLng = -Infinity;
  let minLat = Infinity;
  let maxLat = -Infinity;
  let found = false;
  for (const boundary of boundaries) {
    const bounds = boundaryToBounds(boundary);
    if (!bounds) {
      continue;
    }
    found = true;
    minLng = Math.min(minLng, bounds[0]);
    minLat = Math.min(minLat, bounds[1]);
    maxLng = Math.max(maxLng, bounds[2]);
    maxLat = Math.max(maxLat, bounds[3]);
  }
  return found ? [minLng, minLat, maxLng, maxLat] : null;
}

export function boundaryToPolygonCoords(boundary: unknown): number[][][] | null {
  if (!isValidBoundary(boundary) || boundary.length < 4) {
    return null;
  }
  return [ensureClosedRing(boundary)];
}

// Stable identifier for a map row, matching the expression used by map styles
// to look up a feature: `id` when present, otherwise `name`.
export function mapRowKey(row: MapRow): string {
  return row.id ?? row.name;
}

// Letters/digits only, so queries match names like "Map #4" or "Café" without
// typing punctuation or diacritics.
const mapSearchable = (value: string) =>
  value
    .normalize("NFD")
    .replace(/[^\p{L}\p{N}]/gu, "")
    .toLowerCase();

// Sorts rows alphabetically by name, then keeps those whose name or details
// contain the alphanumeric-normalized query.
export function filterMapRows(rows: MapRow[], query: string): MapRow[] {
  const sorted = [...rows].sort((a, b) =>
    a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: "base" }),
  );
  const needle = mapSearchable(query);
  if (!needle) {
    return sorted;
  }
  return sorted.filter((row) => mapSearchable(`${row.name} ${row.details ?? ""}`).includes(needle));
}

export function mapRowToFeature(row: MapRow): MapPolygonFeature | null {
  const coordinates = boundaryToPolygonCoords(row.boundary);
  if (!coordinates) {
    return null;
  }
  return {
    type: "Feature",
    geometry: { type: "Polygon", coordinates },
    properties: { id: row.id ?? null, name: row.name, details: row.details ?? null },
  };
}

export function mapRowsToGeoJSON(rows: MapRow[]): MapPolygonsGeoJSON {
  const features: MapPolygonFeature[] = [];
  for (const row of rows) {
    const feature = mapRowToFeature(row);
    if (feature) {
      features.push(feature);
    }
  }
  return { type: "FeatureCollection", features };
}

export function mapRowsToBounds(rows: MapRow[]): MapBounds | null {
  return boundariesToBounds(rows.map((row) => row.boundary));
}

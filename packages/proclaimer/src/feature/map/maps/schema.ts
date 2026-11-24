import { z } from "zod";

export const MAP_TABLE = "map";

export const MAP_POLYGON_COLOR = "#9ca3af";
export const MAP_SELECTED_COLOR = "#ef4444";
// Matches --ion-color-primary in the app theme; Mapbox styles cannot resolve
// CSS variables, so the value is duplicated here.
export const MAP_PRIMARY_COLOR = "#4a6da7";
export const MAP_BLOCK_COLOR = MAP_PRIMARY_COLOR;
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

export type MapLabelFeature = {
  type: "Feature";
  geometry: { type: "Point"; coordinates: number[] };
  properties: { id: string | null; name: string; details: string | null };
};

export type MapPolygonsGeoJSON = {
  type: "FeatureCollection";
  features: (MapPolygonFeature | MapLabelFeature)[];
};

export type MapBlockFeature = {
  type: "Feature";
  geometry:
    | { type: "Polygon"; coordinates: number[][][] }
    | { type: "LineString"; coordinates: number[][] }
    | { type: "Point"; coordinates: number[] };
  properties: { id: string; name: string; type: "face" | "block" };
};

export type MapBlocksGeoJSON = {
  type: "FeatureCollection";
  features: MapBlockFeature[];
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

// Ray-cast point-in-polygon test over a closed ring.
function isPointInRing([x, y]: [number, number], ring: MapBoundary): boolean {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i];
    const [xj, yj] = ring[j];
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) {
      inside = !inside;
    }
  }
  return inside;
}

// A stable anchor inside the boundary for the map's label. GeoJSON sources are
// re-tiled on the fly, so labeling the polygon itself renders one label per
// tile fragment when a map straddles a tile boundary.
export function boundaryToLabelPoint(boundary: unknown): [number, number] | null {
  if (!isValidBoundary(boundary) || boundary.length < 4) {
    return null;
  }
  const ring = ensureClosedRing(boundary);
  let twiceArea = 0;
  let cx = 0;
  let cy = 0;
  for (let i = 0; i < ring.length - 1; i++) {
    const [x0, y0] = ring[i];
    const [x1, y1] = ring[i + 1];
    const cross = x0 * y1 - x1 * y0;
    twiceArea += cross;
    cx += (x0 + x1) * cross;
    cy += (y0 + y1) * cross;
  }
  const candidates: [number, number][] = [];
  if (Math.abs(twiceArea) > 1e-12) {
    candidates.push([cx / (3 * twiceArea), cy / (3 * twiceArea)]);
  }
  const bounds = boundaryToBounds(boundary);
  if (bounds) {
    candidates.push([(bounds[0] + bounds[2]) / 2, (bounds[1] + bounds[3]) / 2]);
  }
  for (const candidate of candidates) {
    if (isPointInRing(candidate, ring)) {
      return candidate;
    }
  }
  // Concave rings can place the centroid outside; pin the label to the vertex
  // nearest the centroid so it still sits on the map.
  const target = candidates[0] ?? ring[0];
  let nearest = ring[0];
  let nearestDist = Infinity;
  for (const vertex of ring) {
    const dist = (vertex[0] - target[0]) ** 2 + (vertex[1] - target[1]) ** 2;
    if (dist < nearestDist) {
      nearestDist = dist;
      nearest = vertex;
    }
  }
  return nearest;
}

// Stable identifier for a map row, matching the expression used by map styles
// to look up a feature: `id` when present, otherwise `name`.
export function mapRowKey(row: MapRow): string {
  return row.id ?? row.name;
}

// Letters/digits only, so queries match names like "Map #4" or "Café" without
// typing punctuation or diacritics. Shared by tag-name dedup.
export const mapSearchable = (value: string) =>
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

// Sorts blocks/faces alphabetically for editing lists, matching the numeric
// ordering used for map names.
export function sortMapBlocks(blocks: MapBlock[] | null | undefined): MapBlock[] {
  return [...(blocks ?? [])].sort((a, b) =>
    a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: "base" }),
  );
}

// Returns a copy of `blocks` with the matching block/face renamed. Block ids
// are assumed unique within a map; duplicates would all be renamed.
export function renameMapBlock(
  blocks: MapBlock[] | null | undefined,
  blockId: string,
  name: string,
): MapBlock[] {
  return (blocks ?? []).map((block) => (block.id === blockId ? { ...block, name } : block));
}

// Returns a copy of `blocks` with the matching block/face removed. Block ids
// are assumed unique within a map; duplicates would all be removed.
export function removeMapBlock(blocks: MapBlock[] | null | undefined, blockId: string): MapBlock[] {
  return (blocks ?? []).filter((block) => block.id !== blockId);
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
  const features: MapPolygonsGeoJSON["features"] = [];
  for (const row of rows) {
    const feature = mapRowToFeature(row);
    if (feature) {
      features.push(feature);
      // Labels anchor to a single point per map so a polygon split across
      // tiles cannot render the same name more than once.
      const labelPoint = boundaryToLabelPoint(row.boundary);
      if (labelPoint) {
        features.push({
          type: "Feature",
          geometry: { type: "Point", coordinates: labelPoint },
          properties: { ...feature.properties },
        });
      }
    }
  }
  return { type: "FeatureCollection", features };
}

export function mapRowsToBounds(rows: MapRow[]): MapBounds | null {
  return boundariesToBounds(rows.map((row) => row.boundary));
}

// A "block" is a closed area bounded by streets; a "face" is one side of a
// street segment drawn as a line.
export function mapBlockToFeature(block: MapBlock): MapBlockFeature | null {
  const properties = { id: block.id, name: block.name, type: block.type };
  if (block.type === "block") {
    if (block.coordinates.length < 3) {
      return null;
    }
    return {
      type: "Feature",
      geometry: { type: "Polygon", coordinates: [ensureClosedRing(block.coordinates)] },
      properties,
    };
  }
  if (block.coordinates.length < 2) {
    return null;
  }
  return {
    type: "Feature",
    geometry: { type: "LineString", coordinates: block.coordinates },
    properties,
  };
}

// A face's name displays at both ends of its line.
function faceLabelAnchors(coordinates: number[][]): number[][] {
  const first = coordinates[0];
  const last = coordinates[coordinates.length - 1];
  return first[0] === last[0] && first[1] === last[1] ? [first] : [first, last];
}

export function mapBlocksToGeoJSON(blocks: MapBlock[] | null | undefined): MapBlocksGeoJSON {
  const features: MapBlockFeature[] = [];
  for (const block of blocks ?? []) {
    const feature = mapBlockToFeature(block);
    if (feature) {
      features.push(feature);
      // Labels anchor to points so a block or face split across tiles cannot
      // render its name more than once per anchor. Mapbox cannot place a
      // label at a line's end, so faces anchor at both endpoints; blocks
      // anchor inside their ring.
      const anchors =
        block.type === "face"
          ? faceLabelAnchors(block.coordinates)
          : [boundaryToLabelPoint(ensureClosedRing(block.coordinates)) ?? block.coordinates[0]];
      for (const anchor of anchors) {
        features.push({
          type: "Feature",
          geometry: { type: "Point", coordinates: anchor },
          properties: { id: block.id, name: block.name, type: block.type },
        });
      }
    }
  }
  return { type: "FeatureCollection", features };
}

import type { MapMasterRow } from "../master/schema.ts";
import {
  boundaryToPolygonCoords,
  ensureClosedRing,
  mapRowKey,
  type MapBoundary,
  type MapRow,
} from "../maps/schema.ts";

// Mode names must match the modes instantiated on the Terra Draw instance:
// "polygon" and "linestring" own the editable features, "select" edits them.
export const MAP_EDIT_SELECT_MODE = "select";
export const MAP_EDIT_POLYGON_MODE = "polygon";
export const MAP_EDIT_LINE_MODE = "linestring";

export const MAP_EDIT_SELECT_FLAGS = {
  [MAP_EDIT_POLYGON_MODE]: {
    feature: {
      draggable: false,
      rotateable: false,
      scaleable: false,
      coordinates: { midpoints: true, draggable: true, deletable: true },
    },
  },
  [MAP_EDIT_LINE_MODE]: {
    feature: {
      draggable: false,
      coordinates: { midpoints: true, draggable: true, deletable: true },
    },
  },
} as const;

export const MAP_EDIT_KINDS = ["master", "border", "block", "face"] as const;
export type MapEditFeatureKind = (typeof MAP_EDIT_KINDS)[number];

export type MapEditGeometry =
  | { type: "Polygon"; coordinates: number[][][] }
  | { type: "LineString"; coordinates: number[][] };

// `mode` is required by Terra Draw's store validation; `kind`, `mapId`, and
// `blockId` map the feature back to the row it was built from.
export interface MapEditFeatureProperties {
  mode: typeof MAP_EDIT_POLYGON_MODE | typeof MAP_EDIT_LINE_MODE;
  kind: MapEditFeatureKind;
  mapId?: string;
  blockId?: string;
  selected?: boolean;
}

export interface MapEditFeature {
  type: "Feature";
  id: string;
  geometry: MapEditGeometry;
  properties: MapEditFeatureProperties;
}

export type MapEditVertexFeature = {
  type: "Feature";
  geometry: { type: "Point"; coordinates: number[] };
  properties: { feature: string; index: number; selected: boolean };
};

export type MapEditVertexCollection = {
  type: "FeatureCollection";
  features: MapEditVertexFeature[];
};

export function mapEditFeatureId(
  kind: MapEditFeatureKind,
  mapId?: string,
  blockId?: string,
): string {
  if (kind === "master") {
    return "master";
  }
  if (kind === "border") {
    return `border:${mapId}`;
  }
  return `${kind}:${mapId}:${blockId}`;
}

// Narrows a store snapshot entry to one of our editable features. Terra Draw's
// select mode adds guidance features (selection points, midpoints) to the same
// store; those are ignored because they carry no `kind`.
export function asMapEditFeature(feature: {
  id?: unknown;
  geometry?: unknown;
  properties?: unknown;
}): MapEditFeature | null {
  const { id, geometry, properties } = feature;
  if (typeof id !== "string" && typeof id !== "number") {
    return null;
  }
  const props = properties as Partial<MapEditFeatureProperties> | null | undefined;
  if (!props || !(MAP_EDIT_KINDS as readonly string[]).includes(String(props.kind))) {
    return null;
  }
  const geom = geometry as MapEditGeometry | null | undefined;
  if (geom?.type !== "Polygon" && geom?.type !== "LineString") {
    return null;
  }
  return {
    type: "Feature",
    id: String(id),
    geometry: geom,
    properties: props as MapEditFeatureProperties,
  };
}

// Terra Draw's store rejects coordinates with more than 9 decimal places
// ("excessive precision"); database floats often exceed that, so round when
// emitting features. Rounding keeps first === last on closed rings.
function roundPosition(position: number[]): [number, number] {
  return [Math.round(position[0] * 1e9) / 1e9, Math.round(position[1] * 1e9) / 1e9];
}

// A map's border and polygon blocks are editable only when the row can be
// persisted — the collection is keyed on `id`.
export function mapRowToEditFeatures(row: MapRow, includeBlocks: boolean): MapEditFeature[] {
  if (!row.id) {
    return [];
  }
  const features: MapEditFeature[] = [];
  const boundary = boundaryToPolygonCoords(row.boundary);
  if (boundary) {
    features.push({
      type: "Feature",
      id: mapEditFeatureId("border", row.id),
      geometry: {
        type: "Polygon",
        coordinates: boundary.map((ring) => ring.map(roundPosition)),
      },
      properties: { mode: MAP_EDIT_POLYGON_MODE, kind: "border", mapId: row.id },
    });
  }
  if (includeBlocks) {
    for (const block of row.blocks ?? []) {
      if (block.type === "block") {
        if (block.coordinates.length < 3) {
          continue;
        }
        features.push({
          type: "Feature",
          id: mapEditFeatureId("block", row.id, block.id),
          geometry: {
            type: "Polygon",
            coordinates: [ensureClosedRing(block.coordinates).map(roundPosition)],
          },
          properties: {
            mode: MAP_EDIT_POLYGON_MODE,
            kind: "block",
            mapId: row.id,
            blockId: block.id,
          },
        });
      } else if (block.coordinates.length >= 2) {
        features.push({
          type: "Feature",
          id: mapEditFeatureId("face", row.id, block.id),
          geometry: { type: "LineString", coordinates: block.coordinates.map(roundPosition) },
          properties: {
            mode: MAP_EDIT_LINE_MODE,
            kind: "face",
            mapId: row.id,
            blockId: block.id,
          },
        });
      }
    }
  }
  return features;
}

export function mapMasterToEditFeature(
  row: MapMasterRow | null | undefined,
): MapEditFeature | null {
  const coordinates = row ? boundaryToPolygonCoords(row.boundary) : null;
  if (!coordinates) {
    return null;
  }
  return {
    type: "Feature",
    id: mapEditFeatureId("master"),
    geometry: {
      type: "Polygon",
      coordinates: coordinates.map((ring) => ring.map(roundPosition)),
    },
    properties: { mode: MAP_EDIT_POLYGON_MODE, kind: "master" },
  };
}

// Every map border is editable; blocks and faces only exist for the map the
// user has selected, matching what MapsLayer renders.
export function buildMapEditFeatures(
  maps: MapRow[],
  selectedMap: string | null | undefined,
  master: MapMasterRow | null | undefined,
): MapEditFeature[] {
  const features: MapEditFeature[] = [];
  const masterFeature = mapMasterToEditFeature(master);
  if (masterFeature) {
    features.push(masterFeature);
  }
  for (const row of maps) {
    features.push(...mapRowToEditFeatures(row, mapRowKey(row) === selectedMap));
  }
  return features;
}

// Applies an edited feature back onto a map row draft. Polygon geometry is
// stored as a closed ring, faces as a plain line.
export function applyMapEditFeatureToRow(draft: MapRow, feature: MapEditFeature): void {
  const { kind, blockId } = feature.properties;
  if (kind === "border" && feature.geometry.type === "Polygon") {
    draft.boundary = feature.geometry.coordinates[0] as MapBoundary;
    return;
  }
  if ((kind !== "block" && kind !== "face") || !blockId) {
    return;
  }
  // Only write geometry whose shape matches the block type — a polygon ring
  // landing in a face (or a line in a block) would corrupt the stored shape.
  if (kind === "block" && feature.geometry.type !== "Polygon") {
    return;
  }
  if (kind === "face" && feature.geometry.type !== "LineString") {
    return;
  }
  const coordinates =
    feature.geometry.type === "Polygon"
      ? feature.geometry.coordinates[0]
      : feature.geometry.coordinates;
  draft.blocks = (draft.blocks ?? []).map((block) =>
    block.id === blockId ? { ...block, coordinates: coordinates as MapBoundary } : block,
  );
}

export function applyMapEditFeatureToMaster(draft: MapMasterRow, feature: MapEditFeature): void {
  if (feature.properties.kind === "master" && feature.geometry.type === "Polygon") {
    draft.boundary = feature.geometry.coordinates[0] as MapBoundary;
  }
}

export function replaceMapEditVertex(
  geometry: MapEditGeometry,
  index: number,
  position: [number, number],
): MapEditGeometry | null {
  if (geometry.type === "Polygon") {
    const ring = geometry.coordinates[0];
    if (!ring || index < 0 || index >= ring.length) {
      return null;
    }
    const nextRing = ring.map((vertex) => [...vertex]);
    if (index === 0 || index === ring.length - 1) {
      nextRing[0] = position;
      nextRing[ring.length - 1] = position;
    } else {
      nextRing[index] = position;
    }
    return { type: "Polygon", coordinates: [nextRing] };
  }
  if (index < 0 || index >= geometry.coordinates.length) {
    return null;
  }
  const coordinates = geometry.coordinates.map((vertex) => [...vertex]);
  coordinates[index] = position;
  return { type: "LineString", coordinates };
}

export function removeMapEditVertex(
  geometry: MapEditGeometry,
  index: number,
): MapEditGeometry | null {
  if (geometry.type === "Polygon") {
    const ring = geometry.coordinates[0];
    if (!ring || ring.length <= 4 || index < 0 || index >= ring.length) {
      return null;
    }
    const nextRing = ring.map((vertex) => [...vertex]);
    if (index === 0 || index === ring.length - 1) {
      nextRing.shift();
      nextRing.pop();
      nextRing.push([...nextRing[0]]);
    } else {
      nextRing.splice(index, 1);
    }
    return { type: "Polygon", coordinates: [nextRing] };
  }
  if (geometry.coordinates.length <= 2 || index < 0 || index >= geometry.coordinates.length) {
    return null;
  }
  const coordinates = geometry.coordinates.map((vertex) => [...vertex]);
  coordinates.splice(index, 1);
  return { type: "LineString", coordinates };
}

// Point feature for every vertex of every editable feature so vertices are
// visible throughout edit mode, not just on the selected feature.
export function mapEditVerticesToGeoJSON(
  features: { id?: unknown; geometry?: unknown; properties?: unknown }[],
): MapEditVertexCollection {
  const points: MapEditVertexFeature[] = [];
  for (const candidate of features) {
    const feature = asMapEditFeature(candidate);
    if (!feature) {
      continue;
    }
    const ring = feature.geometry.type === "Polygon" ? feature.geometry.coordinates[0] : null;
    const line = feature.geometry.type === "LineString" ? feature.geometry.coordinates : null;
    const vertices = ring ? ring.slice(0, -1) : (line ?? []);
    for (const [index, vertex] of vertices.entries()) {
      points.push({
        type: "Feature",
        geometry: { type: "Point", coordinates: vertex },
        properties: {
          feature: feature.id,
          index,
          selected: feature.properties.selected === true,
        },
      });
    }
  }
  return { type: "FeatureCollection", features: points };
}

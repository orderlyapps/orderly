import type { MapEditColorScheme } from "../../settings/schema.ts";
import type { MapMasterRow } from "../master/schema.ts";
import {
  boundaryToPolygonCoords,
  ensureClosedRing,
  MAP_PRIMARY_COLOR,
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
      coordinates: { midpoints: true, draggable: false, deletable: true },
    },
  },
  [MAP_EDIT_LINE_MODE]: {
    feature: {
      draggable: false,
      coordinates: { midpoints: true, draggable: false, deletable: true },
    },
  },
} as const;

export const MAP_EDIT_KINDS = ["master", "border", "block", "face"] as const;
export type MapEditFeatureKind = (typeof MAP_EDIT_KINDS)[number];

// Saturated mid-tone colors remain legible over both light and dark basemaps.
// The order jumps around the color wheel so the earliest entries — used by the
// most common lower-numbered and earlier-lettered maps — contrast strongly.
export const MAP_EDIT_MULTICOLOR_PALETTE = [
  "#dc2626",
  "#16a34a",
  "#2563eb",
  "#db2777",
  "#ca8a04",
  "#0891b2",
  "#c026d3",
  "#ea580c",
  "#0d9488",
  "#7c3aed",
] as const;

function mapEditColorIndex(mapName: string): number | null {
  const trimmedName = mapName.trim();
  const lastCharacter = trimmedName.charAt(trimmedName.length - 1).toUpperCase();
  if (!lastCharacter) {
    return null;
  }
  if (lastCharacter >= "1" && lastCharacter <= "9") {
    return lastCharacter.charCodeAt(0) - "1".charCodeAt(0);
  }
  if (lastCharacter === "0") {
    return 9;
  }
  if (lastCharacter >= "A" && lastCharacter <= "J") {
    return lastCharacter.charCodeAt(0) - "A".charCodeAt(0);
  }
  return null;
}

// Borders, blocks, and faces belonging to one map share a color derived from
// the final digit or A-J letter of the map's name. The congregation master
// border is not a map and keeps the standard editing color.
export function mapEditFeatureColor(
  properties: { mapId?: unknown; mapName?: unknown },
  colorScheme: MapEditColorScheme,
) {
  if (colorScheme !== "multicolored" || typeof properties.mapName !== "string") {
    return MAP_PRIMARY_COLOR;
  }
  const colorIndex = mapEditColorIndex(properties.mapName);
  return colorIndex === null ? MAP_PRIMARY_COLOR : MAP_EDIT_MULTICOLOR_PALETTE[colorIndex];
}

export type MapEditGeometry =
  | { type: "Polygon"; coordinates: number[][][] }
  | { type: "LineString"; coordinates: number[][] };

// `mode` is required by Terra Draw's store validation; `kind`, `mapId`, and
// `blockId` map the feature back to the row it was built from. `mapName`
// determines the multicolored edit color.
export interface MapEditFeatureProperties {
  mode: typeof MAP_EDIT_POLYGON_MODE | typeof MAP_EDIT_LINE_MODE;
  kind: MapEditFeatureKind;
  mapId?: string;
  mapName?: string;
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
  properties: { feature: string; index: number; selected: boolean; color: string; zIndex: number };
};

export type MapEditVertexCollection = {
  type: "FeatureCollection";
  features: MapEditVertexFeature[];
};

export interface MapEditVertexDragGeometry {
  staticLineStrings: number[][][];
  previous: number[] | null;
  next: number[] | null;
}

export interface MapEditDragPreviewStyle {
  color: string;
  fillOpacity: number;
  lineOpacity: number;
  lineWidth: number;
  selected: boolean;
}

export type MapEditDragPreviewFeature = {
  type: "Feature";
  geometry:
    | { type: "Point"; coordinates: number[] }
    | { type: "LineString"; coordinates: number[][] }
    | { type: "Polygon"; coordinates: number[][][] };
  properties: MapEditDragPreviewStyle;
};

export type MapEditDragPreviewCollection = {
  type: "FeatureCollection";
  features: MapEditDragPreviewFeature[];
};

function clonePosition(position: number[]): number[] {
  return [...position];
}

function emptyDragPreviewCollection(): MapEditDragPreviewCollection {
  return { type: "FeatureCollection", features: [] };
}

// Splits the geometry around a dragged vertex. The static line strings are
// everything except the incident edge or edges; the returned endpoints are
// reconnected to the live position on every pointer frame.
export function splitMapEditVertexDragGeometry(
  geometry: MapEditGeometry,
  index: number,
): MapEditVertexDragGeometry | null {
  if (geometry.type === "Polygon") {
    const ring = geometry.coordinates[0];
    if (!ring || ring.length < 4) {
      return null;
    }
    const positions = ring.slice(0, -1);
    const vertexIndex = index === ring.length - 1 ? 0 : index;
    if (vertexIndex < 0 || vertexIndex >= positions.length) {
      return null;
    }
    const count = positions.length;
    const staticLine: number[][] = [];
    for (let step = 1; step < count; step += 1) {
      staticLine.push(clonePosition(positions[(vertexIndex + step) % count]));
    }
    return {
      staticLineStrings: [staticLine],
      previous: clonePosition(positions[(vertexIndex - 1 + count) % count]),
      next: clonePosition(positions[(vertexIndex + 1) % count]),
    };
  }

  const coordinates = geometry.coordinates;
  if (index < 0 || index >= coordinates.length) {
    return null;
  }
  const staticLineStrings: number[][][] = [];
  const before = coordinates.slice(0, index).map(clonePosition);
  const after = coordinates.slice(index + 1).map(clonePosition);
  if (before.length >= 2) {
    staticLineStrings.push(before);
  }
  if (after.length >= 2) {
    staticLineStrings.push(after);
  }
  return {
    staticLineStrings,
    previous: index > 0 ? clonePosition(coordinates[index - 1]) : null,
    next: index < coordinates.length - 1 ? clonePosition(coordinates[index + 1]) : null,
  };
}

export function mapEditVertexDragLine(
  dragGeometry: MapEditVertexDragGeometry,
  position: [number, number],
): number[][] {
  const line: number[][] = [];
  if (dragGeometry.previous) {
    line.push(clonePosition(dragGeometry.previous));
  }
  line.push(clonePosition(position));
  if (dragGeometry.next) {
    line.push(clonePosition(dragGeometry.next));
  }
  return line;
}

// Matches the effective Terra Draw polygon/linestring styling, including the
// selected-feature overrides configured in createTerraDraw.
export function mapEditDragPreviewStyle(
  properties: MapEditFeatureProperties,
  colorScheme: MapEditColorScheme = "standard",
): MapEditDragPreviewStyle {
  const selected = properties.selected === true;
  const color = mapEditFeatureColor(properties, colorScheme);
  if (properties.mode === MAP_EDIT_POLYGON_MODE) {
    return {
      color,
      selected,
      fillOpacity: selected ? 0.18 : properties.kind === "master" ? 0 : 0.05,
      lineOpacity: selected ? 0.95 : properties.kind === "master" ? 0.4 : 0.95,
      lineWidth: selected ? 3 : 2,
    };
  }
  return {
    color,
    selected,
    fillOpacity: 0,
    lineOpacity: 0.95,
    lineWidth: selected ? 3 : 2,
  };
}

export function mapEditDragPreviewStaticGeoJSON(
  dragGeometry: MapEditVertexDragGeometry,
  style: MapEditDragPreviewStyle,
): MapEditDragPreviewCollection {
  return {
    type: "FeatureCollection",
    features: dragGeometry.staticLineStrings.map((coordinates) => ({
      type: "Feature",
      geometry: { type: "LineString", coordinates },
      properties: { ...style },
    })),
  };
}

export function mapEditDragPreviewDetailGeoJSON(
  dragGeometry: MapEditVertexDragGeometry,
  position: [number, number],
  style: MapEditDragPreviewStyle,
): MapEditDragPreviewCollection {
  const collection = emptyDragPreviewCollection();
  const line = mapEditVertexDragLine(dragGeometry, position);
  if (line.length >= 2) {
    collection.features.push({
      type: "Feature",
      geometry: { type: "LineString", coordinates: line },
      properties: { ...style },
    });
  }
  collection.features.push({
    type: "Feature",
    geometry: { type: "Point", coordinates: [...position] },
    properties: { ...style },
  });
  return collection;
}

export function mapEditDragPreviewFillGeoJSON(
  geometry: MapEditGeometry,
  style: MapEditDragPreviewStyle,
): MapEditDragPreviewCollection {
  if (geometry.type !== "Polygon" || style.fillOpacity <= 0) {
    return emptyDragPreviewCollection();
  }
  return {
    type: "FeatureCollection",
    features: [
      {
        type: "Feature",
        geometry: {
          type: "Polygon",
          coordinates: geometry.coordinates.map((ring) => ring.map(clonePosition)),
        },
        properties: { ...style },
      },
    ],
  };
}

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
      properties: {
        mode: MAP_EDIT_POLYGON_MODE,
        kind: "border",
        mapId: row.id,
        mapName: row.name,
      },
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
            mapName: row.name,
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
            mapName: row.name,
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

const MAP_EDIT_SELECTION_PRIORITY: Record<MapEditFeatureKind, number> = {
  face: 0,
  block: 1,
  border: 2,
  master: 3,
};

function mapEditGeometryArea(geometry: MapEditGeometry): number {
  if (geometry.type !== "Polygon") {
    return 0;
  }
  const ring = geometry.coordinates[0] ?? [];
  let area = 0;
  for (let index = 0; index < ring.length - 1; index += 1) {
    const [x1, y1] = ring[index];
    const [x2, y2] = ring[index + 1];
    area += x1 * y2 - x2 * y1;
  }
  return Math.abs(area / 2);
}

export function sortMapEditFeaturesForSelection(features: MapEditFeature[]): MapEditFeature[] {
  return [...features].sort((a, b) => {
    const kindPriority =
      MAP_EDIT_SELECTION_PRIORITY[a.properties.kind] -
      MAP_EDIT_SELECTION_PRIORITY[b.properties.kind];
    if (kindPriority !== 0) {
      return kindPriority;
    }
    const areaPriority = mapEditGeometryArea(a.geometry) - mapEditGeometryArea(b.geometry);
    if (areaPriority !== 0) {
      return areaPriority;
    }
    return a.id.localeCompare(b.id);
  });
}

export function nextMapEditSelectionIndex(
  candidateCount: number,
  selectedIndex: number,
  repeatedClick: boolean,
): number | null {
  if (candidateCount <= 0) {
    return null;
  }
  const canCycle = repeatedClick && selectedIndex >= 0 && selectedIndex < candidateCount;
  return canCycle ? (selectedIndex + 1) % candidateCount : 0;
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

const MAP_EDIT_VERTEX_KIND_Z_INDEX: Record<MapEditFeatureKind, number> = {
  master: 0,
  border: 1,
  block: 2,
  face: 3,
};
const MAP_EDIT_VERTEX_SELECTED_MAP_Z_INDEX = 10;
const MAP_EDIT_VERTEX_SELECTED_FEATURE_Z_INDEX = 20;

// Point feature for every vertex of every editable feature so vertices are
// visible throughout edit mode, not just on the selected feature.
export function mapEditVerticesToGeoJSON(
  features: { id?: unknown; geometry?: unknown; properties?: unknown }[],
  colorScheme: MapEditColorScheme = "standard",
  selectedMap?: string | null,
): MapEditVertexCollection {
  const points: MapEditVertexFeature[] = [];
  for (const candidate of features) {
    const feature = asMapEditFeature(candidate);
    if (!feature) {
      continue;
    }
    const color = mapEditFeatureColor(feature.properties, colorScheme);
    const ring = feature.geometry.type === "Polygon" ? feature.geometry.coordinates[0] : null;
    const line = feature.geometry.type === "LineString" ? feature.geometry.coordinates : null;
    const vertices = ring ? ring.slice(0, -1) : (line ?? []);
    const featureSelected = feature.properties.selected === true;
    const mapSelected = selectedMap != null && feature.properties.mapId === selectedMap;
    const zIndex =
      MAP_EDIT_VERTEX_KIND_Z_INDEX[feature.properties.kind] +
      (mapSelected ? MAP_EDIT_VERTEX_SELECTED_MAP_Z_INDEX : 0) +
      (featureSelected ? MAP_EDIT_VERTEX_SELECTED_FEATURE_Z_INDEX : 0);
    for (const [index, vertex] of vertices.entries()) {
      points.push({
        type: "Feature",
        geometry: { type: "Point", coordinates: vertex },
        properties: {
          feature: feature.id,
          index,
          selected: featureSelected,
          color,
          zIndex,
        },
      });
    }
  }
  points.sort((a, b) => a.properties.zIndex - b.properties.zIndex);
  return { type: "FeatureCollection", features: points };
}

import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { expect, test } from "vite-plus/test";

import {
  applyMapEditFeatureToMaster,
  applyMapEditFeatureToRow,
  areCoordinatesEqual,
  asMapEditFeature,
  boundariesToBounds,
  boundaryToBounds,
  boundaryToLabelPoint,
  boundaryToPolygonCoords,
  buildMapEditFeatures,
  buildMapRowListSections,
  buildNotAtHomeFeatures,
  clampMapZoom,
  DEFAULT_MAP_CENTER,
  ensureClosedRing,
  filterMapRows,
  findMapTagByName,
  groupNotAtHomeMarkers,
  isClosedRing,
  isMapboxAccessToken,
  isValidBoundary,
  isValidCoordinates,
  isValidMapViewState,
  mapBlocksToGeoJSON,
  mapBlockToFeature,
  mapEditFeatureColor,
  mapEditFeatureId,
  mapEditVerticesToGeoJSON,
  mapMasterRowSchema,
  mapMasterToBounds,
  mapMasterToEditFeature,
  mapMasterToGeoJSON,
  mapRowToEditFeatures,
  MasterMapLayer,
  MAP_EDIT_MULTICOLOR_PALETTE,
  MAP_PRIMARY_COLOR,
  MAPBOX_DARK_STYLE,
  MAPBOX_LIGHT_STYLE,
  MAP_DEFAULT_ZOOM,
  MAP_MAX_ZOOM,
  MAP_MIN_ZOOM,
  MAP_VIEW_STATE_STORAGE_KEY,
  mapRowSchema,
  mapRowsToBounds,
  mapRowsToGeoJSON,
  nextMapEditSelectionIndex,
  MapEditLayer,
  MapEditModal,
  MapsLayer,
  MapSettingsModal,
  mapTagAssignmentKey,
  mapTagAssignmentRowSchema,
  mapTagRowSchema,
  MapView,
  NOT_AT_HOME_STALE_DAY_CHOICES,
  notAtHomeRowSchema,
  notAtHomeRowToMarker,
  NotAtHomesLayer,
  readMapViewState,
  recentMapRowKeys,
  removeMapBlock,
  removeMapEditVertex,
  renameMapBlock,
  replaceMapEditVertex,
  resolveMapStyle,
  sortMapBlocks,
  sortMapEditFeaturesForSelection,
  sortMapRowsByRecency,
  sortMapTags,
  toMapboxCenter,
  useMapPolygons,
  useMapTagAssignments,
  useMapTags,
  useMapView,
  useMasterMap,
  useNotAtHomes,
  writeMapViewState,
  type MapBlock,
  type MapEditFeature,
  type MapMasterRow,
  type MapRow,
  type MapTagRow,
  type NotAtHomeMarker,
  type NotAtHomeRow,
} from "../src/feature/map/index.ts";
import { MapEditColorSchemeSelect } from "../src/feature/map/MapSettingsModal.tsx";

test("validates coordinates, tokens, zoom bounds, and style resolution", () => {
  expect(MAPBOX_LIGHT_STYLE.version).toBe(8);
  expect(MAPBOX_LIGHT_STYLE.name).toBe("Streets");
  expect(MAPBOX_DARK_STYLE.version).toBe(8);
  expect(MAPBOX_DARK_STYLE.name).toBe("Dark");
  expect(MAP_MIN_ZOOM).toBe(0);
  expect(MAP_MAX_ZOOM).toBe(22);
  expect(MAP_DEFAULT_ZOOM).toBe(2);

  expect(isMapboxAccessToken("pk.abc123")).toBe(true);
  expect(isMapboxAccessToken("   ")).toBe(false);
  expect(isMapboxAccessToken("")).toBe(false);
  expect(isMapboxAccessToken(null)).toBe(false);
  expect(isMapboxAccessToken(undefined)).toBe(false);
  expect(isMapboxAccessToken(42)).toBe(false);

  expect(isValidCoordinates({ longitude: 10, latitude: 20 })).toBe(true);
  expect(isValidCoordinates({ longitude: -180, latitude: -90 })).toBe(true);
  expect(isValidCoordinates({ longitude: 181, latitude: 0 })).toBe(false);
  expect(isValidCoordinates({ longitude: 0, latitude: 91 })).toBe(false);
  expect(isValidCoordinates({ longitude: Number.NaN, latitude: 0 })).toBe(false);
  expect(isValidCoordinates(null)).toBe(false);
  expect(isValidCoordinates("10,20")).toBe(false);

  expect(toMapboxCenter({ longitude: 151.2, latitude: -33.8 })).toEqual([151.2, -33.8]);
  expect(areCoordinatesEqual(DEFAULT_MAP_CENTER, { longitude: 0, latitude: 20 })).toBe(true);
  expect(areCoordinatesEqual(DEFAULT_MAP_CENTER, { longitude: 1, latitude: 20 })).toBe(false);

  expect(clampMapZoom(12)).toBe(12);
  expect(clampMapZoom(-5)).toBe(MAP_MIN_ZOOM);
  expect(clampMapZoom(99)).toBe(MAP_MAX_ZOOM);

  expect(resolveMapStyle(false)).toBe(MAPBOX_LIGHT_STYLE);
  expect(resolveMapStyle(true)).toBe(MAPBOX_DARK_STYLE);
  expect(resolveMapStyle(true, "mapbox://styles/custom/style")).toBe(
    "mapbox://styles/custom/style",
  );
  expect(resolveMapStyle(false, "mapbox://styles/custom/style")).toBe(
    "mapbox://styles/custom/style",
  );

  expect(typeof MapView).toBe("function");
  expect(typeof useMapView).toBe("function");
});

test("reads and writes persisted map view state", () => {
  const storage = new Map<string, string>();
  const api = {
    getItem: (key: string) => storage.get(key) ?? null,
    setItem: (key: string, value: string) => {
      storage.set(key, value);
    },
  };

  expect(isValidMapViewState({ center: { longitude: 10, latitude: 20 }, zoom: 12 })).toBe(true);
  expect(isValidMapViewState({ center: { longitude: 200, latitude: 20 }, zoom: 12 })).toBe(false);
  expect(isValidMapViewState({ center: { longitude: 10, latitude: 20 }, zoom: "12" })).toBe(false);
  expect(isValidMapViewState({ zoom: 12 })).toBe(false);
  expect(isValidMapViewState(null)).toBe(false);

  expect(readMapViewState(api, MAP_VIEW_STATE_STORAGE_KEY)).toBe(null);

  writeMapViewState(api, MAP_VIEW_STATE_STORAGE_KEY, {
    center: { longitude: 151.2, latitude: -33.8 },
    zoom: 14,
  });
  expect(readMapViewState(api, MAP_VIEW_STATE_STORAGE_KEY)).toEqual({
    center: { longitude: 151.2, latitude: -33.8 },
    zoom: 14,
  });

  writeMapViewState(api, MAP_VIEW_STATE_STORAGE_KEY, {
    center: { longitude: 151.2, latitude: -33.8 },
    zoom: 99,
  });
  expect(readMapViewState(api, MAP_VIEW_STATE_STORAGE_KEY)?.zoom).toBe(MAP_MAX_ZOOM);

  storage.set(MAP_VIEW_STATE_STORAGE_KEY, "not json");
  expect(readMapViewState(api, MAP_VIEW_STATE_STORAGE_KEY)).toBe(null);

  storage.set(MAP_VIEW_STATE_STORAGE_KEY, JSON.stringify({ center: null, zoom: 5 }));
  expect(readMapViewState(api, MAP_VIEW_STATE_STORAGE_KEY)).toBe(null);
});

test("validates map boundaries and computes bounds", () => {
  const ring = [
    [151.0, -33.9],
    [151.1, -33.9],
    [151.1, -33.8],
    [151.0, -33.9],
  ] as [number, number][];

  expect(isValidBoundary(ring)).toBe(true);
  expect(isValidBoundary([])).toBe(false);
  expect(isValidBoundary(null)).toBe(false);
  expect(isValidBoundary([["x", 1]])).toBe(false);
  expect(isValidBoundary("not-a-boundary")).toBe(false);

  expect(isClosedRing(ring)).toBe(true);
  expect(isClosedRing(ring.slice(0, 3))).toBe(false);
  expect(ensureClosedRing(ring.slice(0, 3))).toEqual(ring);
  expect(ensureClosedRing(ring)).toBe(ring);

  expect(boundaryToBounds(ring)).toEqual([151.0, -33.9, 151.1, -33.8]);
  expect(boundaryToBounds(ring.slice(0, 2))).toBe(null);
  expect(boundaryToBounds(null)).toBe(null);

  expect(
    boundariesToBounds([
      ring,
      [
        [152.0, -34.0],
        [152.0, -34.0],
        [152.0, -34.0],
        [152.0, -34.0],
      ],
    ]),
  ).toEqual([151.0, -34.0, 152.0, -33.8]);
  expect(boundariesToBounds([null, []])).toBe(null);

  expect(boundaryToPolygonCoords(ring)).toEqual([ring]);
  expect(boundaryToPolygonCoords(ring.slice(0, 3))).toBe(null);
});

test("computes a single label anchor inside each map boundary", () => {
  const square = [
    [151.0, -33.9],
    [151.1, -33.9],
    [151.1, -33.8],
    [151.0, -33.8],
    [151.0, -33.9],
  ] as [number, number][];

  const [squareLng, squareLat] = boundaryToLabelPoint(square)!;
  expect(squareLng).toBeCloseTo(151.05, 4);
  expect(squareLat).toBeCloseTo(-33.85, 4);
  expect(boundaryToLabelPoint(null)).toBe(null);
  expect(boundaryToLabelPoint(square.slice(0, 3))).toBe(null);

  // A C-shaped ring whose centroid and bounds center both fall outside the
  // polygon falls back to the ring vertex nearest the centroid.
  const concave = [
    [0, 0],
    [4, 0],
    [4, 1],
    [1, 1],
    [1, 3],
    [4, 3],
    [4, 4],
    [0, 4],
    [0, 0],
  ] as [number, number][];
  expect(boundaryToLabelPoint(concave)).toEqual([1, 1]);
});

test("converts map rows to a polygon feature collection", () => {
  const row = (overrides: Partial<MapRow>): MapRow => ({
    congregation_id: "cong-1",
    name: "Map 1",
    ...overrides,
  });
  const ring = [
    [151.0, -33.9],
    [151.1, -33.9],
    [151.1, -33.8],
    [151.0, -33.9],
  ] as [number, number][];

  expect(mapRowSchema.safeParse(row({})).success).toBe(true);

  const geojson = mapRowsToGeoJSON([
    row({ id: "map-1", name: "Alpha", boundary: ring, details: "Near the hall" }),
    row({ id: "map-2", name: "No boundary", boundary: null }),
    row({ id: "map-3", name: "Too short", boundary: ring.slice(0, 2) }),
  ]);

  expect(geojson.type).toBe("FeatureCollection");
  // Each map emits its polygon plus one label anchor point so a map split
  // across vector tiles never shows its name more than once.
  expect(geojson.features).toHaveLength(2);
  expect(geojson.features[0].geometry).toEqual({ type: "Polygon", coordinates: [ring] });
  expect(geojson.features[0].properties).toEqual({
    id: "map-1",
    name: "Alpha",
    details: "Near the hall",
  });
  const label = geojson.features[1];
  expect(label.geometry.type).toBe("Point");
  const [labelLng, labelLat] = (label.geometry as { coordinates: number[] }).coordinates;
  expect(labelLng).toBeCloseTo(151.0667, 4);
  expect(labelLat).toBeCloseTo(-33.8667, 4);
  expect(label.properties).toEqual(geojson.features[0].properties);

  expect(mapRowsToBounds([row({ boundary: ring })])).toEqual([151.0, -33.9, 151.1, -33.8]);
  expect(mapRowsToBounds([row({ boundary: null })])).toBe(null);

  expect(typeof MapsLayer).toBe("function");
  expect(typeof useMapPolygons).toBe("function");
});

test("converts the master map row to a polygon feature collection", () => {
  const ring = [
    [151.0, -33.9],
    [151.1, -33.9],
    [151.1, -33.8],
    [151.0, -33.9],
  ] as [number, number][];
  const master: MapMasterRow = {
    congregation_id: "cong-1",
    boundary: ring,
    details: "Whole territory",
  };

  expect(mapMasterRowSchema.safeParse(master).success).toBe(true);
  expect(mapMasterRowSchema.safeParse({ ...master, boundary: "oops" }).success).toBe(false);

  const geojson = mapMasterToGeoJSON(master);
  expect(geojson.type).toBe("FeatureCollection");
  expect(geojson.features).toHaveLength(1);
  expect(geojson.features[0].geometry).toEqual({ type: "Polygon", coordinates: [ring] });
  expect(geojson.features[0].properties).toEqual({ details: "Whole territory" });

  expect(mapMasterToGeoJSON(null).features).toHaveLength(0);
  expect(mapMasterToGeoJSON({ ...master, boundary: ring.slice(0, 2) }).features).toHaveLength(0);

  expect(mapMasterToBounds(master)).toEqual([151.0, -33.9, 151.1, -33.8]);
  expect(mapMasterToBounds(null)).toBe(null);

  expect(typeof MasterMapLayer).toBe("function");
  expect(typeof useMasterMap).toBe("function");
});

test("converts map blocks to polygon and line features", () => {
  const block = (overrides: Partial<MapBlock>): MapBlock => ({
    id: "block-1",
    name: "Block 1",
    type: "block",
    coordinates: [
      [151.0, -33.9],
      [151.1, -33.9],
      [151.1, -33.8],
    ],
    ...overrides,
  });
  const face = (overrides: Partial<MapBlock>): MapBlock => ({
    ...block({}),
    id: "face-1",
    name: "Main St",
    type: "face",
    coordinates: [
      [151.0, -33.9],
      [151.1, -33.9],
    ],
    ...overrides,
  });

  // Blocks become closed-ring polygons; faces become lines.
  expect(mapBlockToFeature(block({}))?.geometry).toEqual({
    type: "Polygon",
    coordinates: [
      [
        [151.0, -33.9],
        [151.1, -33.9],
        [151.1, -33.8],
        [151.0, -33.9],
      ],
    ],
  });
  expect(mapBlockToFeature(block({}))?.properties).toEqual({
    id: "block-1",
    name: "Block 1",
    type: "block",
  });
  expect(mapBlockToFeature(face({}))?.geometry).toEqual({
    type: "LineString",
    coordinates: [
      [151.0, -33.9],
      [151.1, -33.9],
    ],
  });

  // Too few coordinates produce no feature.
  expect(mapBlockToFeature(block({ coordinates: [[151.0, -33.9]] }))).toBe(null);
  expect(mapBlockToFeature(face({ coordinates: [[151.0, -33.9]] }))).toBe(null);

  const geojson = mapBlocksToGeoJSON([
    block({}),
    face({}),
    face({ id: "face-2", coordinates: [] }),
  ]);
  expect(geojson.type).toBe("FeatureCollection");
  // Each block and face also emits label anchor points so the labels layer
  // renders its name: blocks anchor inside their ring, faces at both ends
  // of their line.
  expect(geojson.features).toHaveLength(5);
  const blockLabel = geojson.features[1];
  expect(blockLabel.geometry.type).toBe("Point");
  const [blockLng, blockLat] = (blockLabel.geometry as { coordinates: number[] }).coordinates;
  expect(blockLng).toBeCloseTo(151.0667, 4);
  expect(blockLat).toBeCloseTo(-33.8667, 4);
  expect(blockLabel.properties).toEqual({
    id: "block-1",
    name: "Block 1",
    type: "block",
  });
  expect(geojson.features[3].geometry).toEqual({
    type: "Point",
    coordinates: [151.0, -33.9],
  });
  expect(geojson.features[4].geometry).toEqual({
    type: "Point",
    coordinates: [151.1, -33.9],
  });
  for (const faceLabel of geojson.features.slice(3)) {
    expect(faceLabel.properties).toEqual({
      id: "face-1",
      name: "Main St",
      type: "face",
    });
  }
  // A face whose ends share a coordinate emits a single anchor.
  expect(
    mapBlocksToGeoJSON([
      face({
        coordinates: [
          [151.0, -33.9],
          [151.05, -33.9],
          [151.0, -33.9],
        ],
      }),
    ]).features,
  ).toHaveLength(2);
  expect(mapBlocksToGeoJSON(null).features).toHaveLength(0);
  expect(mapBlocksToGeoJSON(undefined).features).toHaveLength(0);
});

test("filters and sorts map rows by alphanumeric name search", () => {
  const row = (overrides: Partial<MapRow>): MapRow => ({
    congregation_id: "cong-1",
    name: "Map 1",
    ...overrides,
  });
  const rows = [
    row({ id: "map-10", name: "Map #10" }),
    row({ id: "map-2", name: "Map #2" }),
    row({ id: "map-1", name: "Café District", details: "North section" }),
    row({ id: "map-3", name: "South", details: "Includes map 4 streets" }),
  ];
  const ids = (result: MapRow[]) => result.map((r) => r.id);

  // Alphabetically sorted with numeric ordering: Map #2 before Map #10.
  expect(ids(filterMapRows(rows, ""))).toEqual(["map-1", "map-2", "map-10", "map-3"]);

  // Punctuation and diacritics do not need to be typed.
  expect(ids(filterMapRows(rows, "map2"))).toEqual(["map-2"]);
  expect(ids(filterMapRows(rows, "cafe"))).toEqual(["map-1"]);

  // Details are searchable too.
  expect(ids(filterMapRows(rows, "map4"))).toEqual(["map-3"]);

  // A query with no alphanumeric characters applies no filter.
  expect(filterMapRows(rows, "#-!")).toHaveLength(4);
  expect(filterMapRows(rows, "zzz")).toHaveLength(0);

  // Recent selections lead in reverse-chronological order, limited to the
  // configured count; the rest stay alphabetically sorted.
  expect(ids(filterMapRows(rows, "", ["missing-map", "map-3", "map-10", "map-2"], 2))).toEqual([
    "map-3",
    "map-10",
    "map-1",
    "map-2",
  ]);
  expect(ids(filterMapRows(rows, "map", ["map-3", "map-10"], 2))).toEqual([
    "map-3",
    "map-10",
    "map-2",
  ]);
  expect(ids(sortMapRowsByRecency(rows, ["map-3"], 0))).toEqual([
    "map-1",
    "map-2",
    "map-10",
    "map-3",
  ]);

  expect(recentMapRowKeys(rows, ["missing-map", "map-3", "map-10", "map-2"], 2)).toEqual([
    "map-3",
    "map-10",
  ]);
  const sections = buildMapRowListSections(
    rows,
    "",
    ["missing-map", "map-3", "map-10", "map-2"],
    2,
  );
  expect(ids(sections.recentRows)).toEqual(["map-3", "map-10"]);
  // The all-maps section is not a complement of the recent section: recently
  // selected rows remain listed alphabetically with every other map.
  expect(ids(sections.allRows)).toEqual(["map-1", "map-2", "map-10", "map-3"]);

  const searchedSections = buildMapRowListSections(rows, "map", ["map-3", "map-10"], 1);
  expect(ids(searchedSections.recentRows)).toEqual(["map-3"]);
  expect(ids(searchedSections.allRows)).toEqual(["map-2", "map-10", "map-3"]);
});

test("renders a fallback message when no access token is configured", () => {
  const markup = renderToStaticMarkup(createElement(MapView, { accessToken: null }));
  expect(markup).toContain("ion-note");
  expect(markup).toContain("VITE_MAPBOX_ACCESS_TOKEN");

  const custom = renderToStaticMarkup(
    createElement(MapView, { accessToken: "", missingTokenMessage: "No token configured" }),
  );
  expect(custom).toContain("No token configured");
});

test("shows edit color scheme settings only when map editing is permitted", () => {
  const noop = () => {};
  const hidden = renderToStaticMarkup(
    createElement(MapEditColorSchemeSelect, {
      visible: false,
      value: "multicolored",
      onChange: noop,
    }),
  );
  expect(hidden).not.toContain("ion-select");

  const visible = renderToStaticMarkup(
    createElement(MapEditColorSchemeSelect, {
      visible: true,
      value: "multicolored",
      onChange: noop,
    }),
  );
  expect(visible).toContain("ion-select");
  expect(visible).toContain("Multicolored");
});

test("converts not-at-home view rows to markers grouped by address", () => {
  const row = (overrides: Partial<NotAtHomeRow>): NotAtHomeRow => ({
    id: "nah-1",
    congregation_id: "cong-1",
    house_number: "12",
    longitude: 151.2,
    latitude: -33.8,
    ...overrides,
  });

  expect(notAtHomeRowSchema.safeParse(row({})).success).toBe(true);
  expect(notAtHomeRowSchema.safeParse(row({ id: "" })).success).toBe(false);
  expect(notAtHomeRowSchema.safeParse({ ...row({}), house_number: null }).success).toBe(false);

  expect(
    notAtHomeRowToMarker(row({ street_name: "Main St", suburb_name: "Springfield" })),
  ).toMatchObject({
    street: "Main St",
    suburb: "Springfield",
    coordinates: [151.2, -33.8],
  });
  expect(notAtHomeRowToMarker(row({}))).toMatchObject({ street: "", suburb: "" });
  // Nullable view columns normalize so marker logic and Mapbox filters agree.
  expect(notAtHomeRowToMarker(row({ write: null }))?.write).toBe(false);
  expect(notAtHomeRowToMarker(row({ longitude: null }))).toBe(null);
  expect(notAtHomeRowToMarker(row({ latitude: null }))).toBe(null);

  // Units of one house share a suburb|street|house_number key; other houses do not.
  const groups = groupNotAtHomeMarkers([
    row({ id: "nah-1", unit_number: "3", street_name: "Main St", suburb_name: "Springfield" }),
    row({ id: "nah-2", unit_number: "7", street_name: "Main St", suburb_name: "Springfield" }),
    row({ id: "nah-3", house_number: "14", street_name: "Main St", suburb_name: "Springfield" }),
    row({ id: "nah-4", house_number: "12", street_name: "Main St", suburb_name: "Other" }),
    row({ id: "nah-5", house_number: "99", longitude: null }),
  ]);
  expect(Object.keys(groups)).toHaveLength(3);
  expect(groups["Springfield|Main St|12"]).toHaveLength(2);
  expect(groups["Springfield|Main St|14"]).toHaveLength(1);
  expect(groups["Other|Main St|12"]).toHaveLength(1);

  expect(NOT_AT_HOME_STALE_DAY_CHOICES).toContain(0);
  expect(NOT_AT_HOME_STALE_DAY_CHOICES).toContain(90);
  expect(typeof NotAtHomesLayer).toBe("function");
  expect(typeof useNotAtHomes).toBe("function");
  expect(typeof MapSettingsModal).toBe("function");
  expect(typeof MapEditModal).toBe("function");
});

test("sorts, renames, and removes map blocks and faces", () => {
  const blocks: MapBlock[] = [
    { id: "b-10", name: "Block 10", type: "block", coordinates: [] },
    { id: "f-1", name: "Oak St", type: "face", coordinates: [] },
    { id: "b-2", name: "Block 2", type: "block", coordinates: [] },
  ];

  // Alphabetically sorted with numeric ordering: Block 2 before Block 10.
  expect(sortMapBlocks(blocks).map((block) => block.id)).toEqual(["b-2", "b-10", "f-1"]);
  expect(sortMapBlocks(null)).toEqual([]);
  expect(sortMapBlocks(undefined)).toEqual([]);

  const renamed = renameMapBlock(blocks, "b-2", "Renamed");
  expect(renamed.find((block) => block.id === "b-2")?.name).toBe("Renamed");
  // The original array is left unchanged so optimistic updates stay pure.
  expect(blocks.find((block) => block.id === "b-2")?.name).toBe("Block 2");
  expect(renameMapBlock(blocks, "missing", "X")).toEqual(blocks);
  expect(renameMapBlock(null, "b-2", "X")).toEqual([]);

  expect(removeMapBlock(blocks, "b-2").map((block) => block.id)).toEqual(["b-10", "f-1"]);
  expect(removeMapBlock(blocks, "missing")).toEqual(blocks);
  expect(removeMapBlock(null, "b-2")).toEqual([]);
});

test("sorts and finds map tags, and builds assignment keys", () => {
  const tag = (overrides: Partial<MapTagRow>): MapTagRow => ({
    id: "tag-1",
    congregation_id: "cong-1",
    name: "Business",
    ...overrides,
  });
  const tags = [
    tag({ id: "t-10", name: "Tag 10" }),
    tag({}),
    tag({ id: "t-2", name: "Tag 2" }),
    tag({ id: "t-3", name: "Café Row" }),
  ];

  expect(mapTagRowSchema.safeParse(tag({})).success).toBe(true);
  expect(mapTagRowSchema.safeParse({ ...tag({}), congregation_id: "" }).success).toBe(false);
  expect(mapTagAssignmentRowSchema.safeParse({ map_id: "m-1", tag_id: "t-1" }).success).toBe(true);
  expect(mapTagAssignmentRowSchema.safeParse({ map_id: "", tag_id: "t-1" }).success).toBe(false);

  // Matches the composite getKey for keyColumns ["map_id", "tag_id"].
  expect(mapTagAssignmentKey("m-1", "t-1")).toBe(JSON.stringify(["m-1", "t-1"]));

  expect(sortMapTags(tags).map((t) => t.id)).toEqual(["tag-1", "t-3", "t-2", "t-10"]);
  expect(sortMapTags(null)).toEqual([]);

  // Lookup ignores case, punctuation, and diacritics so "New Tag" can reuse an
  // existing tag instead of creating a near-duplicate.
  expect(findMapTagByName(tags, "business")?.id).toBe("tag-1");
  expect(findMapTagByName(tags, "  TAG 2 ")?.id).toBe("t-2");
  expect(findMapTagByName(tags, "tag-2")?.id).toBe("t-2");
  expect(findMapTagByName(tags, "cafe row")?.id).toBe("t-3");
  expect(findMapTagByName(tags, "missing")).toBe(null);
  expect(findMapTagByName(tags, "   ")).toBe(null);
  expect(findMapTagByName(null, "business")).toBe(null);

  expect(typeof useMapTags).toBe("function");
  expect(typeof useMapTagAssignments).toBe("function");
});

test("builds not-at-home features with unit grouping, counts, and stale flags", () => {
  const DAY_MS = 24 * 60 * 60 * 1000;
  const now = Date.parse("2026-06-01T00:00:00Z");
  const fresh = new Date(now - 10 * DAY_MS).toISOString();
  const old = new Date(now - 100 * DAY_MS).toISOString();

  const marker = (overrides: Partial<NotAtHomeMarker>): NotAtHomeMarker => ({
    id: "nah-1",
    congregation_id: "cong-1",
    house_number: "12",
    unit_number: null,
    street_name: "Main St",
    suburb_name: "Springfield",
    full_address: "12 Main St, Springfield",
    write: false,
    created_at: fresh,
    longitude: 151.2,
    latitude: -33.8,
    street: "Main St",
    suburb: "Springfield",
    coordinates: [151.2, -33.8],
    ...overrides,
  });

  const single = buildNotAtHomeFeatures({ "Springfield|Main St|12": [marker({})] }, 90, now)[0];
  expect(single.id).toBe("nah-1");
  expect(single.geometry).toEqual({ type: "Point", coordinates: [151.2, -33.8] });
  expect(single.properties).toMatchObject({
    group_key: "Springfield|Main St|12",
    unit_count: 1,
    write_count: 0,
    return_count: 1,
    stale: false,
  });

  const grouped = buildNotAtHomeFeatures(
    {
      "Springfield|Main St|12": [
        marker({ id: "nah-1", unit_number: "3" }),
        marker({ id: "nah-2", unit_number: "7", write: true }),
      ],
    },
    90,
    now,
  )[0];
  expect(grouped.properties).toMatchObject({
    unit_count: 2,
    write_count: 1,
    return_count: 1,
    stale: false,
  });
  expect(grouped.properties.unit_data).toHaveLength(2);

  // A return visit older than staleDays is stale; write entries never are.
  const stale = buildNotAtHomeFeatures(
    { "Springfield|Main St|12": [marker({ created_at: old })] },
    90,
    now,
  )[0];
  expect(stale.properties.stale).toBe(true);
  const stillFresh = buildNotAtHomeFeatures(
    { "Springfield|Main St|12": [marker({ created_at: fresh })] },
    90,
    now,
  )[0];
  expect(stillFresh.properties.stale).toBe(false);
  const writeEntry = buildNotAtHomeFeatures(
    { "Springfield|Main St|12": [marker({ write: true, created_at: old })] },
    90,
    now,
  )[0];
  expect(writeEntry.properties.stale).toBe(false);

  // staleDays of 0 disables aging entirely.
  const neverStale = buildNotAtHomeFeatures(
    { "Springfield|Main St|12": [marker({ created_at: old })] },
    0,
    now,
  )[0];
  expect(neverStale.properties.stale).toBe(false);

  // A group is only stale when every return visit in it is stale.
  const mixedAge = buildNotAtHomeFeatures(
    {
      "Springfield|Main St|12": [
        marker({ id: "nah-1", unit_number: "3", created_at: old }),
        marker({ id: "nah-2", unit_number: "7", created_at: fresh }),
      ],
    },
    90,
    now,
  )[0];
  expect(mixedAge.properties.stale).toBe(false);
});

test("filters not-at-home features by the hide_old and hide_new visibility options", () => {
  const DAY_MS = 24 * 60 * 60 * 1000;
  const now = Date.parse("2026-06-01T00:00:00Z");
  const fresh = new Date(now - 10 * DAY_MS).toISOString();
  const old = new Date(now - 100 * DAY_MS).toISOString();

  const marker = (overrides: Partial<NotAtHomeMarker>): NotAtHomeMarker => ({
    id: "nah-1",
    congregation_id: "cong-1",
    house_number: "12",
    unit_number: null,
    street_name: "Main St",
    suburb_name: "Springfield",
    full_address: null,
    write: false,
    created_at: fresh,
    longitude: 151.2,
    latitude: -33.8,
    street: "Main St",
    suburb: "Springfield",
    coordinates: [151.2, -33.8],
    ...overrides,
  });

  const groups = {
    "Springfield|Main St|12": [marker({ id: "fresh", created_at: fresh })],
    "Springfield|Main St|14": [marker({ id: "stale", house_number: "14", created_at: old })],
    "Springfield|Main St|16": [
      marker({ id: "write", house_number: "16", write: true, created_at: old }),
    ],
  };

  const all = buildNotAtHomeFeatures(groups, 90, now, "all");
  expect(all.map((feature) => feature.id).sort()).toEqual(["fresh", "stale", "write"]);

  const hideOld = buildNotAtHomeFeatures(groups, 90, now, "hide_old");
  expect(hideOld.map((feature) => feature.id).sort()).toEqual(["fresh", "write"]);

  // Hide New keeps stale groups and write-only houses; fresh return visits go.
  const hideNew = buildNotAtHomeFeatures(groups, 90, now, "hide_new");
  expect(hideNew.map((feature) => feature.id).sort()).toEqual(["stale", "write"]);
});

test("assigns multicolored edit colors from the final map-name character", () => {
  expect(MAP_EDIT_MULTICOLOR_PALETTE).toHaveLength(10);
  expect(new Set(MAP_EDIT_MULTICOLOR_PALETTE).size).toBe(10);
  expect(mapEditFeatureColor({ mapName: "04-01" }, "standard")).toBe(MAP_PRIMARY_COLOR);
  expect(mapEditFeatureColor({ mapName: "04-01" }, "multicolored")).toBe(
    MAP_EDIT_MULTICOLOR_PALETTE[0],
  );
  expect(mapEditFeatureColor({ mapName: "07-02" }, "multicolored")).toBe(
    MAP_EDIT_MULTICOLOR_PALETTE[1],
  );
  expect(mapEditFeatureColor({ mapName: "01-20" }, "multicolored")).toBe(
    MAP_EDIT_MULTICOLOR_PALETTE[9],
  );
  expect(mapEditFeatureColor({ mapName: "20-09a" }, "multicolored")).toBe(
    MAP_EDIT_MULTICOLOR_PALETTE[0],
  );
  expect(mapEditFeatureColor({ mapName: "20-13C " }, "multicolored")).toBe(
    MAP_EDIT_MULTICOLOR_PALETTE[2],
  );
  expect(mapEditFeatureColor({ mapName: "20-31j" }, "multicolored")).toBe(
    MAP_EDIT_MULTICOLOR_PALETTE[9],
  );
  expect(mapEditFeatureColor({ mapName: "04-01" }, "multicolored")).toBe(
    mapEditFeatureColor({ mapName: "04-01" }, "multicolored"),
  );
  expect(mapEditFeatureColor({ mapId: "04-01" }, "multicolored")).toBe(MAP_PRIMARY_COLOR);
  expect(mapEditFeatureColor({ mapName: "Custom" }, "multicolored")).toBe(MAP_PRIMARY_COLOR);
  expect(mapEditFeatureColor({}, "multicolored")).toBe(MAP_PRIMARY_COLOR);
});

test("builds editable features from map borders, blocks, faces, and the master border", () => {
  const ring = [
    [151.0, -33.9],
    [151.1, -33.9],
    [151.1, -33.8],
    [151.0, -33.9],
  ] as [number, number][];
  const row = (overrides: Partial<MapRow>): MapRow => ({
    congregation_id: "cong-1",
    name: "Map 1",
    ...overrides,
  });
  const master: MapMasterRow = { congregation_id: "cong-1", boundary: ring };
  const maps = [
    row({
      id: "map-1",
      boundary: ring,
      blocks: [
        { id: "b-1", name: "Block 1", type: "block", coordinates: ring.slice(0, 3) },
        {
          id: "f-1",
          name: "Main St",
          type: "face",
          coordinates: [
            [151.0, -33.9],
            [151.1, -33.9],
          ],
        },
        { id: "f-2", name: "Short", type: "face", coordinates: [[151.0, -33.9]] },
      ],
    }),
    row({ id: "map-2", boundary: ring }),
    row({ name: "No id", boundary: ring }),
  ];

  expect(mapEditFeatureId("master")).toBe("master");
  expect(mapEditFeatureId("border", "map-1")).toBe("border:map-1");
  expect(mapEditFeatureId("face", "map-1", "f-1")).toBe("face:map-1:f-1");

  const features = buildMapEditFeatures(maps, "map-1", master);
  expect(features.map((feature) => feature.id).sort()).toEqual(
    ["block:map-1:b-1", "border:map-1", "border:map-2", "face:map-1:f-1", "master"].sort(),
  );

  const border = features.find((feature) => feature.id === "border:map-1")!;
  expect(border.properties).toEqual({
    mode: "polygon",
    kind: "border",
    mapId: "map-1",
    mapName: "Map 1",
  });
  expect(border.geometry).toEqual({ type: "Polygon", coordinates: [ring] });

  // Open block rings are closed for the editable polygon.
  expect(features.find((feature) => feature.id === "block:map-1:b-1")?.geometry).toEqual({
    type: "Polygon",
    coordinates: [ring],
  });
  const face = features.find((feature) => feature.id === "face:map-1:f-1")!;
  expect(face.geometry).toEqual({
    type: "LineString",
    coordinates: [
      [151.0, -33.9],
      [151.1, -33.9],
    ],
  });
  expect(face.properties).toEqual({
    mode: "linestring",
    kind: "face",
    mapId: "map-1",
    mapName: "Map 1",
    blockId: "f-1",
  });

  // Blocks and faces belong to the selected map only; rows without an id are
  // skipped because they cannot be persisted.
  expect(
    buildMapEditFeatures(maps, "map-2", master)
      .map((feature) => feature.properties.kind)
      .sort(),
  ).toEqual(["border", "border", "master"]);
  expect(
    buildMapEditFeatures(maps, null, null)
      .map((feature) => feature.id)
      .sort(),
  ).toEqual(["border:map-1", "border:map-2"]);

  expect(mapMasterToEditFeature(master)?.id).toBe("master");
  expect(mapMasterToEditFeature(null)).toBe(null);
  expect(mapRowToEditFeatures(row({ boundary: ring }), false)).toEqual([]);

  expect(sortMapEditFeaturesForSelection(features).map((feature) => feature.id)).toEqual([
    "face:map-1:f-1",
    "block:map-1:b-1",
    "border:map-1",
    "border:map-2",
    "master",
  ]);

  // Store snapshots narrow back to editable features; Terra Draw's guidance
  // features (selection points, midpoints) carry no kind and are ignored.
  const snapshot = features.map((feature) => feature);
  expect(snapshot.map(asMapEditFeature).filter(Boolean)).toHaveLength(features.length);
  expect(
    asMapEditFeature({
      id: "guidance",
      geometry: { type: "Point", coordinates: [151.0, -33.9] },
      properties: { mode: "select", selectionPoint: true },
    }),
  ).toBe(null);
});

test("calculates the next overlapping edit feature selection index", () => {
  expect(nextMapEditSelectionIndex(0, -1, false)).toBe(null);
  expect(nextMapEditSelectionIndex(3, -1, false)).toBe(0);
  expect(nextMapEditSelectionIndex(3, -1, true)).toBe(0);
  expect(nextMapEditSelectionIndex(3, 0, false)).toBe(0);
  expect(nextMapEditSelectionIndex(3, 0, true)).toBe(1);
  expect(nextMapEditSelectionIndex(3, 1, true)).toBe(2);
  expect(nextMapEditSelectionIndex(3, 2, true)).toBe(0);
  expect(nextMapEditSelectionIndex(3, 3, true)).toBe(0);
});

test("applies edited features back onto map and master rows", () => {
  const ring = [
    [151.0, -33.9],
    [151.1, -33.9],
    [151.1, -33.8],
    [151.0, -33.9],
  ] as [number, number][];
  const moved = [
    [152.0, -32.9],
    [152.1, -32.9],
    [152.1, -32.8],
    [152.0, -32.9],
  ];
  const draft: MapRow = {
    id: "map-1",
    congregation_id: "cong-1",
    name: "Map 1",
    boundary: ring,
    blocks: [
      { id: "b-1", name: "Block 1", type: "block", coordinates: ring },
      {
        id: "f-1",
        name: "Main St",
        type: "face",
        coordinates: [
          [151.0, -33.9],
          [151.1, -33.9],
        ],
      },
    ],
  };
  const editFeature = (feature: Partial<MapEditFeature>): MapEditFeature => ({
    type: "Feature",
    id: "border:map-1",
    geometry: { type: "Polygon", coordinates: [moved] },
    properties: { mode: "polygon", kind: "border", mapId: "map-1" },
    ...feature,
  });

  applyMapEditFeatureToRow(draft, editFeature({}));
  expect(draft.boundary).toEqual(moved);

  applyMapEditFeatureToRow(
    draft,
    editFeature({
      id: "face:map-1:f-1",
      geometry: {
        type: "LineString",
        coordinates: [
          [150.9, -33.9],
          [151.2, -33.9],
        ],
      },
      properties: { mode: "linestring", kind: "face", mapId: "map-1", blockId: "f-1" },
    }),
  );
  expect(draft.blocks?.[1].coordinates).toEqual([
    [150.9, -33.9],
    [151.2, -33.9],
  ]);
  // Sibling blocks are untouched.
  expect(draft.blocks?.[0].coordinates).toEqual(ring);

  // Unknown block ids and non-edit kinds leave the row alone.
  applyMapEditFeatureToRow(
    draft,
    editFeature({
      id: "block:map-1:missing",
      properties: { mode: "polygon", kind: "block", mapId: "map-1", blockId: "missing" },
    }),
  );
  expect(draft.blocks).toHaveLength(2);

  const masterDraft: MapMasterRow = { congregation_id: "cong-1", boundary: ring };
  applyMapEditFeatureToMaster(
    masterDraft,
    editFeature({ id: "master", properties: { mode: "polygon", kind: "master" } }),
  );
  expect(masterDraft.boundary).toEqual(moved);
  applyMapEditFeatureToMaster(
    masterDraft,
    editFeature({ properties: { mode: "polygon", kind: "border", mapId: "map-1" } }),
  );
  expect(masterDraft.boundary).toEqual(moved);
});

test("replaces polygon and line vertices while keeping rings closed", () => {
  const polygon = {
    type: "Polygon" as const,
    coordinates: [
      [
        [151.0, -33.9],
        [151.1, -33.9],
        [151.1, -33.8],
        [151.0, -33.9],
      ],
    ],
  };
  const movedRing = replaceMapEditVertex(polygon, 0, [152, -32]);
  expect(movedRing?.type).toBe("Polygon");
  expect(movedRing?.type === "Polygon" ? movedRing.coordinates[0] : []).toEqual([
    [152, -32],
    [151.1, -33.9],
    [151.1, -33.8],
    [152, -32],
  ]);
  const movedMiddle = replaceMapEditVertex(polygon, 1, [152, -32]);
  expect(movedMiddle?.type === "Polygon" ? movedMiddle.coordinates[0][1] : null).toEqual([
    152, -32,
  ]);

  const line = {
    type: "LineString" as const,
    coordinates: [
      [151.0, -33.9],
      [151.1, -33.9],
    ],
  };
  expect(replaceMapEditVertex(line, 1, [152, -32])).toEqual({
    type: "LineString",
    coordinates: [
      [151.0, -33.9],
      [152, -32],
    ],
  });
  expect(replaceMapEditVertex(line, 2, [152, -32])).toBeNull();
});

test("removes polygon and line vertices without dropping minimum geometry", () => {
  const polygon = {
    type: "Polygon" as const,
    coordinates: [
      [
        [151.0, -33.9],
        [151.1, -33.9],
        [151.1, -33.8],
        [151.0, -33.8],
        [151.0, -33.9],
      ],
    ],
  };
  expect(removeMapEditVertex(polygon, 1)).toEqual({
    type: "Polygon",
    coordinates: [
      [
        [151.0, -33.9],
        [151.1, -33.8],
        [151.0, -33.8],
        [151.0, -33.9],
      ],
    ],
  });
  expect(removeMapEditVertex(polygon, 0)).toEqual({
    type: "Polygon",
    coordinates: [
      [
        [151.1, -33.9],
        [151.1, -33.8],
        [151.0, -33.8],
        [151.1, -33.9],
      ],
    ],
  });

  const triangle = {
    type: "Polygon" as const,
    coordinates: [
      [
        [151.0, -33.9],
        [151.1, -33.9],
        [151.1, -33.8],
        [151.0, -33.9],
      ],
    ],
  };
  expect(removeMapEditVertex(triangle, 1)).toBeNull();

  const line = {
    type: "LineString" as const,
    coordinates: [
      [151.0, -33.9],
      [151.1, -33.9],
      [151.2, -33.9],
    ],
  };
  expect(removeMapEditVertex(line, 1)).toEqual({
    type: "LineString",
    coordinates: [
      [151.0, -33.9],
      [151.2, -33.9],
    ],
  });
  expect(
    removeMapEditVertex(
      {
        type: "LineString",
        coordinates: [
          [151.0, -33.9],
          [151.1, -33.9],
        ],
      },
      1,
    ),
  ).toBeNull();
});

test("exposes every editable feature vertex as a point for edit mode", () => {
  const ring = [
    [151.0, -33.9],
    [151.1, -33.9],
    [151.1, -33.8],
    [151.0, -33.9],
  ] as [number, number][];
  const features = buildMapEditFeatures(
    [
      {
        id: "map-1",
        congregation_id: "cong-1",
        name: "Map 1",
        boundary: ring,
        blocks: [
          {
            id: "f-1",
            name: "Main St",
            type: "face",
            coordinates: [
              [151.0, -33.9],
              [151.1, -33.9],
            ],
          },
        ],
      },
    ],
    "map-1",
    null,
  );

  // The closed ring's duplicated final coordinate is not double-counted.
  const vertices = mapEditVerticesToGeoJSON(features);
  expect(vertices.type).toBe("FeatureCollection");
  expect(vertices.features).toHaveLength(5);
  expect(vertices.features[0].geometry).toEqual({ type: "Point", coordinates: [151.0, -33.9] });
  expect(vertices.features[0].properties).toEqual({
    feature: "border:map-1",
    index: 0,
    selected: false,
    color: MAP_PRIMARY_COLOR,
    zIndex: 1,
  });
  const selectedVertices = mapEditVerticesToGeoJSON([
    {
      ...features[0],
      properties: { ...features[0].properties, selected: true },
    },
  ]);
  expect(selectedVertices.features[0].properties.selected).toBe(true);
  expect(selectedVertices.features[0].properties.zIndex).toBe(21);
  expect(mapEditVerticesToGeoJSON(features, "multicolored").features[0].properties.color).toBe(
    mapEditFeatureColor({ mapName: "Map 1" }, "multicolored"),
  );

  const mapSelectedVertices = mapEditVerticesToGeoJSON(features, "standard", "map-1");
  expect(mapSelectedVertices.features.map((point) => point.properties.zIndex)).toEqual([
    11, 11, 11, 13, 13,
  ]);
  const featureSelectedVertices = mapEditVerticesToGeoJSON(
    [
      {
        ...features[0],
        properties: { ...features[0].properties, selected: true },
      },
      features[1],
    ],
    "standard",
    "map-1",
  );
  expect(featureSelectedVertices.features.at(-1)?.properties).toMatchObject({
    feature: "border:map-1",
    zIndex: 31,
  });

  expect(mapEditVerticesToGeoJSON([]).features).toHaveLength(0);
  expect(
    mapEditVerticesToGeoJSON([
      { id: "pt", geometry: { type: "Point", coordinates: [1, 1] }, properties: {} },
    ]).features,
  ).toHaveLength(0);

  expect(typeof MapEditLayer).toBe("function");
});

import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { expect, test } from "vite-plus/test";

import {
  areCoordinatesEqual,
  boundariesToBounds,
  boundaryToBounds,
  boundaryToLabelPoint,
  boundaryToPolygonCoords,
  buildNotAtHomeFeatures,
  clampMapZoom,
  DEFAULT_MAP_CENTER,
  ensureClosedRing,
  filterMapRows,
  groupNotAtHomeMarkers,
  isClosedRing,
  isMapboxAccessToken,
  isValidBoundary,
  isValidCoordinates,
  isValidMapViewState,
  mapBlocksToGeoJSON,
  mapBlockToFeature,
  MAPBOX_DARK_STYLE,
  MAPBOX_LIGHT_STYLE,
  MAP_DEFAULT_ZOOM,
  MAP_MAX_ZOOM,
  MAP_MIN_ZOOM,
  MAP_VIEW_STATE_STORAGE_KEY,
  mapRowSchema,
  mapRowsToBounds,
  mapRowsToGeoJSON,
  MapsLayer,
  MapSettingsModal,
  MapView,
  NOT_AT_HOME_STALE_DAY_CHOICES,
  notAtHomeRowSchema,
  notAtHomeRowToMarker,
  NotAtHomesLayer,
  readMapViewState,
  resolveMapStyle,
  toMapboxCenter,
  useMapPolygons,
  useMapView,
  useNotAtHomes,
  writeMapViewState,
  type MapBlock,
  type MapRow,
  type NotAtHomeMarker,
  type NotAtHomeRow,
} from "../src/feature/map/index.ts";

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
  // Each block and face also emits a label anchor point so the labels layer
  // renders one name per feature: blocks anchor inside their ring, faces at
  // their last coordinate.
  expect(geojson.features).toHaveLength(4);
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
    coordinates: [151.1, -33.9],
  });
  expect(geojson.features[3].properties).toEqual({
    id: "face-1",
    name: "Main St",
    type: "face",
  });
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

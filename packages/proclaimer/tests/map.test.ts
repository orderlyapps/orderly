import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { expect, test } from "vite-plus/test";

import {
  areCoordinatesEqual,
  blockToLineString,
  blockToPolygon,
  buildTerritoryGeoJson,
  clampMapZoom,
  DEFAULT_MAP_CENTER,
  geoJsonBounds,
  isMapboxAccessToken,
  isTerritoryRing,
  isValidCoordinates,
  isValidMapViewState,
  MAPBOX_DARK_STYLE,
  MAPBOX_LIGHT_STYLE,
  MAP_DEFAULT_ZOOM,
  MAP_MAX_ZOOM,
  MAP_MIN_ZOOM,
  MAP_VIEW_STATE_STORAGE_KEY,
  MapListModal,
  MapView,
  readMapViewState,
  resolveMapStyle,
  ringBounds,
  ringToPolygon,
  territoryMapBounds,
  toMapboxCenter,
  unionBounds,
  useMapboxMap,
  writeMapViewState,
  type MapMasterRow,
  type TerritoryMap,
} from "../src/feature/map/index.ts";

test("validates coordinates, tokens, zoom bounds, and style resolution", () => {
  expect(MAPBOX_LIGHT_STYLE).toBe("mapbox://styles/mapbox/streets-v12");
  expect(MAPBOX_DARK_STYLE).toBe("mapbox://styles/mapbox/dark-v11");
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
  expect(typeof MapListModal).toBe("function");
  expect(typeof useMapboxMap).toBe("function");
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

test("renders a fallback message when no access token is configured", () => {
  const markup = renderToStaticMarkup(createElement(MapView, { accessToken: null }));
  expect(markup).toContain("ion-note");
  expect(markup).toContain("VITE_MAPBOX_ACCESS_TOKEN");

  const custom = renderToStaticMarkup(
    createElement(MapView, { accessToken: "", missingTokenMessage: "No token configured" }),
  );
  expect(custom).toContain("No token configured");
});

test("validates territory rings and converts them to GeoJSON geometry", () => {
  const openRing: [number, number][] = [
    [151.2, -33.8],
    [151.21, -33.8],
    [151.21, -33.81],
    [151.2, -33.81],
  ];
  const closedRing: [number, number][] = [...openRing, [151.2, -33.8]];

  expect(isTerritoryRing(openRing)).toBe(true);
  expect(isTerritoryRing(closedRing)).toBe(true);
  expect(isTerritoryRing([])).toBe(false);
  expect(isTerritoryRing([[1]])).toBe(false);
  expect(isTerritoryRing([["a", "b"]])).toBe(false);
  expect(isTerritoryRing("not a ring")).toBe(false);

  const polygon = ringToPolygon(openRing);
  expect(polygon?.type).toBe("Polygon");
  // Open rings are closed by repeating the first position.
  expect(polygon?.coordinates[0]).toEqual(closedRing);
  expect(ringToPolygon(closedRing)?.coordinates[0]).toEqual(closedRing);
  expect(ringToPolygon(openRing.slice(0, 3))).toBe(null);
  expect(ringToPolygon(null)).toBe(null);

  // Blocks accept a triangle; faces need only two positions.
  expect(blockToPolygon(openRing.slice(0, 3))?.type).toBe("Polygon");
  expect(blockToPolygon(openRing.slice(0, 2))).toBe(null);
  expect(blockToLineString(openRing.slice(0, 2))?.type).toBe("LineString");
  expect(blockToLineString(openRing.slice(0, 1))).toBe(null);
});

test("computes bounds for rings and unions them", () => {
  const ring: [number, number][] = [
    [151.2, -33.8],
    [151.3, -33.9],
    [151.25, -33.85],
  ];
  expect(ringBounds(ring)).toEqual([
    [151.2, -33.9],
    [151.3, -33.8],
  ]);
  expect(ringBounds("bad")).toBe(null);

  const other = ringBounds([
    [151.1, -33.85],
    [151.22, -33.7],
  ]);
  expect(unionBounds(ringBounds(ring), other)).toEqual([
    [151.1, -33.9],
    [151.3, -33.7],
  ]);
  expect(unionBounds(null, other)).toEqual(other);
  expect(unionBounds(ringBounds(ring), null)).toEqual(ringBounds(ring));
  expect(unionBounds(null, null)).toBe(null);
});

test("builds GeoJSON feature collections from territory rows", () => {
  const boundary: [number, number][] = [
    [151.2, -33.8],
    [151.21, -33.8],
    [151.21, -33.81],
    [151.2, -33.81],
  ];
  const maps: TerritoryMap[] = [
    {
      id: "map-1",
      congregation_id: "cong-1",
      name: "Central 1",
      details: "CBD",
      url: null,
      boundary,
      blocks: [
        {
          id: "block-1",
          name: "Pitt St",
          type: "face",
          coordinates: [
            [151.205, -33.805],
            [151.205, -33.806],
          ],
        },
        {
          id: "block-2",
          name: "North block",
          type: "block",
          coordinates: boundary.slice(0, 3) as [number, number][],
        },
      ],
    },
    {
      id: "map-2",
      congregation_id: "cong-1",
      name: "No boundary",
      details: null,
      url: null,
      boundary: null,
      blocks: null,
    },
  ];
  const master: MapMasterRow[] = [
    { congregation_id: "cong-1", boundary, details: "Whole territory" },
    { congregation_id: "cong-1", boundary: "corrupt", details: null },
  ];

  const geojson = buildTerritoryGeoJson(maps, master);

  // Invalid master boundary is skipped.
  expect(geojson.master.features).toHaveLength(1);
  expect(geojson.master.features[0].properties.details).toBe("Whole territory");

  // Only the map with a boundary becomes a polygon feature.
  expect(geojson.maps.features).toHaveLength(1);
  expect(geojson.maps.features[0].properties).toEqual({
    id: "map-1",
    name: "Central 1",
    details: "CBD",
  });
  expect(geojson.maps.features[0].geometry.type).toBe("Polygon");

  // Face blocks become LineStrings, block types become closed Polygons.
  expect(geojson.blocks.features).toHaveLength(2);
  expect(geojson.blocks.features[0].geometry.type).toBe("LineString");
  expect(geojson.blocks.features[0].properties.kind).toBe("face");
  expect(geojson.blocks.features[1].geometry.type).toBe("Polygon");
  expect(geojson.blocks.features[1].properties.mapId).toBe("map-1");

  const bounds = geoJsonBounds(geojson);
  expect(bounds?.[0][0]).toBeCloseTo(151.2);
  expect(bounds?.[0][1]).toBeCloseTo(-33.81);
  expect(bounds?.[1][0]).toBeCloseTo(151.21);
  expect(bounds?.[1][1]).toBeCloseTo(-33.8);

  expect(geoJsonBounds(buildTerritoryGeoJson([], []))).toBe(null);
});

test("territoryMapBounds falls back to blocks when the boundary is missing", () => {
  const blocksOnly: TerritoryMap = {
    id: "map-3",
    congregation_id: "cong-1",
    name: "Blocks only",
    details: null,
    url: null,
    boundary: null,
    blocks: [
      {
        id: "block-1",
        name: "George St",
        type: "face",
        coordinates: [
          [151.2, -33.8],
          [151.21, -33.81],
        ],
      },
    ],
  };
  expect(territoryMapBounds(blocksOnly)).toEqual([
    [151.2, -33.81],
    [151.21, -33.8],
  ]);

  expect(
    territoryMapBounds({
      ...blocksOnly,
      boundary: [
        [151.19, -33.9],
        [151.22, -33.9],
        [151.22, -33.85],
      ],
    }),
  ).toEqual([
    [151.19, -33.9],
    [151.22, -33.8],
  ]);

  expect(territoryMapBounds({ ...blocksOnly, blocks: null })).toBe(null);
});

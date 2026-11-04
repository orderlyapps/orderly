import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { expect, test } from "vite-plus/test";

import {
  areCoordinatesEqual,
  clampMapZoom,
  DEFAULT_MAP_CENTER,
  isMapboxAccessToken,
  isValidCoordinates,
  isValidMapViewState,
  MAPBOX_DARK_STYLE,
  MAPBOX_LIGHT_STYLE,
  MAP_DEFAULT_ZOOM,
  MAP_MAX_ZOOM,
  MAP_MIN_ZOOM,
  MAP_VIEW_STATE_STORAGE_KEY,
  MapView,
  readMapViewState,
  resolveMapStyle,
  toMapboxCenter,
  useMapboxMap,
  writeMapViewState,
} from "../src/feature/maps/index.ts";

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

import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { expect, test } from "vite-plus/test";

import {
  areCoordinatesEqual,
  clampMapZoom,
  DEFAULT_MAP_CENTER,
  isMapboxAccessToken,
  isValidCoordinates,
  MAPBOX_DARK_STYLE,
  MAPBOX_LIGHT_STYLE,
  MAP_DEFAULT_ZOOM,
  MAP_MAX_ZOOM,
  MAP_MIN_ZOOM,
  MapView,
  resolveMapStyle,
  toMapboxCenter,
  useMapboxMap,
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

test("renders a fallback message when no access token is configured", () => {
  const markup = renderToStaticMarkup(createElement(MapView, { accessToken: null }));
  expect(markup).toContain("ion-note");
  expect(markup).toContain("VITE_MAPBOX_ACCESS_TOKEN");

  const custom = renderToStaticMarkup(
    createElement(MapView, { accessToken: "", missingTokenMessage: "No token configured" }),
  );
  expect(custom).toContain("No token configured");
});

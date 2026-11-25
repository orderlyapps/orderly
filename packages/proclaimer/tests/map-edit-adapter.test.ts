import { afterEach, expect, test, vi } from "vite-plus/test";
import {
  TerraDraw,
  TerraDrawLineStringMode,
  TerraDrawPolygonMode,
  TerraDrawSelectMode,
} from "terra-draw";
import { TerraDrawMapboxGLAdapter } from "terra-draw-mapbox-gl-adapter";
import {
  buildMapEditFeatures,
  MAP_EDIT_SELECT_FLAGS,
  MAP_EDIT_SELECT_MODE,
} from "../src/feature/map/edit/schema.ts";

afterEach(() => {
  vi.unstubAllGlobals();
});

// Minimal mapbox-gl Map stand-in: records sources/layers and serves setData.
interface MockSource {
  data: unknown;
  setData(d: unknown): void;
}

function makeMockMap() {
  const sources = new Map<string, MockSource>();
  const layers: string[] = [];
  const canvas = {
    style: { cursor: "", removeProperty: () => {} },
    addEventListener: () => {},
    removeEventListener: () => {},
    setPointerCapture: () => {},
    releasePointerCapture: () => {},
  };
  const container = {
    addEventListener: () => {},
    removeEventListener: () => {},
    getBoundingClientRect: () => ({ left: 0, top: 0, width: 800, height: 600 }),
    appendChild: () => {},
  };
  return {
    sources,
    layers,
    getContainer: () => container,
    getCanvas: () => canvas,
    getCanvasContainer: () => container,
    dragRotate: { isEnabled: () => true, enable: () => {}, disable: () => {} },
    dragPan: { isEnabled: () => true, enable: () => {}, disable: () => {} },
    doubleClickZoom: { enable: () => {}, disable: () => {} },
    addSource: (id: string, spec: { data: unknown }) => {
      sources.set(id, {
        data: spec.data,
        setData(d: unknown) {
          this.data = d;
        },
      });
    },
    getSource: (id: string) => sources.get(id),
    addLayer: (layer: { id: string }) => {
      layers.push(layer.id);
    },
    removeLayer: (id: string) => {
      const i = layers.indexOf(id);
      if (i >= 0) layers.splice(i, 1);
    },
    removeSource: (id: string) => {
      sources.delete(id);
    },
    moveLayer: () => {},
    project: ({ lng, lat }: { lng: number; lat: number }) => ({ x: lng, y: lat }),
    unproject: ({ x, y }: { x: number; y: number }) => ({ lng: x, lat: y }),
    loadImage: (_url: string, cb: (e?: Error, img?: unknown) => void) => cb(),
    addImage: () => {},
    setLayoutProperty: () => {},
  };
}

test("adapter end-to-end renders our features into mapbox sources", async () => {
  vi.stubGlobal("requestAnimationFrame", (cb: () => void) => setTimeout(cb, 0));
  vi.stubGlobal("cancelAnimationFrame", (id: number) => clearTimeout(id));

  const map = makeMockMap();
  const draw = new TerraDraw({
    adapter: new TerraDrawMapboxGLAdapter({ map: map as never }),
    modes: [
      new TerraDrawSelectMode({
        flags: MAP_EDIT_SELECT_FLAGS,
      }),
      new TerraDrawPolygonMode({
        styles: {
          fillColor: "#4a6da7",
          fillOpacity: 0.05,
          outlineColor: "#4a6da7",
          outlineOpacity: 0.95,
          outlineWidth: 2,
        },
      }),
      new TerraDrawLineStringMode({
        styles: {
          lineStringColor: "#4a6da7",
          lineStringOpacity: 0.95,
          lineStringWidth: 2,
        },
      }),
    ],
    idStrategy: { getId: () => crypto.randomUUID(), isValidId: () => true },
  });
  draw.start();
  draw.setMode(MAP_EDIT_SELECT_MODE);

  expect(map.layers).toContain("td-polygon");
  expect(map.layers).toContain("td-linestring");
  expect(map.layers).toContain("td-point");

  // Exceeds Terra Draw's 9-decimal precision limit on purpose: features must
  // be rounded by buildMapEditFeatures or addFeatures rejects them.
  const ring = [
    [151.0000000000001, -33.9],
    [151.0500000000001, -33.85],
    [151.1000000000001, -33.9],
    [151.1000000000001, -33.8],
    [151.0000000000001, -33.9],
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
              [151, -33.9],
              [151.1, -33.9],
            ],
          },
        ],
      },
    ],
    "map-1",
    { congregation_id: "cong-1", boundary: ring },
  );
  const results = draw.addFeatures(features as never);
  expect(results.every((r) => r.valid)).toBe(true);
  expect(draw.getSnapshot().map((f) => f.id)).toEqual(
    expect.arrayContaining(["master", "border:map-1", "face:map-1:f-1"]),
  );

  // adapter.render defers to requestAnimationFrame
  await new Promise((resolve) => setTimeout(resolve, 10));

  const polygonSource = map.sources.get("td-polygon")!.data as { features: { id?: unknown }[] };
  const lineSource = map.sources.get("td-linestring")!.data as { features: { id?: unknown }[] };
  expect(polygonSource.features.map((f) => f.id)).toEqual(
    expect.arrayContaining(["master", "border:map-1"]),
  );
  expect(lineSource.features.map((f) => f.id)).toEqual(["face:map-1:f-1"]);
  const polygonFeature = polygonSource.features.find((f) => f.id === "border:map-1");
  expect(
    (polygonFeature as { properties?: { polygonFillColor?: string } }).properties,
  ).toMatchObject({ polygonFillColor: "#4a6da7" });

  // Simulate the vertex-delete path on a SELECTED feature: select it (as a
  // real tap would), then remove a coordinate via updateFeatureGeometry and
  // confirm the sources keep their data.
  draw.selectFeature("border:map-1");
  await new Promise((resolve) => setTimeout(resolve, 10));
  const borderFeature = draw.getSnapshotFeature("border:map-1")!;
  const borderRing = [...(borderFeature.geometry as { coordinates: number[][][] }).coordinates[0]];
  borderRing.splice(1, 1);
  draw.updateFeatureGeometry("border:map-1", {
    type: "Polygon",
    coordinates: [borderRing],
  } as never);
  await new Promise((resolve) => setTimeout(resolve, 10));
  const polygonAfter = map.sources.get("td-polygon")!.data as { features: unknown[] };
  const lineAfter = map.sources.get("td-linestring")!.data as { features: unknown[] };
  expect(polygonAfter.features.length).toBeGreaterThan(0);
  expect(lineAfter.features.length).toBeGreaterThan(0);
  const borderAfter = (
    polygonAfter.features as {
      id?: unknown;
      geometry: { coordinates: number[][][] };
    }[]
  ).find((f) => f.id === "border:map-1");
  expect(borderAfter?.geometry.coordinates[0]).toHaveLength(4);

  // Every point feature written to td-point must carry the styling props the
  // circle layer reads — a missing pointColor crashes mapbox's render with
  // "Cannot read properties of undefined (reading 'r')" and blanks the map.
  const pointSource = map.sources.get("td-point")!.data as {
    features: { id?: unknown; properties?: Record<string, unknown> }[];
  };
  for (const feature of pointSource.features) {
    expect(feature.properties?.["pointColor"], `pointColor on ${String(feature.id)}`).toBeDefined();
    expect(
      feature.properties?.["pointOutlineColor"],
      `pointOutlineColor on ${String(feature.id)}`,
    ).toBeDefined();
    expect(feature.properties?.["pointWidth"], `pointWidth on ${String(feature.id)}`).toBeDefined();
  }
});

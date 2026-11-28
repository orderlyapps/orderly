import { afterEach, expect, test, vi } from "vite-plus/test";
import {
  TerraDraw,
  TerraDrawLineStringMode,
  TerraDrawPolygonMode,
  TerraDrawSelectMode,
} from "terra-draw";
import { TerraDrawMapboxGLAdapter } from "terra-draw-mapbox-gl-adapter";
import {
  createMapEditDragPreviewRenderer,
  MAP_EDIT_DRAG_PREVIEW_DETAIL_SOURCE,
  MAP_EDIT_DRAG_PREVIEW_FILL_SOURCE,
  MAP_EDIT_DRAG_PREVIEW_STATIC_SOURCE,
} from "../src/feature/map/edit/dragPreview.ts";
import {
  buildMapEditFeatures,
  MAP_EDIT_SELECT_FLAGS,
  MAP_EDIT_SELECT_MODE,
  mapEditDragPreviewDetailGeoJSON,
  mapEditDragPreviewFillGeoJSON,
  mapEditDragPreviewStaticGeoJSON,
  mapEditDragPreviewStyle,
  mapEditDrawingCanFinish,
  mapEditNewBlockFromGeometry,
  splitMapEditVertexDragGeometry,
  type MapEditFeature,
} from "../src/feature/map/edit/schema.ts";

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

// Minimal mapbox-gl Map stand-in: records sources/layers and serves setData.
interface MockSource {
  data: unknown;
  setData(d: unknown): void;
}

function makeMockMap() {
  const sources = new Map<string, MockSource>();
  const sourceLoaded = new Map<string, boolean>();
  const layers: string[] = [];
  const layerSpecs = new Map<string, { id: string }>();
  const layerFilters = new Map<string, unknown>();
  const layerLayout = new Map<string, Map<string, unknown>>();
  const listeners = new Map<string, Set<() => void>>();
  const onceListeners = new Map<string, Set<() => void>>();
  const canvasListeners = new Map<string, Set<(event: unknown) => void>>();
  const canvas = {
    style: { cursor: "", removeProperty: () => {} },
    addEventListener: (type: string, listener: (event: unknown) => void) => {
      const entries = canvasListeners.get(type) ?? new Set<(event: unknown) => void>();
      entries.add(listener);
      canvasListeners.set(type, entries);
    },
    removeEventListener: (type: string, listener: (event: unknown) => void) => {
      canvasListeners.get(type)?.delete(listener);
    },
    getBoundingClientRect: () => ({ left: 0, top: 0, width: 800, height: 600 }),
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
    layerSpecs,
    layerFilters,
    layerLayout,
    getContainer: () => container,
    getCanvas: () => canvas,
    getCanvasContainer: () => container,
    dragRotate: { isEnabled: () => true, enable: () => {}, disable: () => {} },
    dragPan: { isEnabled: () => true, enable: () => {}, disable: () => {} },
    doubleClickZoom: { enable: () => {}, disable: () => {} },
    addSource: (id: string, spec: { data: unknown }) => {
      sourceLoaded.set(id, true);
      sources.set(id, {
        data: spec.data,
        setData(d: unknown) {
          this.data = d;
          sourceLoaded.set(id, false);
        },
      });
    },
    getSource: (id: string) => sources.get(id),
    isSourceLoaded: (id: string) => sourceLoaded.get(id) === true,
    setSourceLoaded: (id: string, loaded = true) => {
      sourceLoaded.set(id, loaded);
    },
    addLayer: (layer: { id: string }, beforeId?: string) => {
      layerSpecs.set(layer.id, layer);
      const existing = layers.indexOf(layer.id);
      if (existing >= 0) layers.splice(existing, 1);
      const beforeIndex = beforeId ? layers.indexOf(beforeId) : -1;
      if (beforeIndex >= 0) {
        layers.splice(beforeIndex, 0, layer.id);
      } else {
        layers.push(layer.id);
      }
    },
    getLayer: (id: string) => layerSpecs.get(id),
    removeLayer: (id: string) => {
      const i = layers.indexOf(id);
      if (i >= 0) layers.splice(i, 1);
      layerSpecs.delete(id);
      layerFilters.delete(id);
      layerLayout.delete(id);
    },
    removeSource: (id: string) => {
      sources.delete(id);
      sourceLoaded.delete(id);
    },
    moveLayer: (id: string, beforeId?: string) => {
      const existing = layers.indexOf(id);
      if (existing < 0) return;
      layers.splice(existing, 1);
      const beforeIndex = beforeId ? layers.indexOf(beforeId) : -1;
      if (beforeIndex >= 0) {
        layers.splice(beforeIndex, 0, id);
      } else {
        layers.push(id);
      }
    },
    setFilter: (id: string, filter?: unknown) => {
      layerFilters.set(id, filter);
    },
    getFilter: (id: string) => layerFilters.get(id),
    project: ({ lng, lat }: { lng: number; lat: number }) => ({ x: lng, y: lat }),
    unproject: ({ x, y }: { x: number; y: number }) => ({ lng: x, lat: y }),
    loadImage: (_url: string, cb: (e?: Error, img?: unknown) => void) => cb(),
    addImage: () => {},
    setLayoutProperty: (id: string, name: string, value: unknown) => {
      const values = layerLayout.get(id) ?? new Map<string, unknown>();
      values.set(name, value);
      layerLayout.set(id, values);
    },
    getLayoutProperty: (id: string, name: string) => layerLayout.get(id)?.get(name),
    once: (event: string, listener: () => void) => {
      const entries = onceListeners.get(event) ?? new Set<() => void>();
      entries.add(listener);
      onceListeners.set(event, entries);
    },
    off: (event: string, listener: () => void) => {
      listeners.get(event)?.delete(listener);
      onceListeners.get(event)?.delete(listener);
    },
    fire: (event: string) => {
      const once = [...(onceListeners.get(event) ?? [])];
      onceListeners.get(event)?.clear();
      for (const listener of once) listener();
      for (const listener of listeners.get(event) ?? []) listener();
    },
    fireCanvasEvent: (type: string, event: unknown) => {
      for (const listener of canvasListeners.get(type) ?? []) {
        listener(event);
      }
    },
  };
}

function useAnimationFrameTimers() {
  vi.useFakeTimers();
  vi.stubGlobal("requestAnimationFrame", (cb: () => void) => setTimeout(cb, 16));
  vi.stubGlobal("cancelAnimationFrame", (id: ReturnType<typeof setTimeout>) => clearTimeout(id));
}

function markPreviewSourcesLoaded(map: ReturnType<typeof makeMockMap>) {
  for (const id of [
    MAP_EDIT_DRAG_PREVIEW_DETAIL_SOURCE,
    MAP_EDIT_DRAG_PREVIEW_STATIC_SOURCE,
    MAP_EDIT_DRAG_PREVIEW_FILL_SOURCE,
  ]) {
    map.setSourceLoaded(id, true);
  }
}

function settlePreviewSources(map: ReturnType<typeof makeMockMap>) {
  markPreviewSourcesLoaded(map);
  vi.advanceTimersByTime(16);
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
  expect(draw.getSnapshotFeature("border:map-1")?.properties?.["selected"]).toBe(true);
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

test("terra draw creation workflow finishes lines and polygons with saveable geometry", () => {
  vi.stubGlobal("requestAnimationFrame", (cb: () => void) => setTimeout(cb, 0));
  vi.stubGlobal("cancelAnimationFrame", (id: number) => clearTimeout(id));

  const createEditor = () => {
    const map = makeMockMap();
    const draw = new TerraDraw({
      adapter: new TerraDrawMapboxGLAdapter({ map: map as never }),
      modes: [
        new TerraDrawSelectMode({ flags: MAP_EDIT_SELECT_FLAGS }),
        new TerraDrawPolygonMode({}),
        new TerraDrawLineStringMode({}),
      ],
      idStrategy: { getId: () => crypto.randomUUID(), isValidId: () => true },
    });
    draw.start();
    const clickAt = (x: number, y: number) => {
      const target = map.getCanvas();
      const event = {
        clientX: x,
        clientY: y,
        isPrimary: true,
        button: 0,
        target,
        preventDefault: () => {},
      };
      map.fireCanvasEvent("pointerdown", { ...event, type: "pointerdown" });
      map.fireCanvasEvent("pointerup", { ...event, type: "pointerup" });
    };
    const finishWithKeyboard = () => {
      map.fireCanvasEvent("keyup", { key: "Enter", preventDefault: () => {} });
    };
    const currentDrawing = () =>
      draw.getSnapshot().find((feature) => feature.properties?.["currentlyDrawing"] === true);
    return { draw, clickAt, finishWithKeyboard, currentDrawing };
  };

  const lineEditor = createEditor();
  lineEditor.draw.setMode("linestring");
  const lineFinishes: (string | number)[] = [];
  lineEditor.draw.on("finish", (id) => {
    lineFinishes.push(id);
  });
  lineEditor.clickAt(0, 0);
  expect(mapEditDrawingCanFinish("face", lineEditor.currentDrawing()?.geometry)).toBe(false);
  lineEditor.clickAt(1, 0);
  expect(mapEditDrawingCanFinish("face", lineEditor.currentDrawing()?.geometry)).toBe(true);
  lineEditor.finishWithKeyboard();
  expect(lineFinishes).toHaveLength(1);
  const lineGeometry = lineEditor.draw.getSnapshotFeature(lineFinishes[0])?.geometry;
  expect(lineGeometry).toEqual({
    type: "LineString",
    coordinates: [
      [0, 0],
      [1, 0],
    ],
  });
  expect(
    mapEditNewBlockFromGeometry(
      { blockId: "face-new", type: "face", name: "Oak St" },
      lineGeometry,
    ),
  ).toMatchObject({ id: "face-new", type: "face", name: "Oak St" });

  const polygonEditor = createEditor();
  polygonEditor.draw.setMode("polygon");
  const polygonFinishes: (string | number)[] = [];
  polygonEditor.draw.on("finish", (id) => {
    polygonFinishes.push(id);
  });
  polygonEditor.clickAt(0, 0);
  polygonEditor.clickAt(1, 0);
  expect(mapEditDrawingCanFinish("block", polygonEditor.currentDrawing()?.geometry)).toBe(false);
  polygonEditor.clickAt(1, 1);
  expect(mapEditDrawingCanFinish("block", polygonEditor.currentDrawing()?.geometry)).toBe(true);
  polygonEditor.finishWithKeyboard();
  expect(polygonFinishes).toHaveLength(1);
  const polygonGeometry = polygonEditor.draw.getSnapshotFeature(polygonFinishes[0])?.geometry;
  expect(polygonGeometry?.type).toBe("Polygon");
  const ring =
    polygonGeometry?.type === "Polygon" ? (polygonGeometry.coordinates[0] as number[][]) : [];
  expect(ring).toHaveLength(4);
  expect(ring[0]).toEqual(ring[ring.length - 1]);
  expect(ring).toEqual(
    expect.arrayContaining([
      [0, 0],
      [1, 0],
      [1, 1],
    ]),
  );
  expect(
    mapEditNewBlockFromGeometry(
      { blockId: "block-new", type: "block", name: "Block 1" },
      polygonGeometry,
    ),
  ).toMatchObject({ id: "block-new", type: "block", name: "Block 1" });
});

test("drag preview renderer manages layers, data, filters, and cleanup", () => {
  useAnimationFrameTimers();
  const map = makeMockMap();
  for (const id of ["td-polygon", "td-polygon-outline", "td-linestring", "td-point"]) {
    map.addLayer({ id });
  }
  map.setLayoutProperty("td-point", "visibility", "visible");
  map.addLayer({ id: "map-blocks-line" });
  map.addLayer({ id: "map-edit-vertex-points" });

  const renderer = createMapEditDragPreviewRenderer(map as never);
  expect(() => renderer.clear()).not.toThrow();
  renderer.ensureLayers();
  renderer.ensureLayers();
  for (const sourceId of [
    MAP_EDIT_DRAG_PREVIEW_FILL_SOURCE,
    MAP_EDIT_DRAG_PREVIEW_STATIC_SOURCE,
    MAP_EDIT_DRAG_PREVIEW_DETAIL_SOURCE,
  ]) {
    expect(map.sources.has(sourceId)).toBe(true);
  }
  const overlayIndex = map.layers.indexOf("map-edit-vertex-points");
  expect(overlayIndex).toBeGreaterThanOrEqual(0);
  expect(map.layers.slice(overlayIndex - 4, overlayIndex)).toEqual([
    "map-edit-drag-preview-fill",
    "map-edit-drag-preview-static-line",
    "map-edit-drag-preview-detail-line",
    "map-edit-drag-preview-detail-point",
  ]);

  const feature: MapEditFeature = {
    type: "Feature",
    id: "block:map-1:block-1",
    geometry: {
      type: "Polygon",
      coordinates: [
        [
          [0, 0],
          [1, 0],
          [1, 1],
          [0, 1],
          [0, 0],
        ],
      ],
    },
    properties: {
      mode: "polygon",
      kind: "block",
      mapId: "map-1",
      mapName: "Map 1",
      blockId: "block-1",
      selected: true,
    },
  };
  const split = splitMapEditVertexDragGeometry(feature.geometry, 1)!;
  const style = mapEditDragPreviewStyle(feature.properties, "standard");
  const staticData = mapEditDragPreviewStaticGeoJSON(split, style);
  const fillData = mapEditDragPreviewFillGeoJSON(feature.geometry, style);
  const detailData = mapEditDragPreviewDetailGeoJSON(split, [1, 0], style);
  renderer.start({ feature, staticData, fillData, detailData });

  expect(map.sources.get(MAP_EDIT_DRAG_PREVIEW_STATIC_SOURCE)?.data).toBe(staticData);
  expect(map.sources.get(MAP_EDIT_DRAG_PREVIEW_FILL_SOURCE)?.data).toBe(fillData);
  expect(map.sources.get(MAP_EDIT_DRAG_PREVIEW_DETAIL_SOURCE)?.data).toBe(detailData);
  expect(map.layerFilters.has("td-polygon")).toBe(false);
  expect(map.layerLayout.get("td-point")?.get("visibility")).toBe("none");
  settlePreviewSources(map);

  const expectedFilter = [
    "!",
    [
      "all",
      ["==", ["get", "kind"], "block"],
      ["==", ["get", "mapId"], "map-1"],
      ["==", ["get", "blockId"], "block-1"],
    ],
  ];
  expect(map.layerFilters.get("td-polygon")).toEqual(expectedFilter);
  expect(map.layerFilters.get("td-polygon-outline")).toEqual(expectedFilter);
  expect(map.layerFilters.has("td-linestring")).toBe(false);
  expect(map.layerFilters.get("map-blocks-line")).toEqual([
    "!",
    ["all", ["==", ["get", "id"], "block-1"], ["==", ["get", "type"], "block"]],
  ]);
  expect(map.layerLayout.get("td-point")?.get("visibility")).toBe("none");

  const movedDetail = mapEditDragPreviewDetailGeoJSON(split, [2, 2], style);
  renderer.updateDetail(movedDetail);
  expect(map.sources.get(MAP_EDIT_DRAG_PREVIEW_DETAIL_SOURCE)?.data).toBe(movedDetail);
  expect(movedDetail.features).toHaveLength(2);
  expect(movedDetail.features[0].geometry).toEqual({
    type: "LineString",
    coordinates: [
      [0, 0],
      [2, 2],
      [1, 1],
    ],
  });

  const movedFillGeometry = {
    type: "Polygon" as const,
    coordinates: [
      [
        [0, 0],
        [2, 2],
        [1, 1],
        [0, 1],
        [0, 0],
      ],
    ],
  };
  const movedFill = mapEditDragPreviewFillGeoJSON(movedFillGeometry, style);
  renderer.updateFill(movedFill);
  expect(map.sources.get(MAP_EDIT_DRAG_PREVIEW_FILL_SOURCE)?.data).toBe(movedFill);

  renderer.clear();
  expect(map.layerFilters.get("td-polygon")).toBe(null);
  expect(map.layerFilters.get("td-polygon-outline")).toBe(null);
  expect(map.layerFilters.get("map-blocks-line")).toBe(null);
  expect(map.layerLayout.get("td-point")?.get("visibility")).toBe("visible");
  for (const sourceId of [
    MAP_EDIT_DRAG_PREVIEW_FILL_SOURCE,
    MAP_EDIT_DRAG_PREVIEW_STATIC_SOURCE,
    MAP_EDIT_DRAG_PREVIEW_DETAIL_SOURCE,
  ]) {
    const data = map.sources.get(sourceId)?.data as { features: unknown[] } | undefined;
    expect(data?.features).toHaveLength(0);
  }

  renderer.destroy();
  expect(map.sources.has(MAP_EDIT_DRAG_PREVIEW_FILL_SOURCE)).toBe(false);
  expect(map.layers.some((id) => id.startsWith("map-edit-drag-preview"))).toBe(false);
  expect(() => renderer.destroy()).not.toThrow();
  renderer.ensureLayers();
  expect(map.sources.has(MAP_EDIT_DRAG_PREVIEW_FILL_SOURCE)).toBe(true);
});

test("drag preview renderer targets lines and tolerates missing Terra Draw layers", () => {
  useAnimationFrameTimers();
  const map = makeMockMap();
  map.addLayer({ id: "td-linestring" });
  const renderer = createMapEditDragPreviewRenderer(map as never);
  const feature: MapEditFeature = {
    type: "Feature",
    id: "face:map-1:face-1",
    geometry: {
      type: "LineString",
      coordinates: [
        [0, 0],
        [1, 0],
        [2, 0],
      ],
    },
    properties: {
      mode: "linestring",
      kind: "face",
      mapId: "map-1",
      mapName: "Map 1",
      blockId: "face-1",
    },
  };
  const split = splitMapEditVertexDragGeometry(feature.geometry, 1)!;
  const style = mapEditDragPreviewStyle(feature.properties, "standard");
  renderer.start({
    feature,
    staticData: mapEditDragPreviewStaticGeoJSON(split, style),
    fillData: mapEditDragPreviewFillGeoJSON(feature.geometry, style),
    detailData: mapEditDragPreviewDetailGeoJSON(split, [1, 0], style),
  });
  expect(map.layerFilters.has("td-linestring")).toBe(false);
  settlePreviewSources(map);
  expect(map.layerFilters.get("td-linestring")).toEqual([
    "!",
    [
      "all",
      ["==", ["get", "kind"], "face"],
      ["==", ["get", "mapId"], "map-1"],
      ["==", ["get", "blockId"], "face-1"],
    ],
  ]);
  expect(map.layerFilters.has("td-polygon")).toBe(false);
  expect(() => renderer.clear()).not.toThrow();

  const emptyMap = makeMockMap();
  const missingLayerRenderer = createMapEditDragPreviewRenderer(emptyMap as never);
  expect(() =>
    missingLayerRenderer.start({
      feature,
      staticData: mapEditDragPreviewStaticGeoJSON(split, style),
      fillData: mapEditDragPreviewFillGeoJSON(feature.geometry, style),
      detailData: mapEditDragPreviewDetailGeoJSON(split, [1, 0], style),
    }),
  ).not.toThrow();
  expect(() => missingLayerRenderer.clear()).not.toThrow();
});

test("drag preview renderer preserves base layer filters and visibility", () => {
  useAnimationFrameTimers();
  const map = makeMockMap();
  map.addLayer({ id: "maps-line" });
  map.addLayer({ id: "maps-line-selected" });
  map.addLayer({ id: "map-master-line" });
  map.setLayoutProperty("map-master-line", "visibility", "visible");
  const existingFilter = ["==", ["get", "id"], "other-map"];
  map.setFilter("maps-line", existingFilter);
  const renderer = createMapEditDragPreviewRenderer(map as never);

  const border: MapEditFeature = {
    type: "Feature",
    id: "border:map-1",
    geometry: {
      type: "Polygon",
      coordinates: [
        [
          [0, 0],
          [1, 0],
          [1, 1],
          [0, 0],
        ],
      ],
    },
    properties: { mode: "polygon", kind: "border", mapId: "map-1", mapName: "Map 1" },
  };
  const borderSplit = splitMapEditVertexDragGeometry(border.geometry, 0)!;
  const borderStyle = mapEditDragPreviewStyle(border.properties, "standard");
  renderer.start({
    feature: border,
    staticData: mapEditDragPreviewStaticGeoJSON(borderSplit, borderStyle),
    fillData: mapEditDragPreviewFillGeoJSON(border.geometry, borderStyle),
    detailData: mapEditDragPreviewDetailGeoJSON(borderSplit, [0, 0], borderStyle),
  });
  expect(map.layerFilters.get("maps-line")).toEqual(existingFilter);
  settlePreviewSources(map);
  expect(map.layerFilters.get("maps-line")).toEqual([
    "all",
    existingFilter,
    ["!", ["==", ["get", "id"], "map-1"]],
  ]);
  renderer.clear();
  expect(map.layerFilters.get("maps-line")).toEqual(existingFilter);

  const master: MapEditFeature = {
    type: "Feature",
    id: "master",
    geometry: border.geometry,
    properties: { mode: "polygon", kind: "master" },
  };
  const masterSplit = splitMapEditVertexDragGeometry(master.geometry, 0)!;
  const masterStyle = mapEditDragPreviewStyle(master.properties, "standard");
  renderer.start({
    feature: master,
    staticData: mapEditDragPreviewStaticGeoJSON(masterSplit, masterStyle),
    fillData: mapEditDragPreviewFillGeoJSON(master.geometry, masterStyle),
    detailData: mapEditDragPreviewDetailGeoJSON(masterSplit, [0, 0], masterStyle),
  });
  expect(map.layerLayout.get("map-master-line")?.get("visibility")).toBe("visible");
  settlePreviewSources(map);
  expect(map.layerLayout.get("map-master-line")?.get("visibility")).toBe("none");
  renderer.clear();
  expect(map.layerLayout.get("map-master-line")?.get("visibility")).toBe("visible");
});

test("drag preview cancellation invalidates a pending initial hide", () => {
  useAnimationFrameTimers();
  const map = makeMockMap();
  map.addLayer({ id: "td-polygon" });
  map.addLayer({ id: "td-point" });
  map.setLayoutProperty("td-point", "visibility", "visible");
  const renderer = createMapEditDragPreviewRenderer(map as never);
  const feature: MapEditFeature = {
    type: "Feature",
    id: "master",
    geometry: {
      type: "Polygon",
      coordinates: [
        [
          [0, 0],
          [1, 0],
          [0, 1],
          [0, 0],
        ],
      ],
    },
    properties: { mode: "polygon", kind: "master" },
  };
  const split = splitMapEditVertexDragGeometry(feature.geometry, 0)!;
  const style = mapEditDragPreviewStyle(feature.properties, "standard");
  renderer.start({
    feature,
    staticData: mapEditDragPreviewStaticGeoJSON(split, style),
    fillData: mapEditDragPreviewFillGeoJSON(feature.geometry, style),
    detailData: mapEditDragPreviewDetailGeoJSON(split, [0, 0], style),
  });

  renderer.clear();
  settlePreviewSources(map);

  expect(map.layerFilters.has("td-polygon")).toBe(false);
  expect(map.layerLayout.get("td-point")?.get("visibility")).toBe("visible");
});

test("drag preview cleanup waits for the committed render pass", () => {
  useAnimationFrameTimers();

  const map = makeMockMap();
  map.addSource("td-polygon", { data: { type: "FeatureCollection", features: [] } });
  map.addLayer({ id: "td-polygon" });
  map.addLayer({ id: "td-point" });
  map.setLayoutProperty("td-point", "visibility", "visible");
  const renderer = createMapEditDragPreviewRenderer(map as never);
  const feature: MapEditFeature = {
    type: "Feature",
    id: "master",
    geometry: {
      type: "Polygon",
      coordinates: [
        [
          [0, 0],
          [1, 0],
          [0, 1],
          [0, 0],
        ],
      ],
    },
    properties: { mode: "polygon", kind: "master", selected: true },
  };
  const split = splitMapEditVertexDragGeometry(feature.geometry, 0)!;
  const style = mapEditDragPreviewStyle(feature.properties, "standard");
  renderer.start({
    feature,
    staticData: mapEditDragPreviewStaticGeoJSON(split, style),
    fillData: mapEditDragPreviewFillGeoJSON(feature.geometry, style),
    detailData: mapEditDragPreviewDetailGeoJSON(split, [0, 0], style),
  });
  settlePreviewSources(map);
  expect(map.layerLayout.get("td-point")?.get("visibility")).toBe("none");

  // Terra Draw's adapter writes the committed geometry in its own animation
  // frame, putting the source cache back into a loading state.
  map.sources.get("td-polygon")?.setData({ type: "FeatureCollection", features: [{}] });
  const onClear = vi.fn();
  renderer.clearWhenSettled(onClear);
  expect(map.layerLayout.get("td-point")?.get("visibility")).toBe("none");
  vi.advanceTimersByTime(32);
  expect(map.layerLayout.get("td-point")?.get("visibility")).toBe("none");
  expect(onClear).not.toHaveBeenCalled();

  map.setSourceLoaded("td-polygon", true);
  vi.advanceTimersByTime(16);

  expect(map.layerLayout.get("td-point")?.get("visibility")).toBe("visible");
  expect(map.layerFilters.get("td-polygon")).toBe(null);
  expect(onClear).toHaveBeenCalledTimes(1);
  const data = map.sources.get(MAP_EDIT_DRAG_PREVIEW_DETAIL_SOURCE)?.data as
    | { features: unknown[] }
    | undefined;
  expect(data?.features).toHaveLength(0);
});

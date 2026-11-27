import type { Expression, FilterSpecification, GeoJSONSource, Map as MapboxMap } from "mapbox-gl";

import type { MapEditDragPreviewCollection, MapEditFeature } from "./schema.ts";

export const MAP_EDIT_DRAG_PREVIEW_FILL_SOURCE = "map-edit-drag-preview-fill";
export const MAP_EDIT_DRAG_PREVIEW_STATIC_SOURCE = "map-edit-drag-preview-static";
export const MAP_EDIT_DRAG_PREVIEW_DETAIL_SOURCE = "map-edit-drag-preview-detail";
export const MAP_EDIT_DRAG_PREVIEW_FILL_LAYER = "map-edit-drag-preview-fill";
export const MAP_EDIT_DRAG_PREVIEW_STATIC_LINE_LAYER = "map-edit-drag-preview-static-line";
export const MAP_EDIT_DRAG_PREVIEW_DETAIL_LINE_LAYER = "map-edit-drag-preview-detail-line";
export const MAP_EDIT_DRAG_PREVIEW_DETAIL_POINT_LAYER = "map-edit-drag-preview-detail-point";

const EMPTY_COLLECTION: MapEditDragPreviewCollection = {
  type: "FeatureCollection",
  features: [],
};

const PREVIEW_LAYER_ORDER = [
  MAP_EDIT_DRAG_PREVIEW_FILL_LAYER,
  MAP_EDIT_DRAG_PREVIEW_STATIC_LINE_LAYER,
  MAP_EDIT_DRAG_PREVIEW_DETAIL_LINE_LAYER,
  MAP_EDIT_DRAG_PREVIEW_DETAIL_POINT_LAYER,
] as const;

// Source-specific tile readiness is the reliable visual signal. The fallback
// only bounds the transition if the worker or tile pipeline stops responding.
const VISUAL_SETTLE_TIMEOUT_MS = 500;

export interface MapEditDragPreviewStartInput {
  feature: MapEditFeature;
  staticData: MapEditDragPreviewCollection;
  fillData: MapEditDragPreviewCollection;
  detailData: MapEditDragPreviewCollection;
}

export interface MapEditDragPreviewRenderer {
  ensureLayers: () => void;
  start: (input: MapEditDragPreviewStartInput) => void;
  updateDetail: (data: MapEditDragPreviewCollection) => void;
  updateFill: (data: MapEditDragPreviewCollection) => void;
  clearWhenSettled: (onClear?: () => void) => void;
  clear: () => void;
  destroy: () => void;
}

function emptyCollection(): MapEditDragPreviewCollection {
  return { type: "FeatureCollection", features: [] };
}

function featureMatchExpression(feature: MapEditFeature): Expression {
  const clauses: Expression[] = [["==", ["get", "kind"], feature.properties.kind] as Expression];
  if (typeof feature.properties.mapId === "string") {
    clauses.push(["==", ["get", "mapId"], feature.properties.mapId] as Expression);
  }
  if (typeof feature.properties.blockId === "string") {
    clauses.push(["==", ["get", "blockId"], feature.properties.blockId] as Expression);
  }
  return (clauses.length === 1 ? clauses[0] : ["all", ...clauses]) as Expression;
}

function previewLinePaint() {
  return {
    "line-color": ["get", "color"] as Expression,
    "line-opacity": ["get", "lineOpacity"] as Expression,
    "line-width": ["get", "lineWidth"] as Expression,
  };
}

export function createMapEditDragPreviewRenderer(map: MapboxMap): MapEditDragPreviewRenderer {
  const savedFilters = new Map<string, FilterSpecification | null | undefined>();
  const savedLayerVisibility = new Map<string, unknown>();
  let hiding = false;
  let operation = 0;
  let activeTerraSourceId: string | null = null;
  let cancelPendingSettle: (() => void) | undefined;

  const source = (id: string) => map.getSource(id) as GeoJSONSource | undefined;
  const setData = (id: string, data: MapEditDragPreviewCollection) => {
    source(id)?.setData(data);
  };

  const beforeVertexOverlay = () =>
    map.getLayer("map-edit-vertex-points") ? "map-edit-vertex-points" : undefined;

  const moveLayersIntoPlace = () => {
    const beforeId = beforeVertexOverlay();
    for (const layerId of PREVIEW_LAYER_ORDER) {
      if (!map.getLayer(layerId)) {
        continue;
      }
      try {
        map.moveLayer(layerId, beforeId);
      } catch {
        // The layer order is visual only; never make editing unusable for it.
      }
    }
  };

  const ensureSource = (id: string) => {
    if (!map.getSource(id)) {
      map.addSource(id, {
        type: "geojson",
        data: emptyCollection(),
        tolerance: 0,
      });
    }
  };

  const addLayer = (layer: Parameters<MapboxMap["addLayer"]>[0]) => {
    if (!map.getLayer(layer.id)) {
      map.addLayer(layer, beforeVertexOverlay());
    }
  };

  const ensureLayers = () => {
    ensureSource(MAP_EDIT_DRAG_PREVIEW_FILL_SOURCE);
    ensureSource(MAP_EDIT_DRAG_PREVIEW_STATIC_SOURCE);
    ensureSource(MAP_EDIT_DRAG_PREVIEW_DETAIL_SOURCE);

    addLayer({
      id: MAP_EDIT_DRAG_PREVIEW_FILL_LAYER,
      source: MAP_EDIT_DRAG_PREVIEW_FILL_SOURCE,
      type: "fill",
      paint: {
        "fill-color": ["get", "color"] as Expression,
        "fill-opacity": ["get", "fillOpacity"] as Expression,
      },
    });
    addLayer({
      id: MAP_EDIT_DRAG_PREVIEW_STATIC_LINE_LAYER,
      source: MAP_EDIT_DRAG_PREVIEW_STATIC_SOURCE,
      type: "line",
      layout: { "line-cap": "round", "line-join": "round" },
      paint: previewLinePaint(),
    });
    addLayer({
      id: MAP_EDIT_DRAG_PREVIEW_DETAIL_LINE_LAYER,
      source: MAP_EDIT_DRAG_PREVIEW_DETAIL_SOURCE,
      type: "line",
      layout: { "line-cap": "round", "line-join": "round" },
      paint: previewLinePaint(),
    });
    addLayer({
      id: MAP_EDIT_DRAG_PREVIEW_DETAIL_POINT_LAYER,
      source: MAP_EDIT_DRAG_PREVIEW_DETAIL_SOURCE,
      type: "circle",
      paint: {
        "circle-radius": [
          "interpolate",
          ["exponential", 1.2],
          ["zoom"],
          13,
          0,
          18,
          ["case", ["get", "selected"], 16, 9],
        ] as Expression,
        "circle-color": ["get", "color"] as Expression,
        "circle-opacity": 0.9,
        "circle-stroke-color": "#ffffff",
        "circle-stroke-width": [
          "interpolate",
          ["exponential", 1.2],
          ["zoom"],
          13,
          0,
          18,
          1.5,
        ] as Expression,
      },
    });
    moveLayersIntoPlace();
  };

  const excludeFromLayer = (layerId: string, match: Expression) => {
    if (!map.getLayer(layerId)) {
      return;
    }
    if (!savedFilters.has(layerId)) {
      savedFilters.set(layerId, map.getFilter(layerId));
    }
    const existing = savedFilters.get(layerId);
    const exclude = ["!", match] as Expression;
    const nextFilter = (existing ? ["all", existing, exclude] : exclude) as FilterSpecification;
    map.setFilter(layerId, nextFilter);
  };

  const hideLayer = (layerId: string) => {
    if (!map.getLayer(layerId)) {
      return;
    }
    if (!savedLayerVisibility.has(layerId)) {
      savedLayerVisibility.set(layerId, map.getLayoutProperty(layerId, "visibility"));
    }
    map.setLayoutProperty(layerId, "visibility", "none");
  };

  const hideBaseFeature = (feature: MapEditFeature) => {
    if (feature.properties.kind === "master") {
      hideLayer("map-master-line");
      return;
    }
    if (feature.properties.kind === "border" && feature.properties.mapId) {
      const match = ["==", ["get", "id"], feature.properties.mapId] as Expression;
      excludeFromLayer("maps-line", match);
      excludeFromLayer("maps-line-selected", match);
      return;
    }
    if (
      (feature.properties.kind === "block" || feature.properties.kind === "face") &&
      feature.properties.blockId
    ) {
      excludeFromLayer("map-blocks-line", [
        "all",
        ["==", ["get", "id"], feature.properties.blockId],
        ["==", ["get", "type"], feature.properties.kind],
      ] as Expression);
    }
  };

  const hideGuidance = () => {
    hideLayer("td-point");
    hiding = true;
  };

  const hideFeatureGeometry = (feature: MapEditFeature) => {
    const match = featureMatchExpression(feature);
    const layerIds =
      feature.geometry.type === "Polygon"
        ? ["td-polygon", "td-polygon-outline"]
        : ["td-linestring"];
    for (const layerId of layerIds) {
      excludeFromLayer(layerId, match);
    }
    hideBaseFeature(feature);
    hiding = true;
  };

  const restoreHiddenLayers = () => {
    for (const [layerId, filter] of savedFilters) {
      if (map.getLayer(layerId)) {
        map.setFilter(layerId, filter ?? null);
      }
    }
    savedFilters.clear();
    for (const [layerId, visibility] of savedLayerVisibility) {
      if (map.getLayer(layerId)) {
        map.setLayoutProperty(
          layerId,
          "visibility",
          (visibility as "visible" | "none" | undefined) ?? "visible",
        );
      }
    }
    savedLayerVisibility.clear();
    hiding = false;
  };

  const clearData = () => {
    setData(MAP_EDIT_DRAG_PREVIEW_FILL_SOURCE, EMPTY_COLLECTION);
    setData(MAP_EDIT_DRAG_PREVIEW_STATIC_SOURCE, EMPTY_COLLECTION);
    setData(MAP_EDIT_DRAG_PREVIEW_DETAIL_SOURCE, EMPTY_COLLECTION);
  };

  const scheduleFrame = (callback: () => void) => {
    if (typeof requestAnimationFrame === "function") {
      const id = requestAnimationFrame(callback);
      return () => cancelAnimationFrame(id);
    }
    const id = setTimeout(callback, 16);
    return () => clearTimeout(id);
  };

  // GeoJSON `setData` is asynchronous: the data is serialized and indexed in
  // a worker before tiles can be reloaded. Never hide or reveal the canonical
  // layers in the same task as a replacement preview write — wait until the
  // relevant source cache has loaded replacement tiles, or overlap identical
  // geometries while the worker catches up.
  const whenVisualSettled = (
    sourceIds: readonly string[],
    callback: () => void,
    waitForNextFrame = false,
  ) => {
    const ticket = operation;
    let finished = false;
    let timeout: ReturnType<typeof setTimeout> | undefined;
    let cancelFrame: (() => void) | undefined;
    const cancel = () => {
      if (finished) {
        return;
      }
      finished = true;
      if (timeout !== undefined) {
        clearTimeout(timeout);
      }
      cancelFrame?.();
      if (cancelPendingSettle === cancel) {
        cancelPendingSettle = undefined;
      }
    };
    const finish = () => {
      if (finished) {
        return;
      }
      cancel();
      if (ticket === operation) {
        callback();
      }
    };
    const sourcesReady = () => {
      try {
        return sourceIds.every((id) => !map.getSource(id) || map.isSourceLoaded(id));
      } catch {
        return false;
      }
    };
    const checkSources = () => {
      cancelFrame = undefined;
      if (finished || ticket !== operation) {
        return;
      }
      if (sourcesReady()) {
        finish();
        return;
      }
      cancelFrame = scheduleFrame(checkSources);
    };
    const waitForSources = () => {
      if (finished || ticket !== operation) {
        return;
      }
      cancelFrame = scheduleFrame(checkSources);
    };
    cancelPendingSettle = cancel;
    timeout = setTimeout(finish, VISUAL_SETTLE_TIMEOUT_MS);
    if (waitForNextFrame) {
      cancelFrame = scheduleFrame(waitForSources);
    } else {
      waitForSources();
    }
  };

  const invalidateOperation = () => {
    operation += 1;
    const cancel = cancelPendingSettle;
    cancelPendingSettle = undefined;
    cancel?.();
  };

  return {
    ensureLayers,
    start({ feature, staticData, fillData, detailData }) {
      invalidateOperation();
      ensureLayers();
      if (hiding) {
        restoreHiddenLayers();
      }
      activeTerraSourceId = feature.geometry.type === "Polygon" ? "td-polygon" : "td-linestring";
      // Guidance is unusable while the custom grip drag is active. Hide it now
      // so the stale native selection point never trails behind the preview.
      hideGuidance();
      setData(MAP_EDIT_DRAG_PREVIEW_STATIC_SOURCE, staticData);
      setData(MAP_EDIT_DRAG_PREVIEW_FILL_SOURCE, fillData);
      setData(MAP_EDIT_DRAG_PREVIEW_DETAIL_SOURCE, detailData);
      const requiredSources = [MAP_EDIT_DRAG_PREVIEW_DETAIL_SOURCE];
      if (staticData.features.length > 0) {
        requiredSources.push(MAP_EDIT_DRAG_PREVIEW_STATIC_SOURCE);
      }
      if (fillData.features.length > 0) {
        requiredSources.push(MAP_EDIT_DRAG_PREVIEW_FILL_SOURCE);
      }
      // The initial preview is identical to the feature it replaces. Let the
      // two overlap until the worker-backed preview source is visible, then
      // hide the canonical rendering without a gap.
      whenVisualSettled(requiredSources, () => hideFeatureGeometry(feature));
    },
    updateDetail(data) {
      setData(MAP_EDIT_DRAG_PREVIEW_DETAIL_SOURCE, data);
    },
    updateFill(data) {
      setData(MAP_EDIT_DRAG_PREVIEW_FILL_SOURCE, data);
    },
    clearWhenSettled(onClear) {
      invalidateOperation();
      const committedSources = activeTerraSourceId ? [activeTerraSourceId] : [];
      // Terra Draw writes the committed geometry in its own animation frame.
      // Wait for that write first, then for the resulting worker/tile update.
      whenVisualSettled(
        committedSources,
        () => {
          activeTerraSourceId = null;
          restoreHiddenLayers();
          clearData();
          onClear?.();
        },
        true,
      );
    },
    clear() {
      invalidateOperation();
      activeTerraSourceId = null;
      restoreHiddenLayers();
      clearData();
    },
    destroy() {
      invalidateOperation();
      activeTerraSourceId = null;
      try {
        restoreHiddenLayers();
      } catch {
        // The style may already have been torn down.
      }
      for (const layerId of [...PREVIEW_LAYER_ORDER].reverse()) {
        if (!map.getLayer(layerId)) {
          continue;
        }
        try {
          map.removeLayer(layerId);
        } catch {
          // Best effort cleanup.
        }
      }
      for (const sourceId of [
        MAP_EDIT_DRAG_PREVIEW_DETAIL_SOURCE,
        MAP_EDIT_DRAG_PREVIEW_STATIC_SOURCE,
        MAP_EDIT_DRAG_PREVIEW_FILL_SOURCE,
      ]) {
        if (!map.getSource(sourceId)) {
          continue;
        }
        try {
          map.removeSource(sourceId);
        } catch {
          // Best effort cleanup.
        }
      }
    },
  };
}

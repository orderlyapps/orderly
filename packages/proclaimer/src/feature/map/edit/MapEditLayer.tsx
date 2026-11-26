import {
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type MouseEvent as ReactMouseEvent,
  type PointerEvent as ReactPointerEvent,
} from "react";

import type {
  Expression,
  Map as MapboxMap,
  MapMouseEvent,
  Marker as MapboxMarker,
  PointLike,
} from "mapbox-gl";
import { Layer, Marker, Source, useMap } from "react-map-gl/mapbox";
import {
  TerraDraw,
  TerraDrawLineStringMode,
  TerraDrawPolygonMode,
  TerraDrawSelectMode,
  type GeoJSONStoreFeatures,
  type HexColor,
} from "terra-draw";
import { TerraDrawMapboxGLAdapter } from "terra-draw-mapbox-gl-adapter";

import { useMasterMap } from "../master/hooks.ts";
import type { MapMasterCollection } from "../master/collection.ts";
import type { MapMasterRow } from "../master/schema.ts";
import { useMapPolygons } from "../maps/hooks.ts";
import type { MapCollection } from "../maps/collection.ts";
import { MAP_PRIMARY_COLOR, MAP_SELECTED_COLOR, type MapRow } from "../maps/schema.ts";
import {
  applyMapEditFeatureToMaster,
  applyMapEditFeatureToRow,
  asMapEditFeature,
  buildMapEditFeatures,
  MAP_EDIT_SELECT_FLAGS,
  MAP_EDIT_SELECT_MODE,
  mapEditVerticesToGeoJSON,
  nextMapEditSelectionIndex,
  removeMapEditVertex,
  replaceMapEditVertex,
  sortMapEditFeaturesForSelection,
  type MapEditFeature,
  type MapEditVertexCollection,
} from "./schema.ts";

export interface MapEditLayerProps {
  congregationId?: string;
  /** Key (id or name) of the map whose blocks and faces are editable. */
  selectedMap?: string | null;
  onError?: (message: string) => void;
}

const VERTEX_COLOR = "#ffffff";
const SELECTED_VERTEX_COLOR = "#d8e3f4";
const EMPTY_VERTICES: MapEditVertexCollection = {
  type: "FeatureCollection",
  features: [],
};

const vertexHandleMarkerStyle: CSSProperties = {
  pointerEvents: "none",
};

const vertexHandleRootStyle: CSSProperties = {
  position: "relative",
  width: 40,
  height: 90,
  pointerEvents: "none",
};

const vertexHandleStemStyle: CSSProperties = {
  position: "absolute",
  left: "50%",
  top: 34,
  width: 2,
  height: 22,
  transform: "translateX(-50%)",
  borderRadius: 1,
  background: MAP_SELECTED_COLOR,
};

const vertexHandleGripStyle: CSSProperties = {
  position: "absolute",
  left: "50%",
  top: 50,
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  justifyContent: "center",
  gap: 5,
  boxSizing: "border-box",
  width: 40,
  height: 40,
  transform: "translateX(-50%)",
  border: `3px solid ${MAP_SELECTED_COLOR}`,
  borderRadius: "50%",
  background: VERTEX_COLOR,
  boxShadow: "0 2px 8px rgba(0, 0, 0, 0.35)",
  cursor: "grab",
  pointerEvents: "auto",
  touchAction: "none",
};

const vertexHandleGripLineStyle: CSSProperties = {
  width: 14,
  height: 2,
  borderRadius: 1,
  background: MAP_SELECTED_COLOR,
};

const vertexDeleteButtonStyle: CSSProperties = {
  height: 32,
  padding: "0 12px",
  border: 0,
  borderRadius: 999,
  background: MAP_SELECTED_COLOR,
  boxShadow: "0 2px 8px rgba(0, 0, 0, 0.35)",
  color: VERTEX_COLOR,
  cursor: "pointer",
  fontFamily: "inherit",
  fontSize: 13,
  fontWeight: 600,
  pointerEvents: "auto",
  touchAction: "manipulation",
};

const MINIMUM_VERTEX_DELETE_MESSAGE =
  "The vertex cannot be deleted because the shape must keep its minimum number of vertices.";
const REPEAT_FEATURE_CLICK_MS = 1500;
const EDIT_FEATURE_HIT_PX = 40;

const stopNativePropagationBeforeMapbox = (event: { nativeEvent: Event }) => {
  event.nativeEvent.stopPropagation();
};

const vertexControlCaptureProps = {
  onClickCapture: stopNativePropagationBeforeMapbox,
  onContextMenuCapture: stopNativePropagationBeforeMapbox,
  onDoubleClickCapture: stopNativePropagationBeforeMapbox,
  onMouseDownCapture: stopNativePropagationBeforeMapbox,
  onMouseMoveCapture: stopNativePropagationBeforeMapbox,
  onMouseUpCapture: stopNativePropagationBeforeMapbox,
  onPointerCancelCapture: stopNativePropagationBeforeMapbox,
  onPointerDownCapture: stopNativePropagationBeforeMapbox,
  onPointerMoveCapture: stopNativePropagationBeforeMapbox,
  onPointerUpCapture: stopNativePropagationBeforeMapbox,
  onTouchCancelCapture: stopNativePropagationBeforeMapbox,
  onTouchEndCapture: stopNativePropagationBeforeMapbox,
  onTouchMoveCapture: stopNativePropagationBeforeMapbox,
  onTouchStartCapture: stopNativePropagationBeforeMapbox,
};

function zoomScaledPointWidth(property: string, endScale: number): Expression {
  return [
    "interpolate",
    ["exponential", 1.2],
    ["zoom"],
    10,
    0,
    18,
    ["*", ["get", property], endScale],
  ] as Expression;
}

function hiddenSelectionPointOpacity(property: string): Expression {
  return ["case", ["get", "selectionPoint"], 0, ["get", property]] as Expression;
}

function applyZoomScaledPointStyling(map: MapboxMap) {
  if (!map.getLayer("td-point")) {
    return;
  }
  map.setPaintProperty("td-point", "circle-radius", zoomScaledPointWidth("pointWidth", 3.6));
  map.setPaintProperty(
    "td-point",
    "circle-stroke-width",
    zoomScaledPointWidth("pointOutlineWidth", 1),
  );
  map.setPaintProperty("td-point", "circle-opacity", hiddenSelectionPointOpacity("pointOpacity"));
  map.setPaintProperty(
    "td-point",
    "circle-stroke-opacity",
    hiddenSelectionPointOpacity("pointOutlineOpacity"),
  );
}

function moveVertexOverlayToTop(map: MapboxMap) {
  if (map.getLayer("map-edit-vertex-points")) {
    map.moveLayer("map-edit-vertex-points");
  }
}

interface EditContext {
  maps: MapRow[];
  collection: MapCollection | null;
  master: MapMasterRow | null;
  masterCollection: MapMasterCollection | null;
  onError?: (message: string) => void;
}

interface VertexDragState {
  pointerId: number;
  featureId: string | number;
  index: number;
  startClientX: number;
  startClientY: number;
  startCoordinates: [number, number];
  moved: boolean;
}

function roundCoordinate(value: number): number {
  return Math.round(value * 1e9) / 1e9;
}

function setFeatureVertexPosition(
  draw: TerraDraw,
  featureId: string | number,
  index: number,
  position: [number, number],
): boolean {
  const feature = asMapEditFeature(draw.getSnapshotFeature(featureId) ?? {});
  if (!feature) {
    return false;
  }
  const geometry = replaceMapEditVertex(feature.geometry, index, position);
  if (!geometry) {
    return false;
  }
  draw.updateFeatureGeometry(featureId, geometry);
  return true;
}

function deleteFeatureVertex(draw: TerraDraw, featureId: string | number, index: number): boolean {
  const feature = asMapEditFeature(draw.getSnapshotFeature(featureId) ?? {});
  if (!feature) {
    return false;
  }
  const geometry = removeMapEditVertex(feature.geometry, index);
  if (!geometry) {
    return false;
  }
  draw.updateFeatureGeometry(featureId, geometry);
  return true;
}

function persistFeature(draw: TerraDraw, id: string | number, context: EditContext) {
  const feature = asMapEditFeature(draw.getSnapshotFeature(id) ?? {});
  if (!feature) {
    return;
  }
  const { maps, collection, master, masterCollection, onError } = context;
  const fail = (message: string) => onError?.(message);
  if (feature.properties.kind === "master") {
    if (!masterCollection || !master) {
      return;
    }
    try {
      const tx = masterCollection.update(master.congregation_id, (draft) =>
        applyMapEditFeatureToMaster(draft, feature),
      );
      void tx.isPersisted.promise.catch(() => fail("The congregation border could not be saved."));
    } catch {
      fail("The congregation border could not be saved.");
    }
    return;
  }
  const row = maps.find((entry) => entry.id === feature.properties.mapId);
  if (!collection || !row?.id) {
    return;
  }
  try {
    const tx = collection.update(row.id, (draft) => applyMapEditFeatureToRow(draft, feature));
    void tx.isPersisted.promise.catch(() => fail("The map geometry could not be saved."));
  } catch {
    fail("The map geometry could not be saved.");
  }
}

function createTerraDraw(map: MapboxMap): TerraDraw {
  const primary = MAP_PRIMARY_COLOR as HexColor;
  return new TerraDraw({
    adapter: new TerraDrawMapboxGLAdapter({ map }),
    modes: [
      new TerraDrawSelectMode({
        flags: MAP_EDIT_SELECT_FLAGS,
        allowManualSelection: false,
        // The Delete key would drop whole features; vertices are removed by
        // right-click or by arming one with a tap (handled in MapEditLayer).
        keyEvents: {
          deselect: "Escape",
          delete: null,
          rotate: null,
          scale: null,
        },
        styles: {
          // The armed-vertex highlight lives on the overlay layer's paint —
          // guidance features reject updateFeatureProperties, so selection
          // points can't be styled via a store flag anyway.
          selectionPointColor: VERTEX_COLOR,
          selectionPointOutlineColor: primary,
          selectionPointWidth: 5,
          selectionPointOutlineWidth: 2,
          midPointColor: primary,
          midPointOutlineColor: primary,
          midPointOpacity: 0.7,
          midPointWidth: 3,
          midPointOutlineWidth: 1,
          selectedPolygonColor: primary,
          selectedPolygonFillOpacity: 0.18,
          selectedPolygonOutlineColor: primary,
          selectedPolygonOutlineOpacity: 0.95,
          selectedPolygonOutlineWidth: 3,
          selectedLineStringColor: primary,
          selectedLineStringOpacity: 0.95,
          selectedLineStringWidth: 3,
        },
      }),
      // The polygon and linestring modes are never activated for drawing; they
      // own the store features so the select mode can edit them.
      new TerraDrawPolygonMode({
        styles: {
          fillColor: primary,
          fillOpacity: (feature: GeoJSONStoreFeatures) =>
            feature.properties["kind"] === "master" ? 0 : 0.05,
          outlineColor: primary,
          outlineOpacity: (feature: GeoJSONStoreFeatures) =>
            feature.properties["kind"] === "master" ? 0.4 : 0.95,
          outlineWidth: 2,
        },
      }),
      new TerraDrawLineStringMode({
        styles: {
          lineStringColor: primary,
          lineStringOpacity: 0.95,
          lineStringWidth: 2,
        },
      }),
    ],
    // Feature ids encode the row they came from (e.g. "border:<mapId>").
    idStrategy: { getId: () => crypto.randomUUID(), isValidId: () => true },
  });
}

// Turns the map into a geometry editor: every congregation border, the master
// border, and the selected map's blocks and faces can be selected and reshaped
// with Terra Draw. A circle layer keeps every vertex visible while editing.
export function MapEditLayer({ congregationId, selectedMap = null, onError }: MapEditLayerProps) {
  const { current: mapRef } = useMap();
  const { maps, collection } = useMapPolygons(congregationId);
  const { master, collection: masterCollection } = useMasterMap(congregationId);
  const [draw, setDraw] = useState<TerraDraw | null>(null);
  const [vertices, setVertices] = useState<MapEditVertexCollection>(EMPTY_VERTICES);
  const contextRef = useRef<EditContext>({
    maps,
    collection,
    master,
    masterCollection,
    onError,
  });
  contextRef.current = { maps, collection, master, masterCollection, onError };
  const skippedRowsRef = useRef<Set<string>>(new Set());
  const [armedVertex, setArmedVertex] = useState<{
    featureId: string | number;
    index: number;
  } | null>(null);
  const armedVertexRef = useRef<{
    featureId: string | number;
    index: number;
  } | null>(null);
  const drawRef = useRef<TerraDraw | null>(null);
  const vertexDragRef = useRef<VertexDragState | null>(null);
  const dragPanRestoreRef = useRef<{ map: MapboxMap; wasEnabled: boolean } | null>(null);
  // pointermove can fire several times per frame; the latest position is
  // coalesced into one store update per animation frame.
  const dragFrameRef = useRef<number | null>(null);
  const dragPendingRef = useRef<{ x: number; y: number } | null>(null);
  // During a drag the handles are positioned imperatively — waiting for the
  // store change → React re-render round trip leaves the grip trailing the
  // pointer by a frame or more.
  const handleMarkerRef = useRef<MapboxMarker | null>(null);
  const deleteMarkerRef = useRef<MapboxMarker | null>(null);

  useEffect(() => {
    drawRef.current = draw;
  }, [draw]);

  useEffect(
    () => () => {
      if (dragFrameRef.current !== null) {
        cancelAnimationFrame(dragFrameRef.current);
      }
    },
    [],
  );

  useEffect(() => {
    const mapboxMap = mapRef?.getMap();
    if (!mapboxMap) {
      return;
    }
    let cancelled = false;
    let instance: TerraDraw | null = null;

    // Tap a vertex dot to arm it (red); its Delete button or the Delete key
    // removes that coordinate — the touch-friendly counterpart to Terra Draw's
    // right-click deletion. The vertex overlay dots are the tap targets so
    // arming works whether or not the feature is selected.
    const vertexAt = (point: MapMouseEvent["point"]) => {
      // Small bbox so fat-finger taps still hit the 5px vertex dot.
      const box: [PointLike, PointLike] = [
        [point.x - 10, point.y - 10],
        [point.x + 10, point.y + 10],
      ];
      // queryRenderedFeatures throws when a listed layer is absent, which can
      // happen transiently while the watchdog rebuilds the editor.
      const layers = ["td-point", "map-edit-vertex-points"].filter((id) => mapboxMap.getLayer(id));
      if (layers.length === 0) {
        return null;
      }
      const hits = mapboxMap.queryRenderedFeatures(box, {
        layers,
      }) as { properties?: Record<string, unknown> | null }[];
      for (const hit of hits) {
        const props = hit.properties;
        const index = props?.["index"];
        const featureId = props?.["selectionPoint"]
          ? props["selectionPointFeatureId"]
          : props?.["feature"];
        if (
          typeof index === "number" &&
          (typeof featureId === "string" || typeof featureId === "number")
        ) {
          return { featureId, index };
        }
      }
      return null;
    };

    const editingControlAt = (event: MapMouseEvent, draw: TerraDraw) =>
      draw
        .getFeaturesAtLngLat(
          { lng: event.lngLat.lng, lat: event.lngLat.lat },
          { pointerDistance: EDIT_FEATURE_HIT_PX, ignoreSelectFeatures: false },
        )
        .some((feature) =>
          Boolean(
            feature.properties?.["selectionPoint"] ||
            feature.properties?.["midPoint"] ||
            feature.properties?.["coordinatePoint"],
          ),
        );

    let lastFeatureClick: { key: string; x: number; y: number; time: number } | null = null;

    const resetFeatureClick = () => {
      lastFeatureClick = null;
    };

    const selectFeatureAt = (event: MapMouseEvent, draw: TerraDraw) => {
      const candidates = sortMapEditFeaturesForSelection(
        draw
          .getFeaturesAtLngLat(
            { lng: event.lngLat.lng, lat: event.lngLat.lat },
            { pointerDistance: EDIT_FEATURE_HIT_PX },
          )
          .map(asMapEditFeature)
          .filter((feature): feature is MapEditFeature => feature !== null),
      );
      if (candidates.length === 0) {
        lastFeatureClick = null;
        return;
      }

      let selectedId: string | null = null;
      for (const snapshotFeature of draw.getSnapshot()) {
        const feature = asMapEditFeature(snapshotFeature);
        if (feature?.properties.selected) {
          selectedId = feature.id;
          break;
        }
      }

      const key = JSON.stringify(candidates.map((feature) => feature.id));
      const selectedIndex = candidates.findIndex((feature) => feature.id === selectedId);
      const now = Date.now();
      const repeatedClick =
        lastFeatureClick?.key === key &&
        now - lastFeatureClick.time <= REPEAT_FEATURE_CLICK_MS &&
        Math.hypot(event.point.x - lastFeatureClick.x, event.point.y - lastFeatureClick.y) <= 8;
      const nextIndex = nextMapEditSelectionIndex(candidates.length, selectedIndex, repeatedClick);
      if (nextIndex === null) {
        lastFeatureClick = null;
        return;
      }
      const nextId = candidates[nextIndex].id;
      lastFeatureClick = { key, x: event.point.x, y: event.point.y, time: now };
      if (selectedId !== nextId) {
        draw.selectFeature(nextId);
      }
    };

    const setArmed = (armed: { featureId: string | number; index: number } | null) => {
      armedVertexRef.current = armed;
      setArmedVertex(armed);
    };

    const disarmVertex = () => {
      setArmed(null);
    };

    const deleteArmedVertex = () => {
      const armed = armedVertexRef.current;
      const draw = instance;
      if (!armed || !draw) {
        return;
      }
      try {
        if (deleteFeatureVertex(draw, armed.featureId, armed.index)) {
          setArmed(null);
          persistFeature(draw, armed.featureId, contextRef.current);
        } else {
          contextRef.current.onError?.(MINIMUM_VERTEX_DELETE_MESSAGE);
        }
      } catch (error) {
        console.error(`MapEditLayer: failed to delete vertex on ${String(armed.featureId)}`, error);
        contextRef.current.onError?.("The vertex could not be deleted.");
      }
    };

    const onMapClick = (event: MapMouseEvent) => {
      const draw = instance;
      if (!draw || event.originalEvent.detail > 1) {
        return;
      }
      const hit = vertexAt(event.point);
      disarmVertex();
      if (hit) {
        setArmed(hit);
        return;
      }
      if (!editingControlAt(event, draw)) {
        selectFeatureAt(event, draw);
      }
    };

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Delete" && event.key !== "Backspace") {
        return;
      }
      // Never delete a vertex while the user is typing in an input — the map
      // edit modal and other fields can be open while edit mode is active.
      const target = event.target;
      if (
        target instanceof HTMLElement &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.tagName === "SELECT" ||
          target.isContentEditable)
      ) {
        return;
      }
      if (armedVertexRef.current) {
        event.preventDefault();
        deleteArmedVertex();
      }
    };

    let creating = false;
    let createPending = false;
    const create = () => {
      if (cancelled || creating) {
        return;
      }
      // `style.load` can fire while the style still has pending work, so defer
      // to the next `idle` — the first moment sources are safe to add to.
      if (!mapboxMap.isStyleLoaded()) {
        if (!createPending) {
          createPending = true;
          mapboxMap.once("idle", () => {
            createPending = false;
            create();
          });
        }
        return;
      }
      creating = true;
      // A style swap drops the adapter's sources, so rebuild from scratch.
      try {
        instance?.stop();
      } catch {
        // Layers and sources are already gone with the previous style.
      }
      // Strip any leftovers so register() can't collide with a stale id.
      for (const id of [
        "td-point",
        "td-point-marker",
        "td-linestring",
        "td-polygon",
        "td-polygon-outline",
      ]) {
        if (mapboxMap.getLayer(id)) {
          try {
            mapboxMap.removeLayer(id);
          } catch {
            // Best effort cleanup.
          }
        }
      }
      for (const id of ["td-point", "td-linestring", "td-polygon"]) {
        if (mapboxMap.getSource(id)) {
          try {
            mapboxMap.removeSource(id);
          } catch {
            // Best effort cleanup.
          }
        }
      }
      try {
        armedVertexRef.current = null;
        instance = createTerraDraw(mapboxMap);
        instance.on("change", () => {
          setVertices(mapEditVerticesToGeoJSON(instance?.getSnapshot() ?? []));
          // Defer — calling triggerRepaint synchronously inside a store change
          // re-renders mapbox reentrantly mid-mutation, which can crash the
          // frame ("reading 'r'" on an undefined paint uniform).
          requestAnimationFrame(() => mapboxMap.triggerRepaint());
        });
        instance.on("finish", (id) => {
          if (instance) {
            persistFeature(instance, id, contextRef.current);
          }
        });
        instance.start();
        applyZoomScaledPointStyling(mapboxMap);
        moveVertexOverlayToTop(mapboxMap);
        instance.setMode(MAP_EDIT_SELECT_MODE);
        setDraw(instance);
      } catch (error) {
        console.error("MapEditLayer: failed to initialise Terra Draw", error);
        contextRef.current.onError?.(
          error instanceof Error ? error.message : "Map editing could not be started.",
        );
      }
      creating = false;
    };

    // Watchdog: if the td layers/sources ever vanish (style swap, partial
    // teardown) or the store is wiped while rows exist, the next idle rebuilds
    // the whole editor — self-heals instead of leaving the map empty until
    // the user happens to zoom. Capped so a persistently-failing rebuild
    // can't thrash every idle.
    let rebuildAttempts = 0;
    const onIdle = () => {
      if (cancelled || creating || rebuildAttempts >= 3) {
        return;
      }
      const inst = instance;
      const layersMissing =
        !mapboxMap.getSource("td-polygon") ||
        !mapboxMap.getLayer("td-polygon") ||
        !mapboxMap.getSource("td-point") ||
        !mapboxMap.getLayer("td-point");
      if (!inst || layersMissing) {
        rebuildAttempts += 1;
        create();
        return;
      }
      if (inst.getSnapshot().length > 0) {
        rebuildAttempts = 0;
        return;
      }
      if (contextRef.current.maps.length > 0) {
        rebuildAttempts += 1;
        create();
      }
    };
    create();
    mapboxMap.on("style.load", create);
    mapboxMap.on("idle", onIdle);
    mapboxMap.on("click", onMapClick);
    mapboxMap.on("movestart", resetFeatureClick);
    window.addEventListener("keydown", onKeyDown);
    return () => {
      cancelled = true;
      vertexDragRef.current = null;
      const restore = dragPanRestoreRef.current;
      dragPanRestoreRef.current = null;
      if (restore?.wasEnabled) {
        restore.map.dragPan.enable();
      }
      mapboxMap.off("style.load", create);
      mapboxMap.off("idle", onIdle);
      mapboxMap.off("click", onMapClick);
      mapboxMap.off("movestart", resetFeatureClick);
      window.removeEventListener("keydown", onKeyDown);
      setDraw(null);
      setVertices(EMPTY_VERTICES);
      setArmed(null);
      try {
        instance?.stop();
      } catch {
        // The map may already be torn down.
      }
    };
  }, [mapRef]);

  // Keep the store in step with the rows: update moved geometry, add new
  // features, and drop ones that no longer exist (e.g. deselected blocks).
  useEffect(() => {
    if (!draw) {
      return;
    }
    const desired = buildMapEditFeatures(maps, selectedMap, master);
    // Rows with no id or no usable boundary produce nothing to edit — surface
    // them once so silent skips are diagnosable. Only real map ids count as
    // covered — the master feature carries no mapId, and letting undefined in
    // here would silence the "no id" warning it exists to diagnose.
    const covered = new Set(
      desired
        .map((feature) => feature.properties.mapId)
        .filter((id): id is string => typeof id === "string"),
    );
    for (const row of maps) {
      const key = row.id ?? row.name;
      if ((row.id !== undefined && covered.has(row.id)) || skippedRowsRef.current.has(key)) {
        continue;
      }
      skippedRowsRef.current.add(key);
      console.warn(
        `MapEditLayer: map "${row.name}" is not editable — it has ${!row.id ? "no id" : "no valid boundary"} in the database.`,
      );
    }
    const desiredIds = new Set(desired.map((feature) => feature.id));
    const stale = draw
      .getSnapshot()
      .map(asMapEditFeature)
      .filter((feature): feature is MapEditFeature => feature !== null)
      .filter((feature) => !desiredIds.has(feature.id))
      .map((feature) => feature.id);
    if (stale.length > 0) {
      draw.removeFeatures(stale);
    }
    const missing = desired.filter((feature) => !draw.hasFeature(feature.id));
    if (missing.length > 0) {
      try {
        const results = draw.addFeatures(missing as GeoJSONStoreFeatures[]);
        results.forEach((result, index) => {
          if (!result?.valid) {
            console.warn(
              `MapEditLayer: feature ${String(missing[index]?.id)} was rejected`,
              result,
            );
          }
        });
      } catch (error) {
        console.error("MapEditLayer: failed to add features", error);
      }
    }
    for (const feature of desired) {
      const current = draw.getSnapshotFeature(feature.id);
      if (!current || current.geometry.type !== feature.geometry.type) {
        continue;
      }
      // A selected feature may be mid-drag — pushing possibly-stale row
      // geometry back into the store would snap the live edit away.
      if (current.properties?.["selected"]) {
        continue;
      }
      if (
        JSON.stringify(current.geometry.coordinates) !==
        JSON.stringify(feature.geometry.coordinates)
      ) {
        try {
          draw.updateFeatureGeometry(feature.id, feature.geometry);
        } catch (error) {
          console.error(`MapEditLayer: failed to update ${feature.id}`, error);
        }
      }
    }
  }, [draw, maps, master, selectedMap]);

  const armedVertexPoint = armedVertex
    ? vertices.features.find(
        (point) =>
          point.properties.feature === String(armedVertex.featureId) &&
          point.properties.index === armedVertex.index,
      )
    : undefined;
  const armedVertexCoordinates = armedVertexPoint?.geometry.coordinates;
  const armedVertexPosition: [number, number] | null =
    armedVertexCoordinates && armedVertexCoordinates.length >= 2
      ? [armedVertexCoordinates[0], armedVertexCoordinates[1]]
      : null;

  const disableMapDragPan = () => {
    const mapboxMap = mapRef?.getMap();
    if (!mapboxMap || dragPanRestoreRef.current) {
      return;
    }
    const wasEnabled = mapboxMap.dragPan.isEnabled();
    dragPanRestoreRef.current = { map: mapboxMap, wasEnabled };
    if (wasEnabled) {
      mapboxMap.dragPan.disable();
    }
  };

  const restoreMapDragPan = () => {
    const restore = dragPanRestoreRef.current;
    dragPanRestoreRef.current = null;
    if (restore?.wasEnabled) {
      restore.map.dragPan.enable();
    }
  };

  const updateDraggedVertex = (clientX: number, clientY: number) => {
    const drag = vertexDragRef.current;
    const instance = drawRef.current;
    const mapboxMap = mapRef?.getMap();
    if (!drag || !instance || !mapboxMap) {
      return;
    }
    const start = mapboxMap.project({
      lng: drag.startCoordinates[0],
      lat: drag.startCoordinates[1],
    });
    const next = mapboxMap.unproject([
      start.x + clientX - drag.startClientX,
      start.y + clientY - drag.startClientY,
    ]);
    handleMarkerRef.current?.setLngLat(next);
    deleteMarkerRef.current?.setLngLat(next);
    try {
      if (
        setFeatureVertexPosition(instance, drag.featureId, drag.index, [
          roundCoordinate(next.lng),
          roundCoordinate(next.lat),
        ])
      ) {
        drag.moved = true;
      }
    } catch (error) {
      console.error(`MapEditLayer: failed to move vertex on ${String(drag.featureId)}`, error);
    }
  };

  const onVertexDeleteClick = (event: ReactMouseEvent<HTMLButtonElement>) => {
    stopNativePropagationBeforeMapbox(event);
    event.preventDefault();
    event.stopPropagation();
    const armed = armedVertexRef.current;
    const instance = drawRef.current;
    if (!armed || !instance) {
      return;
    }
    try {
      if (deleteFeatureVertex(instance, armed.featureId, armed.index)) {
        armedVertexRef.current = null;
        setArmedVertex(null);
        persistFeature(instance, armed.featureId, contextRef.current);
      } else {
        contextRef.current.onError?.(MINIMUM_VERTEX_DELETE_MESSAGE);
      }
    } catch (error) {
      console.error(`MapEditLayer: failed to delete vertex on ${String(armed.featureId)}`, error);
      contextRef.current.onError?.("The vertex could not be deleted.");
    }
  };

  const onVertexHandlePointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    stopNativePropagationBeforeMapbox(event);
    if (
      !armedVertex ||
      !armedVertexPosition ||
      !event.isPrimary ||
      vertexDragRef.current ||
      (event.pointerType === "mouse" && event.button !== 0)
    ) {
      return;
    }
    event.preventDefault();
    event.stopPropagation();
    disableMapDragPan();
    event.currentTarget.setPointerCapture(event.pointerId);
    vertexDragRef.current = {
      pointerId: event.pointerId,
      featureId: armedVertex.featureId,
      index: armedVertex.index,
      startClientX: event.clientX,
      startClientY: event.clientY,
      startCoordinates: armedVertexPosition,
      moved: false,
    };
  };

  const onVertexHandlePointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    stopNativePropagationBeforeMapbox(event);
    if (vertexDragRef.current?.pointerId !== event.pointerId) {
      return;
    }
    event.preventDefault();
    event.stopPropagation();
    dragPendingRef.current = { x: event.clientX, y: event.clientY };
    if (dragFrameRef.current === null) {
      dragFrameRef.current = requestAnimationFrame(() => {
        dragFrameRef.current = null;
        const pending = dragPendingRef.current;
        if (pending && vertexDragRef.current) {
          updateDraggedVertex(pending.x, pending.y);
        }
      });
    }
  };

  const onVertexHandlePointerEnd = (event: ReactPointerEvent<HTMLDivElement>) => {
    stopNativePropagationBeforeMapbox(event);
    const drag = vertexDragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) {
      return;
    }
    event.preventDefault();
    event.stopPropagation();
    // Flush the final position synchronously — a coalesced frame could still
    // be pending, and persistFeature below must capture the final geometry.
    // Only when a move is actually outstanding: a pure tap on the grip must
    // not touch the store or persist.
    if (dragFrameRef.current !== null) {
      cancelAnimationFrame(dragFrameRef.current);
      dragFrameRef.current = null;
    }
    const pending = dragPendingRef.current;
    dragPendingRef.current = null;
    if (pending) {
      updateDraggedVertex(event.clientX, event.clientY);
    }
    vertexDragRef.current = null;
    restoreMapDragPan();
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    const instance = drawRef.current;
    if (drag.moved && instance) {
      persistFeature(instance, drag.featureId, contextRef.current);
    }
  };

  // Matches the armed vertex in the overlay data (feature id + ring index).
  // Always a data-driven expression — flipping the paint between a literal and
  // an expression switches the bucket's program configuration (constant ↔
  // attribute binder) on every arm, the class of paint transition behind
  // mapbox's "reading 'r'" render crash.
  const armedMatch: Expression = [
    "all",
    ["==", ["get", "feature"], armedVertex?.featureId ?? ""],
    ["==", ["get", "index"], armedVertex?.index ?? -1],
  ];

  return (
    <>
      <Source id="map-edit-vertices" type="geojson" data={vertices}>
        <Layer
          id="map-edit-vertex-points"
          type="circle"
          paint={{
            "circle-radius": [
              "interpolate",
              ["exponential", 1.2],
              ["zoom"],
              13,
              0,
              18,
              ["case", ["get", "selected"], 16, 9],
            ] as Expression,
            "circle-color": [
              "case",
              armedMatch,
              MAP_SELECTED_COLOR,
              ["get", "selected"],
              SELECTED_VERTEX_COLOR,
              VERTEX_COLOR,
            ] as Expression,
            "circle-opacity": 0.9,
            "circle-stroke-color": ["case", armedMatch, VERTEX_COLOR, MAP_PRIMARY_COLOR],
            "circle-stroke-width": [
              "interpolate",
              ["exponential", 1.2],
              ["zoom"],
              13,
              0,
              18,
              0.75,
            ] as Expression,
          }}
        />
      </Source>
      {armedVertexPosition ? (
        <Marker
          ref={deleteMarkerRef}
          longitude={armedVertexPosition[0]}
          latitude={armedVertexPosition[1]}
          anchor="bottom"
          offset={[0, -40]}
          pitchAlignment="viewport"
          rotationAlignment="viewport"
          style={vertexHandleMarkerStyle}
        >
          <button
            type="button"
            aria-label="Delete vertex"
            style={vertexDeleteButtonStyle}
            {...vertexControlCaptureProps}
            onClickCapture={onVertexDeleteClick}
          >
            Delete
          </button>
        </Marker>
      ) : null}
      {armedVertexPosition ? (
        <Marker
          ref={handleMarkerRef}
          longitude={armedVertexPosition[0]}
          latitude={armedVertexPosition[1]}
          anchor="top"
          pitchAlignment="viewport"
          rotationAlignment="viewport"
          style={vertexHandleMarkerStyle}
        >
          <div style={vertexHandleRootStyle}>
            <div style={vertexHandleStemStyle} />
            <div
              style={vertexHandleGripStyle}
              {...vertexControlCaptureProps}
              onPointerCancelCapture={onVertexHandlePointerEnd}
              onPointerDownCapture={onVertexHandlePointerDown}
              onPointerMoveCapture={onVertexHandlePointerMove}
              onPointerUpCapture={onVertexHandlePointerEnd}
            >
              <div style={vertexHandleGripLineStyle} />
              <div style={vertexHandleGripLineStyle} />
            </div>
          </div>
        </Marker>
      ) : null}
    </>
  );
}

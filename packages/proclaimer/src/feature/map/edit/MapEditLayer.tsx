import { useEffect, useRef, useState } from "react";

import type { Expression, Map as MapboxMap, MapMouseEvent, PointLike } from "mapbox-gl";
import { Layer, Source, useMap } from "react-map-gl/mapbox";
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
const EMPTY_VERTICES: MapEditVertexCollection = {
  type: "FeatureCollection",
  features: [],
};

interface EditContext {
  maps: MapRow[];
  collection: MapCollection | null;
  master: MapMasterRow | null;
  masterCollection: MapMasterCollection | null;
  onError?: (message: string) => void;
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
          midPointColor: VERTEX_COLOR,
          midPointOutlineColor: primary,
          midPointOpacity: 0.7,
          midPointWidth: 3,
          midPointOutlineWidth: 1,
          selectedPolygonColor: primary,
          selectedPolygonFillOpacity: 0.05,
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
          fillOpacity: 0.05,
          outlineColor: primary,
          outlineOpacity: 0.95,
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

  useEffect(() => {
    const mapboxMap = mapRef?.getMap();
    if (!mapboxMap) {
      return;
    }
    let cancelled = false;
    let instance: TerraDraw | null = null;

    // Tap a vertex dot to arm it (red), tap again or press Delete to remove
    // that coordinate — the touch-friendly counterpart to Terra Draw's
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
      setArmed(null);
      const feature = draw.getSnapshotFeature(armed.featureId);
      if (!feature) {
        return;
      }
      let next: MapEditFeature["geometry"] | null = null;
      if (feature.geometry.type === "Polygon") {
        const ring = [...feature.geometry.coordinates[0]];
        // A ring needs at least three real vertices plus the closing point.
        if (ring.length <= 4) {
          return;
        }
        if (armed.index === 0 || armed.index === ring.length - 1) {
          ring.shift();
          ring.pop();
          ring.push([ring[0][0], ring[0][1]]);
        } else {
          ring.splice(armed.index, 1);
        }
        next = { type: "Polygon", coordinates: [ring] };
      } else if (feature.geometry.type === "LineString") {
        if (feature.geometry.coordinates.length <= 2) {
          return;
        }
        const coordinates = [...feature.geometry.coordinates];
        coordinates.splice(armed.index, 1);
        next = { type: "LineString", coordinates };
      }
      if (!next) {
        return;
      }
      try {
        draw.updateFeatureGeometry(armed.featureId, next);
        persistFeature(draw, armed.featureId, contextRef.current);
      } catch (error) {
        console.error(`MapEditLayer: failed to delete vertex on ${String(armed.featureId)}`, error);
        contextRef.current.onError?.("The vertex could not be deleted.");
      }
    };

    const onMapClick = (event: MapMouseEvent) => {
      const draw = instance;
      if (!draw) {
        return;
      }
      const hit = vertexAt(event.point);
      const armed = armedVertexRef.current;
      if (hit && armed && armed.featureId === hit.featureId && armed.index === hit.index) {
        deleteArmedVertex();
        return;
      }
      disarmVertex();
      if (hit) {
        setArmed(hit);
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
    window.addEventListener("keydown", onKeyDown);
    return () => {
      cancelled = true;
      mapboxMap.off("style.load", create);
      mapboxMap.off("idle", onIdle);
      mapboxMap.off("click", onMapClick);
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
    <Source id="map-edit-vertices" type="geojson" data={vertices}>
      <Layer
        id="map-edit-vertex-points"
        type="circle"
        paint={{
          "circle-radius": ["case", armedMatch, 10, 4],
          "circle-color": ["case", armedMatch, MAP_SELECTED_COLOR, VERTEX_COLOR],
          "circle-opacity": 0.9,
          "circle-stroke-color": ["case", armedMatch, VERTEX_COLOR, MAP_PRIMARY_COLOR],
          "circle-stroke-width": 1.5,
        }}
      />
    </Source>
  );
}

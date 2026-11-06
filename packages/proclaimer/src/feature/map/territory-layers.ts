import { useEffect, useRef } from "react";

import type mapboxgl from "mapbox-gl";

import { getDefaultStorage } from "../settings/db.ts";
import { useTerritoryMapData, type UseTerritoryMapDataResult } from "./hooks.ts";
import { readMapViewState } from "./schema.ts";
import type { TerritoryGeoJson } from "./territory.ts";

/** Shared `fitBounds` options for framing territory features. */
export const TERRITORY_FIT_BOUNDS_OPTIONS = { padding: 48, maxZoom: 15 } as const;

export const TERRITORY_MASTER_SOURCE_ID = "proclaimer-territory-master";
export const TERRITORY_MAPS_SOURCE_ID = "proclaimer-territory-maps";
export const TERRITORY_BLOCKS_SOURCE_ID = "proclaimer-territory-blocks";

const SOURCE_IDS = [
  TERRITORY_MASTER_SOURCE_ID,
  TERRITORY_MAPS_SOURCE_ID,
  TERRITORY_BLOCKS_SOURCE_ID,
] as const;

// Blocks only read well when zoomed in; keep them out of the overview.
const BLOCKS_MIN_ZOOM = 13;

type LayerSpec = Parameters<mapboxgl.Map["addLayer"]>[0];

const LAYER_SPECS: LayerSpec[] = [
  {
    id: "proclaimer-territory-master-line",
    type: "line",
    source: TERRITORY_MASTER_SOURCE_ID,
    paint: { "line-color": "#3b82f6", "line-width": 2, "line-opacity": 0.9 },
  },
  {
    id: "proclaimer-territory-blocks-line",
    type: "line",
    source: TERRITORY_BLOCKS_SOURCE_ID,
    minzoom: BLOCKS_MIN_ZOOM,
    paint: { "line-color": "#6366f1", "line-width": 2, "line-dasharray": [2, 1] },
  },
  {
    id: "proclaimer-territory-maps-line",
    type: "line",
    source: TERRITORY_MAPS_SOURCE_ID,
    paint: { "line-color": "#10b981", "line-width": 2 },
  },
  {
    id: "proclaimer-territory-blocks-label",
    type: "symbol",
    source: TERRITORY_BLOCKS_SOURCE_ID,
    minzoom: BLOCKS_MIN_ZOOM,
    layout: {
      "text-field": ["get", "name"],
      "text-size": 12,
      "text-font": ["Open Sans Regular", "Arial Unicode MS Regular"],
      "symbol-placement": "point",
      "text-allow-overlap": false,
    },
    paint: { "text-color": "#4338ca", "text-halo-color": "#ffffff", "text-halo-width": 1.5 },
  },
  {
    id: "proclaimer-territory-maps-label",
    type: "symbol",
    source: TERRITORY_MAPS_SOURCE_ID,
    layout: {
      "text-field": ["get", "name"],
      "text-size": 13,
      "text-font": ["Open Sans Bold", "Arial Unicode MS Bold"],
      "symbol-placement": "point",
      "text-allow-overlap": false,
    },
    paint: { "text-color": "#059669", "text-halo-color": "#ffffff", "text-halo-width": 1.5 },
  },
];

export const TERRITORY_LAYER_IDS = LAYER_SPECS.map((spec) => spec.id);

function setSourceData(
  map: mapboxgl.Map,
  sourceId: string,
  data: TerritoryGeoJson[keyof TerritoryGeoJson],
): void {
  const existing = map.getSource(sourceId);
  if (existing) {
    (existing as mapboxgl.GeoJSONSource).setData(data);
    return;
  }
  map.addSource(sourceId, { type: "geojson", data });
}

/**
 * Idempotent sync: creates the geojson sources and layers if absent and pushes
 * the latest data into them. Safe to call on every `styledata` event, which is
 * what restores the overlays after a light/dark style swap drops them.
 */
export function syncTerritoryLayers(map: mapboxgl.Map, geojson: TerritoryGeoJson): void {
  setSourceData(map, TERRITORY_MASTER_SOURCE_ID, geojson.master);
  setSourceData(map, TERRITORY_BLOCKS_SOURCE_ID, geojson.blocks);
  setSourceData(map, TERRITORY_MAPS_SOURCE_ID, geojson.maps);
  for (const spec of LAYER_SPECS) {
    if (!map.getLayer(spec.id)) {
      map.addLayer(spec);
    }
  }
}

export function removeTerritoryLayers(map: mapboxgl.Map): void {
  try {
    for (const id of TERRITORY_LAYER_IDS) {
      if (map.getLayer(id)) {
        map.removeLayer(id);
      }
    }
    for (const id of SOURCE_IDS) {
      if (map.getSource(id)) {
        map.removeSource(id);
      }
    }
  } catch {
    // The map may already be removed during teardown; nothing left to clean up.
  }
}

export interface UseTerritoryLayersOptions {
  map: mapboxgl.Map | null;
  congregationId?: string | null;
  /**
   * When set and no persisted view exists, the map auto-fits the territory
   * once data arrives. A persisted view always wins over the fit.
   */
  viewStateStorageKey?: string;
  /** Fit the map to the territory bounds on first load. Defaults to true. */
  fitToData?: boolean;
}

/** Renders the congregation's territory data onto a mapbox map instance. */
export function useTerritoryLayers(options: UseTerritoryLayersOptions): UseTerritoryMapDataResult {
  const { map, congregationId, viewStateStorageKey, fitToData = true } = options;
  const data = useTerritoryMapData(congregationId);
  const { geojson, bounds } = data;

  const geojsonRef = useRef(geojson);
  geojsonRef.current = geojson;
  const hasAutoFit = useRef(false);

  useEffect(() => {
    if (!map) {
      return;
    }
    const sync = () => {
      if (map.isStyleLoaded()) {
        syncTerritoryLayers(map, geojsonRef.current);
      }
    };
    sync();
    map.on("styledata", sync);
    return () => {
      map.off("styledata", sync);
      removeTerritoryLayers(map);
    };
  }, [map]);

  useEffect(() => {
    if (map?.isStyleLoaded()) {
      syncTerritoryLayers(map, geojson);
    }
  }, [map, geojson]);

  useEffect(() => {
    if (!map || !bounds || !fitToData || hasAutoFit.current) {
      return;
    }
    hasAutoFit.current = true;
    const persisted = viewStateStorageKey
      ? readMapViewState(getDefaultStorage(), viewStateStorageKey)
      : null;
    if (!persisted) {
      map.fitBounds(bounds, TERRITORY_FIT_BOUNDS_OPTIONS);
    }
  }, [map, bounds, fitToData, viewStateStorageKey]);

  return data;
}

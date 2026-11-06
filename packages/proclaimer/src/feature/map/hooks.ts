import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { useLiveQuery } from "@tanstack/react-db";
import type mapboxgl from "mapbox-gl";

import { getDefaultStorage } from "../settings/db.ts";
import { useSettings } from "../settings/hooks.ts";
import { resolveIsDarkTheme } from "../settings/theme.ts";
import {
  getMapMasterCollection,
  getTerritoryMapCollection,
  type MapMasterCollection,
  type TerritoryMapCollection,
} from "./collection.ts";
import {
  areCoordinatesEqual,
  clampMapZoom,
  DEFAULT_MAP_CENTER,
  isMapboxAccessToken,
  MAP_DEFAULT_ZOOM,
  readMapViewState,
  resolveMapStyle,
  toMapboxCenter,
  writeMapViewState,
  type MapCoordinates,
} from "./schema.ts";
import {
  EMPTY_TERRITORY_GEOJSON,
  buildTerritoryGeoJson,
  geoJsonBounds,
  type MapMasterRow,
  type TerritoryBounds,
  type TerritoryGeoJson,
  type TerritoryMap,
} from "./territory.ts";

export interface UseMapboxMapOptions {
  accessToken?: string | null;
  mapStyle?: string;
  center?: MapCoordinates;
  zoom?: number;
  minZoom?: number;
  maxZoom?: number;
  interactive?: boolean;
  showNavigationControl?: boolean;
  showGeolocateControl?: boolean;
  viewStateStorageKey?: string;
  onLoad?: (map: mapboxgl.Map) => void;
}

export interface UseMapboxMapResult {
  containerRef: React.RefObject<HTMLDivElement | null>;
  map: mapboxgl.Map | null;
  error: string | null;
  isConfigured: boolean;
  resolvedStyle: string;
}

export function useMapboxMap(options: UseMapboxMapOptions = {}): UseMapboxMapResult {
  const {
    accessToken,
    mapStyle,
    center = DEFAULT_MAP_CENTER,
    zoom = MAP_DEFAULT_ZOOM,
    minZoom,
    maxZoom,
    interactive = true,
    showNavigationControl = true,
    showGeolocateControl = true,
    viewStateStorageKey,
    onLoad,
  } = options;

  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const onLoadRef = useRef(onLoad);
  const styleRef = useRef<string | null>(null);
  const centerRef = useRef(center);
  const zoomRef = useRef(zoom);
  const [map, setMap] = useState<mapboxgl.Map | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { theme } = useSettings();
  const resolvedStyle = resolveMapStyle(resolveIsDarkTheme(theme), mapStyle);
  const isConfigured = isMapboxAccessToken(accessToken);

  onLoadRef.current = onLoad;
  const resolvedStyleRef = useRef(resolvedStyle);
  resolvedStyleRef.current = resolvedStyle;

  useEffect(() => {
    const container = containerRef.current;
    if (!isConfigured || !accessToken || !container) {
      return;
    }

    let active = true;
    let hasLoaded = false;
    let instance: mapboxgl.Map | null = null;
    let observer: ResizeObserver | null = null;

    const init = async () => {
      setError(null);
      const { default: mapboxgl } = await import("mapbox-gl");
      if (!active) {
        return;
      }

      const viewStateStorage = viewStateStorageKey ? getDefaultStorage() : null;
      const persistedViewState =
        viewStateStorage && viewStateStorageKey
          ? readMapViewState(viewStateStorage, viewStateStorageKey)
          : null;
      const initialCenter = persistedViewState?.center ?? centerRef.current;
      const initialZoom = persistedViewState?.zoom ?? zoomRef.current;

      const initialStyle = resolvedStyleRef.current;
      instance = new mapboxgl.Map({
        container,
        accessToken: accessToken.trim(),
        style: initialStyle,
        center: toMapboxCenter(initialCenter),
        zoom: clampMapZoom(initialZoom),
        minZoom,
        maxZoom,
        interactive,
      });
      styleRef.current = initialStyle;

      if (showNavigationControl) {
        instance.addControl(new mapboxgl.NavigationControl(), "top-right");
      }
      if (showGeolocateControl) {
        instance.addControl(
          new mapboxgl.GeolocateControl({
            positionOptions: { enableHighAccuracy: true },
            trackUserLocation: true,
          }),
          "top-right",
        );
      }
      if (viewStateStorage && viewStateStorageKey) {
        const persistViewState = () => {
          if (!instance) {
            return;
          }
          const currentCenter = instance.getCenter();
          writeMapViewState(viewStateStorage, viewStateStorageKey, {
            center: { longitude: currentCenter.lng, latitude: currentCenter.lat },
            zoom: instance.getZoom(),
          });
        };
        instance.on("moveend", persistViewState);
      }
      for (const el of container.querySelectorAll<HTMLElement>(
        ".mapboxgl-ctrl-top-left, .mapboxgl-ctrl-top-right",
      )) {
        el.style.top = "var(--offset-top, 0px)";
      }
      if (typeof ResizeObserver !== "undefined") {
        observer = new ResizeObserver(() => instance?.resize());
        observer.observe(container);
      }

      instance.on("load", () => {
        hasLoaded = true;
        setError(null);
        onLoadRef.current?.(instance as mapboxgl.Map);
      });
      instance.on("error", (event) => {
        if (hasLoaded) {
          return;
        }
        setError(event.error instanceof Error ? event.error.message : "Failed to load map");
      });

      mapRef.current = instance;
      setMap(instance);
    };

    init().catch((err: unknown) => {
      if (active) {
        setError(err instanceof Error ? err.message : "Failed to load map");
      }
    });

    return () => {
      active = false;
      observer?.disconnect();
      instance?.remove();
      mapRef.current = null;
      setMap(null);
    };
    // The map is created once per access token; initial view values come from refs.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accessToken, isConfigured, viewStateStorageKey]);

  useEffect(() => {
    if (styleRef.current === resolvedStyle) {
      return;
    }
    styleRef.current = resolvedStyle;
    mapRef.current?.setStyle(resolvedStyle);
  }, [resolvedStyle]);

  useEffect(() => {
    if (!mapRef.current || areCoordinatesEqual(centerRef.current, center)) {
      centerRef.current = center;
      return;
    }
    centerRef.current = center;
    mapRef.current.setCenter(toMapboxCenter(center));
  }, [center]);

  useEffect(() => {
    if (!mapRef.current || zoomRef.current === zoom) {
      zoomRef.current = zoom;
      return;
    }
    zoomRef.current = zoom;
    mapRef.current.setZoom(clampMapZoom(zoom));
  }, [zoom]);

  return { containerRef, map, error, isConfigured, resolvedStyle };
}

export interface UseTerritoryMapDataResult {
  geojson: TerritoryGeoJson;
  /** Territory map rows for the congregation, sorted by name. */
  maps: TerritoryMap[];
  bounds: TerritoryBounds | null;
  isLoading: boolean;
  error: Error | null;
  retry: () => Promise<void>;
}

interface ResolvedTerritoryCollections {
  maps: TerritoryMapCollection | null;
  master: MapMasterCollection | null;
  error: Error | null;
}

function toTerritoryError(value: unknown): Error {
  if (value instanceof Error) {
    return value;
  }
  const message = (value as { message?: unknown } | null)?.message;
  return new Error(typeof message === "string" ? message : "Failed to load territory maps");
}

function resolveTerritoryCollections(
  congregationId: string | null | undefined,
): ResolvedTerritoryCollections {
  if (!congregationId) {
    return { maps: null, master: null, error: null };
  }
  try {
    return {
      maps: getTerritoryMapCollection(congregationId),
      master: getMapMasterCollection(congregationId),
      error: null,
    };
  } catch (err) {
    return { maps: null, master: null, error: toTerritoryError(err) };
  }
}

/**
 * Live territory data (congregation outline, territory map outlines, and their
 * street blocks) projected to GeoJSON for rendering on the mapbox map.
 */
export function useTerritoryMapData(congregationId?: string | null): UseTerritoryMapDataResult {
  const [resolved, setResolved] = useState<ResolvedTerritoryCollections>(() =>
    resolveTerritoryCollections(congregationId),
  );

  useEffect(() => {
    const next = resolveTerritoryCollections(congregationId);
    setResolved((prev) =>
      prev.maps === next.maps && prev.master === next.master && prev.error === next.error
        ? prev
        : next,
    );
  }, [congregationId]);

  const { data: mapRows, isLoading: mapsLoading } = useLiveQuery((q) =>
    resolved.maps ? q.from({ m: resolved.maps }).orderBy(({ m }) => m.name) : undefined,
  );
  const { data: masterRows, isLoading: masterLoading } = useLiveQuery((q) =>
    resolved.master ? q.from({ mm: resolved.master }) : undefined,
  );

  const maps = useMemo(() => (mapRows ?? []) as TerritoryMap[], [mapRows]);
  const geojson = useMemo(
    () =>
      resolved.maps || resolved.master
        ? buildTerritoryGeoJson(maps, (masterRows ?? []) as MapMasterRow[])
        : EMPTY_TERRITORY_GEOJSON,
    [resolved.maps, resolved.master, maps, masterRows],
  );
  const bounds = useMemo(() => geoJsonBounds(geojson), [geojson]);

  const retry = useCallback(async () => {
    const { maps, master } = resolved;
    if (!maps && !master) {
      setResolved(resolveTerritoryCollections(congregationId));
      return;
    }
    await Promise.all([
      maps?.utils.refetch?.({ throwOnError: false }),
      master?.utils.refetch?.({ throwOnError: false }),
    ]);
  }, [congregationId, resolved]);

  const queryError =
    [resolved.maps, resolved.master]
      .map((collection) => (collection?.utils.isError ? collection.utils.lastError : null))
      .find((lastError) => lastError != null) ?? null;

  return {
    geojson,
    maps,
    bounds,
    isLoading: congregationId != null && congregationId !== "" && (mapsLoading || masterLoading),
    error: resolved.error ?? (queryError ? toTerritoryError(queryError) : null),
    retry,
  };
}

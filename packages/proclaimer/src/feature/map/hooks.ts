import { useEffect, useMemo, useRef, useState } from "react";

import type {
  ErrorEvent,
  MapEvent,
  MapInstance,
  MapProps,
  MapRef,
  ViewStateChangeEvent,
} from "react-map-gl/mapbox";

import { getDefaultStorage } from "../settings/db.ts";
import { useSettings } from "../settings/hooks.ts";
import { resolveIsDarkTheme } from "../settings/theme.ts";
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

export interface UseMapViewOptions {
  accessToken?: string | null;
  mapStyle?: string;
  center?: MapCoordinates;
  zoom?: number;
  minZoom?: number;
  maxZoom?: number;
  interactive?: boolean;
  viewStateStorageKey?: string;
  onLoad?: (map: MapInstance) => void;
}

interface PendingViewState {
  center?: MapCoordinates;
  zoom?: number;
}

export interface UseMapViewResult {
  mapRef: React.RefObject<MapRef | null>;
  mapKey: string;
  error: string | null;
  isConfigured: boolean;
  resolvedStyle: string;
  mapProps: Pick<
    MapProps,
    | "initialViewState"
    | "minZoom"
    | "maxZoom"
    | "interactive"
    | "onLoad"
    | "onError"
    | "onMoveEnd"
    | "onRemove"
  >;
}

export function useMapView(options: UseMapViewOptions = {}): UseMapViewResult {
  const {
    accessToken,
    mapStyle,
    center = DEFAULT_MAP_CENTER,
    zoom = MAP_DEFAULT_ZOOM,
    minZoom,
    maxZoom,
    interactive = true,
    viewStateStorageKey,
    onLoad,
  } = options;

  const mapRef = useRef<MapRef | null>(null);
  const onLoadRef = useRef(onLoad);
  const hasLoadedRef = useRef(false);
  const centerRef = useRef(center);
  const zoomRef = useRef(zoom);
  const pendingViewRef = useRef<PendingViewState>({});
  const remountEpochRef = useRef(0);
  const remountSignalRef = useRef({ accessToken, viewStateStorageKey });
  const [error, setError] = useState<string | null>(null);
  const { theme } = useSettings();
  const resolvedStyle = resolveMapStyle(resolveIsDarkTheme(theme), mapStyle);
  const isConfigured = isMapboxAccessToken(accessToken);

  onLoadRef.current = onLoad;

  if (
    remountSignalRef.current.accessToken !== accessToken ||
    remountSignalRef.current.viewStateStorageKey !== viewStateStorageKey
  ) {
    remountSignalRef.current = { accessToken, viewStateStorageKey };
    remountEpochRef.current += 1;
  }
  const mapKey = `${remountEpochRef.current}:${viewStateStorageKey ?? ""}`;

  const initialViewState = useMemo(() => {
    const persistedViewState = viewStateStorageKey
      ? readMapViewState(getDefaultStorage(), viewStateStorageKey)
      : null;
    const initialCenter = persistedViewState?.center ?? center;
    const initialZoom = persistedViewState?.zoom ?? zoom;
    return {
      longitude: initialCenter.longitude,
      latitude: initialCenter.latitude,
      zoom: clampMapZoom(initialZoom),
    };
    // center and zoom are initial-only values; later changes are applied imperatively.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accessToken, viewStateStorageKey]);

  const handleLoad = (event: MapEvent) => {
    hasLoadedRef.current = true;
    setError(null);
    const pending = pendingViewRef.current;
    pendingViewRef.current = {};
    if (pending.center) {
      event.target.setCenter(toMapboxCenter(pending.center));
    }
    if (pending.zoom !== undefined) {
      event.target.setZoom(clampMapZoom(pending.zoom));
    }
    for (const el of event.target
      .getContainer()
      .querySelectorAll<HTMLElement>(".mapboxgl-ctrl-top-left, .mapboxgl-ctrl-top-right")) {
      el.style.top = "var(--offset-top, 0px)";
    }
    onLoadRef.current?.(event.target);
  };

  const handleError = (event: ErrorEvent) => {
    if (hasLoadedRef.current) {
      return;
    }
    setError(event.error instanceof Error ? event.error.message : "Failed to load map");
  };

  const handleRemove = () => {
    hasLoadedRef.current = false;
    setError(null);
  };

  const handleMoveEnd = (event: ViewStateChangeEvent) => {
    if (!viewStateStorageKey) {
      return;
    }
    const { longitude, latitude, zoom: nextZoom } = event.viewState;
    writeMapViewState(getDefaultStorage(), viewStateStorageKey, {
      center: { longitude, latitude },
      zoom: nextZoom,
    });
  };

  useEffect(() => {
    const changed = !areCoordinatesEqual(centerRef.current, center);
    centerRef.current = center;
    if (!changed) {
      return;
    }
    if (mapRef.current) {
      mapRef.current.setCenter(toMapboxCenter(center));
    } else {
      pendingViewRef.current.center = center;
    }
  }, [center]);

  useEffect(() => {
    const changed = zoomRef.current !== zoom;
    zoomRef.current = zoom;
    if (!changed) {
      return;
    }
    if (mapRef.current) {
      mapRef.current.setZoom(clampMapZoom(zoom));
    } else {
      pendingViewRef.current.zoom = zoom;
    }
  }, [zoom]);

  return {
    mapRef,
    mapKey,
    error,
    isConfigured,
    resolvedStyle,
    mapProps: {
      initialViewState,
      minZoom,
      maxZoom,
      interactive,
      onLoad: handleLoad,
      onError: handleError,
      onMoveEnd: handleMoveEnd,
      onRemove: handleRemove,
    },
  };
}

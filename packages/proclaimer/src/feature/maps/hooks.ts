import { useEffect, useRef, useState } from "react";

import type mapboxgl from "mapbox-gl";

import { useSettings } from "../settings/hooks.ts";
import { resolveIsDarkTheme } from "../settings/theme.ts";
import {
  areCoordinatesEqual,
  clampMapZoom,
  DEFAULT_MAP_CENTER,
  isMapboxAccessToken,
  MAP_DEFAULT_ZOOM,
  resolveMapStyle,
  toMapboxCenter,
  type MapCoordinates,
} from "./schema.ts";

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

      const initialStyle = resolvedStyleRef.current;
      instance = new mapboxgl.Map({
        container,
        accessToken: accessToken.trim(),
        style: initialStyle,
        center: toMapboxCenter(centerRef.current),
        zoom: clampMapZoom(zoomRef.current),
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
  }, [accessToken, isConfigured]);

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

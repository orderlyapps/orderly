import { z } from "zod";

export const MAPBOX_LIGHT_STYLE = "mapbox://styles/mapbox/streets-v12";
export const MAPBOX_DARK_STYLE = "mapbox://styles/mapbox/dark-v11";

export const MAP_DEFAULT_ZOOM = 2;
export const MAP_MIN_ZOOM = 0;
export const MAP_MAX_ZOOM = 22;

export const mapCoordinatesSchema = z.object({
  longitude: z.number().min(-180).max(180),
  latitude: z.number().min(-90).max(90),
});

export type MapCoordinates = z.infer<typeof mapCoordinatesSchema>;

export const mapViewStateSchema = z.object({
  center: mapCoordinatesSchema,
  zoom: z.number(),
});

export type MapViewState = z.infer<typeof mapViewStateSchema>;

export interface MapViewStateStorage {
  getItem: (key: string) => string | null;
  setItem: (key: string, value: string) => void;
}

export const MAP_VIEW_STATE_STORAGE_KEY = "proclaimer:map-view";

export type MapboxLngLatTuple = [longitude: number, latitude: number];

export const DEFAULT_MAP_CENTER: MapCoordinates = { longitude: 0, latitude: 20 };

export const isMapboxAccessToken = (value: unknown): value is string =>
  typeof value === "string" && value.trim().length > 0;

export const isValidCoordinates = (value: unknown): value is MapCoordinates =>
  mapCoordinatesSchema.safeParse(value).success;

export const toMapboxCenter = (coordinates: MapCoordinates): MapboxLngLatTuple => [
  coordinates.longitude,
  coordinates.latitude,
];

export const areCoordinatesEqual = (a: MapCoordinates, b: MapCoordinates): boolean =>
  a.longitude === b.longitude && a.latitude === b.latitude;

export const clampMapZoom = (zoom: number): number =>
  Math.min(MAP_MAX_ZOOM, Math.max(MAP_MIN_ZOOM, zoom));

export const resolveMapStyle = (isDarkTheme: boolean, mapStyle?: string): string =>
  mapStyle ?? (isDarkTheme ? MAPBOX_DARK_STYLE : MAPBOX_LIGHT_STYLE);

export const isValidMapViewState = (value: unknown): value is MapViewState =>
  mapViewStateSchema.safeParse(value).success;

export function readMapViewState(
  storage: MapViewStateStorage,
  storageKey: string,
): MapViewState | null {
  try {
    const raw = storage.getItem(storageKey);
    if (!raw) {
      return null;
    }
    const parsed = mapViewStateSchema.safeParse(JSON.parse(raw));
    if (!parsed.success) {
      return null;
    }
    return { center: parsed.data.center, zoom: clampMapZoom(parsed.data.zoom) };
  } catch {
    return null;
  }
}

export function writeMapViewState(
  storage: MapViewStateStorage,
  storageKey: string,
  state: MapViewState,
): void {
  try {
    storage.setItem(storageKey, JSON.stringify(state));
  } catch {
    // View state persistence is best-effort; storage write failures are non-fatal
  }
}

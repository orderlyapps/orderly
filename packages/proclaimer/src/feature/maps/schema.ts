export const MAPBOX_LIGHT_STYLE = "mapbox://styles/mapbox/streets-v12";
export const MAPBOX_DARK_STYLE = "mapbox://styles/mapbox/dark-v11";

export const MAP_DEFAULT_ZOOM = 2;
export const MAP_MIN_ZOOM = 0;
export const MAP_MAX_ZOOM = 22;

export interface MapCoordinates {
  longitude: number;
  latitude: number;
}

export type MapboxLngLatTuple = [longitude: number, latitude: number];

export const DEFAULT_MAP_CENTER: MapCoordinates = { longitude: 0, latitude: 20 };

export const isMapboxAccessToken = (value: unknown): value is string =>
  typeof value === "string" && value.trim().length > 0;

export const isValidCoordinates = (value: unknown): value is MapCoordinates => {
  if (typeof value !== "object" || value === null) {
    return false;
  }
  const { longitude, latitude } = value as MapCoordinates;
  return (
    Number.isFinite(longitude) &&
    Number.isFinite(latitude) &&
    longitude >= -180 &&
    longitude <= 180 &&
    latitude >= -90 &&
    latitude <= 90
  );
};

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

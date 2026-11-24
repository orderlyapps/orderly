import { z } from "zod";

import {
  boundaryToBounds,
  boundaryToPolygonCoords,
  mapBoundarySchema,
  type MapBounds,
} from "../maps/schema.ts";

export const MAP_MASTER_TABLE = "map_master";

// Mirrors the Supabase "map_master" table: a single row per congregation
// holding the boundary of the congregation's whole territory.
export const mapMasterRowSchema = z.object({
  congregation_id: z.string().min(1),
  boundary: mapBoundarySchema,
  details: z.string().nullish(),
});

export type MapMasterRow = z.infer<typeof mapMasterRowSchema>;

export type MapMasterFeature = {
  type: "Feature";
  geometry: { type: "Polygon"; coordinates: number[][][] };
  properties: { details: string | null };
};

export type MapMasterGeoJSON = {
  type: "FeatureCollection";
  features: MapMasterFeature[];
};

export function mapMasterToGeoJSON(row: MapMasterRow | null | undefined): MapMasterGeoJSON {
  const coordinates = row ? boundaryToPolygonCoords(row.boundary) : null;
  return {
    type: "FeatureCollection",
    features: coordinates
      ? [
          {
            type: "Feature",
            geometry: { type: "Polygon", coordinates },
            properties: { details: row?.details ?? null },
          },
        ]
      : [],
  };
}

export function mapMasterToBounds(row: MapMasterRow | null | undefined): MapBounds | null {
  return row ? boundaryToBounds(row.boundary) : null;
}

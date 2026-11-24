import { z } from "zod";

import type { NotAtHomeVisibility } from "../../settings/schema.ts";

export const NOT_AT_HOME_VIEW = "not_at_home_view";

// Mapbox styles cannot resolve CSS variables; cluster color matches
// --ion-color-primary (same value as MAP_BLOCK_COLOR in ../maps/schema.ts).
export const NOT_AT_HOME_CLUSTER_COLOR = "#4a6da7";
export const NOT_AT_HOME_WRITE_COLOR = "#090";
export const NOT_AT_HOME_STALE_COLOR = "#A020F0";
export const NOT_AT_HOME_RETURN_COLOR = "#F00";

export const NOT_AT_HOME_UNIT_MIN_ZOOM = 14;
export const NOT_AT_HOME_LABEL_MIN_ZOOM = 16;
export const NOT_AT_HOME_CLUSTER_MAX_ZOOM = 14;
// The source's clusterMaxZoom must stay exactly one step below the cluster
// layers' maxzoom so clustered points expand at the same zoom level the
// cluster layers hand off to the house/unit layers.
export const NOT_AT_HOME_CLUSTER_SOURCE_MAX_ZOOM = NOT_AT_HOME_CLUSTER_MAX_ZOOM - 1;
export const NOT_AT_HOME_CLUSTER_RADIUS = 50;

// Days after which a not-at-home counts as "old" for purple coloring and the
// "hide_old" visibility option. 0 means never mark as old.
export const NOT_AT_HOME_STALE_DAY_CHOICES = [0, 1, 7, 14, 21, 28, 60, 90, 120] as const;

const DAY_MS = 24 * 60 * 60 * 1000;

// Mirrors the Supabase "not_at_home_view" view: the not_at_home row joined to
// its street and suburb names, restricted to rows with usable coordinates.
export const notAtHomeRowSchema = z.object({
  id: z.string().min(1),
  congregation_id: z.string().min(1),
  house_number: z.string(),
  unit_number: z.string().nullish(),
  street_name: z.string().nullish(),
  suburb_name: z.string().nullish(),
  full_address: z.string().nullish(),
  write: z.boolean().nullish(),
  created_at: z.string().nullish(),
  longitude: z.number().nullish(),
  latitude: z.number().nullish(),
});

export type NotAtHomeRow = z.infer<typeof notAtHomeRowSchema>;

export type NotAtHomeMarker = NotAtHomeRow & {
  write: boolean;
  street: string;
  suburb: string;
  coordinates: [number, number];
};

export type NotAtHomeFeature = {
  type: "Feature";
  id: string;
  properties: NotAtHomeMarker & {
    group_key: string;
    unit_count: number;
    unit_data: NotAtHomeMarker[];
    write_count: number;
    return_count: number;
    stale: boolean;
  };
  geometry: { type: "Point"; coordinates: [number, number] };
};

export type GroupedNotAtHomes = Record<string, NotAtHomeMarker[]>;

export function notAtHomeRowToMarker(row: NotAtHomeRow): NotAtHomeMarker | null {
  if (typeof row.longitude !== "number" || typeof row.latitude !== "number") {
    return null;
  }
  return {
    ...row,
    write: row.write ?? false,
    street: row.street_name ?? "",
    suburb: row.suburb_name ?? "",
    coordinates: [row.longitude, row.latitude],
  };
}

// Not-at-homes at the same address share one marker; units of a multi-unit
// house group by suburb|street|house_number so "3/12 Main St" and
// "7/12 Main St" collapse into a single grouped marker.
export function groupNotAtHomeMarkers(rows: NotAtHomeRow[]): GroupedNotAtHomes {
  const groups: GroupedNotAtHomes = {};
  for (const row of rows) {
    const marker = notAtHomeRowToMarker(row);
    if (!marker) {
      continue;
    }
    const key = `${marker.suburb}|${marker.street}|${marker.house_number}`;
    (groups[key] ??= []).push(marker);
  }
  return groups;
}

export function buildNotAtHomeFeatures(
  groupedByAddress: GroupedNotAtHomes,
  staleDays = 0,
  now = Date.now(),
  visibility: NotAtHomeVisibility = "all",
): NotAtHomeFeature[] {
  const staleThresholdMs = staleDays > 0 ? staleDays * DAY_MS : null;

  const isStale = (item: NotAtHomeMarker): boolean => {
    if (item.write || staleThresholdMs === null) return false;
    const createdAt = new Date(item.created_at ?? "").getTime();
    return Number.isFinite(createdAt) && now - createdAt >= staleThresholdMs;
  };

  return Object.entries(groupedByAddress)
    .filter(([, group]) => group.length > 0)
    .map(([group_key, group]): NotAtHomeFeature => {
      const firstItem = group[0];
      const write_count = group.filter((item) => item.write).length;
      const return_count = group.filter((item) => !item.write).length;
      const stale_count = group.filter(isStale).length;

      return {
        type: "Feature",
        id: firstItem.id,
        properties: {
          ...firstItem,
          group_key,
          unit_count: group.length,
          unit_data: group,
          write_count,
          return_count,
          stale: return_count > 0 && stale_count === return_count,
        },
        geometry: {
          type: "Point",
          coordinates: firstItem.coordinates,
        },
      };
    })
    .filter(({ properties }) => {
      if (visibility === "hide_old") return !properties.stale;
      if (visibility === "hide_new") {
        return properties.stale || properties.return_count === 0;
      }
      return true;
    });
}

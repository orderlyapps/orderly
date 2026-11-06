import { useEffect, useMemo, useState } from "react";

import { useLiveQuery } from "@tanstack/react-db";

import { useSettings } from "../../settings/hooks.ts";
import { getMapCollection, type MapCollection } from "./collection.ts";
import {
  mapRowsToBounds,
  mapRowsToGeoJSON,
  type MapBounds,
  type MapPolygonsGeoJSON,
  type MapRow,
} from "./schema.ts";

export interface UseMapPolygonsResult {
  maps: MapRow[];
  geojson: MapPolygonsGeoJSON;
  bounds: MapBounds | null;
  isLoading: boolean;
  error: Error | null;
  collection: MapCollection | null;
}

interface ResolvedCollection {
  collection: MapCollection | null;
  error: Error | null;
}

function toError(value: unknown): Error {
  if (value instanceof Error) {
    return value;
  }
  const message = (value as { message?: unknown } | null)?.message;
  return new Error(typeof message === "string" ? message : "Failed to load maps");
}

function resolveCollection(congregationId: string): ResolvedCollection {
  if (!congregationId) {
    return { collection: null, error: null };
  }
  try {
    return { collection: getMapCollection(congregationId), error: null };
  } catch (err) {
    return { collection: null, error: toError(err) };
  }
}

export function useMapPolygons(congregationId?: string): UseMapPolygonsResult {
  const { settings } = useSettings();
  const resolvedId = (congregationId ?? settings.congregationId).trim();
  const [resolved, setResolved] = useState<ResolvedCollection>(() => resolveCollection(resolvedId));

  useEffect(() => {
    const next = resolveCollection(resolvedId);
    setResolved((prev) =>
      prev.collection === next.collection && prev.error === next.error ? prev : next,
    );
  }, [resolvedId]);

  const { data, isLoading } = useLiveQuery((q) =>
    resolved.collection ? q.from({ m: resolved.collection }) : undefined,
  );

  const maps = useMemo(() => data ?? [], [data]);
  const geojson = useMemo(() => mapRowsToGeoJSON(maps), [maps]);
  const bounds = useMemo(() => mapRowsToBounds(maps), [maps]);

  const queryError =
    resolved.collection?.utils.isError && resolved.collection.utils.lastError != null
      ? toError(resolved.collection.utils.lastError)
      : null;

  return {
    maps,
    geojson,
    bounds,
    isLoading: resolved.collection !== null && isLoading,
    error: resolved.error ?? queryError,
    collection: resolved.collection,
  };
}

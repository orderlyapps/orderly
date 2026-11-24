import { useEffect, useMemo, useState } from "react";

import { useLiveQuery } from "@tanstack/react-db";

import { useSettings } from "../../settings/hooks.ts";
import { getMapMasterCollection, type MapMasterCollection } from "./collection.ts";
import type { MapBounds } from "../maps/schema.ts";
import {
  mapMasterToBounds,
  mapMasterToGeoJSON,
  type MapMasterGeoJSON,
  type MapMasterRow,
} from "./schema.ts";

export interface UseMasterMapResult {
  master: MapMasterRow | null;
  geojson: MapMasterGeoJSON;
  bounds: MapBounds | null;
  isLoading: boolean;
  error: Error | null;
  collection: MapMasterCollection | null;
}

interface ResolvedCollection {
  collection: MapMasterCollection | null;
  error: Error | null;
}

function toError(value: unknown): Error {
  if (value instanceof Error) {
    return value;
  }
  const message = (value as { message?: unknown } | null)?.message;
  return new Error(typeof message === "string" ? message : "Failed to load master map");
}

function resolveCollection(congregationId: string): ResolvedCollection {
  if (!congregationId) {
    return { collection: null, error: null };
  }
  try {
    return { collection: getMapMasterCollection(congregationId), error: null };
  } catch (err) {
    return { collection: null, error: toError(err) };
  }
}

export function useMasterMap(congregationId?: string): UseMasterMapResult {
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
    resolved.collection ? q.from({ mm: resolved.collection }) : undefined,
  );

  const master = useMemo(() => data?.[0] ?? null, [data]);
  const geojson = useMemo(() => mapMasterToGeoJSON(master), [master]);
  const bounds = useMemo(() => mapMasterToBounds(master), [master]);

  const queryError =
    resolved.collection?.utils.isError && resolved.collection.utils.lastError != null
      ? toError(resolved.collection.utils.lastError)
      : null;

  return {
    master,
    geojson,
    bounds,
    isLoading: resolved.collection !== null && isLoading,
    error: resolved.error ?? queryError,
    collection: resolved.collection,
  };
}

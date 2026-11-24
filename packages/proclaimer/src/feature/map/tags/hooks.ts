import { useEffect, useState } from "react";

import { useLiveQuery } from "@tanstack/react-db";

import { useSettings } from "../../settings/hooks.ts";
import {
  getMapTagAssignmentCollection,
  getMapTagCollection,
  type MapTagAssignmentCollection,
  type MapTagCollection,
} from "./collection.ts";
import type { MapTagAssignmentRow, MapTagRow } from "./schema.ts";

interface ResolvedCollection<C> {
  collection: C | null;
  error: Error | null;
}

function toError(value: unknown): Error {
  if (value instanceof Error) {
    return value;
  }
  const message = (value as { message?: unknown } | null)?.message;
  return new Error(typeof message === "string" ? message : "Failed to load map tags");
}

function resolveCollection<C>(key: string, resolve: (key: string) => C): ResolvedCollection<C> {
  if (!key) {
    return { collection: null, error: null };
  }
  try {
    return { collection: resolve(key), error: null };
  } catch (err) {
    return { collection: null, error: toError(err) };
  }
}

function useTableCollection<C>(key: string, resolve: (key: string) => C): ResolvedCollection<C> {
  const [resolved, setResolved] = useState<ResolvedCollection<C>>(() =>
    resolveCollection(key, resolve),
  );

  useEffect(() => {
    const next = resolveCollection(key, resolve);
    setResolved((prev) =>
      prev.collection === next.collection && prev.error === next.error ? prev : next,
    );
  }, [key, resolve]);

  return resolved;
}

function collectionError(collection: { utils: { isError: boolean; lastError: unknown } } | null) {
  return collection?.utils.isError && collection.utils.lastError != null
    ? toError(collection.utils.lastError)
    : null;
}

export interface UseMapTagsResult {
  tags: MapTagRow[];
  isLoading: boolean;
  error: Error | null;
  collection: MapTagCollection | null;
}

export function useMapTags(congregationId?: string): UseMapTagsResult {
  const { settings } = useSettings();
  const resolvedId = (congregationId ?? settings.congregationId).trim();
  const resolved = useTableCollection(resolvedId, getMapTagCollection);

  const { data, isLoading } = useLiveQuery((q) =>
    resolved.collection ? q.from({ t: resolved.collection }) : undefined,
  );

  return {
    tags: data ?? [],
    isLoading: resolved.collection !== null && isLoading,
    error: resolved.error ?? collectionError(resolved.collection),
    collection: resolved.collection,
  };
}

export interface UseMapTagAssignmentsResult {
  assignments: MapTagAssignmentRow[];
  isLoading: boolean;
  error: Error | null;
  collection: MapTagAssignmentCollection | null;
}

export function useMapTagAssignments(mapId?: string | null): UseMapTagAssignmentsResult {
  const resolved = useTableCollection((mapId ?? "").trim(), getMapTagAssignmentCollection);

  const { data, isLoading } = useLiveQuery((q) =>
    resolved.collection ? q.from({ a: resolved.collection }) : undefined,
  );

  return {
    assignments: data ?? [],
    isLoading: resolved.collection !== null && isLoading,
    error: resolved.error ?? collectionError(resolved.collection),
    collection: resolved.collection,
  };
}

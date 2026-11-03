import { useCallback, useEffect, useState } from "react";

import { useLiveQuery } from "@tanstack/react-db";

import { getCongregationCollection, type CongregationCollection } from "./collection.ts";
import type { Congregation } from "./schema.ts";

export interface UseCongregationsResult {
  congregations: Congregation[];
  isLoading: boolean;
  error: Error | null;
  canRetry: boolean;
  collection: CongregationCollection | null;
  retry: () => Promise<void>;
}

interface ResolvedCollection {
  collection: CongregationCollection | null;
  error: Error | null;
}

function toError(value: unknown): Error {
  if (value instanceof Error) {
    return value;
  }
  const message = (value as { message?: unknown } | null)?.message;
  return new Error(typeof message === "string" ? message : "Failed to load congregations");
}

function resolveCollection(collection?: CongregationCollection): ResolvedCollection {
  if (collection) {
    return { collection, error: null };
  }
  try {
    return { collection: getCongregationCollection(), error: null };
  } catch (err) {
    return { collection: null, error: toError(err) };
  }
}

export function useCongregations(collection?: CongregationCollection): UseCongregationsResult {
  const [resolved, setResolved] = useState<ResolvedCollection>(() => resolveCollection(collection));

  useEffect(() => {
    const next = resolveCollection(collection);
    setResolved((prev) =>
      prev.collection === next.collection && prev.error === next.error ? prev : next,
    );
  }, [collection]);

  const active = collection ?? resolved.collection;

  const { data, isLoading } = useLiveQuery((q) =>
    active ? q.from({ c: active }).orderBy(({ c }) => c.name) : undefined,
  );

  const retry = useCallback(async () => {
    const target = collection ?? resolved.collection;
    if (!target) {
      setResolved(resolveCollection(collection));
      return;
    }
    await target.utils.refetch?.({ throwOnError: false });
  }, [collection, resolved.collection]);

  const queryError =
    active?.utils.isError && active.utils.lastError != null
      ? toError(active.utils.lastError)
      : null;

  return {
    congregations: data ?? [],
    isLoading: active !== null && isLoading,
    error: resolved.error ?? queryError,
    canRetry: active !== null,
    collection: active,
    retry,
  };
}

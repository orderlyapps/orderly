import { useEffect, useMemo, useState } from "react";

import { useLiveQuery } from "@tanstack/react-db";

import { useSettings } from "../../settings/hooks.ts";
import { getNotAtHomeCollection, type NotAtHomeCollection } from "./collection.ts";
import { groupNotAtHomeMarkers, type GroupedNotAtHomes, type NotAtHomeRow } from "./schema.ts";

export interface UseNotAtHomesResult {
  rows: NotAtHomeRow[];
  groups: GroupedNotAtHomes | null;
  isLoading: boolean;
  error: Error | null;
  collection: NotAtHomeCollection | null;
}

interface ResolvedCollection {
  collection: NotAtHomeCollection | null;
  error: Error | null;
}

function toError(value: unknown): Error {
  if (value instanceof Error) {
    return value;
  }
  const message = (value as { message?: unknown } | null)?.message;
  return new Error(typeof message === "string" ? message : "Failed to load not at homes");
}

function resolveCollection(congregationId: string): ResolvedCollection {
  if (!congregationId) {
    return { collection: null, error: null };
  }
  try {
    return { collection: getNotAtHomeCollection(congregationId), error: null };
  } catch (err) {
    return { collection: null, error: toError(err) };
  }
}

export function useNotAtHomes(congregationId?: string): UseNotAtHomesResult {
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
    resolved.collection ? q.from({ nah: resolved.collection }) : undefined,
  );

  const rows = useMemo(() => data ?? [], [data]);
  const groups = useMemo(
    () => (resolved.collection ? groupNotAtHomeMarkers(rows) : null),
    [resolved.collection, rows],
  );

  const queryError =
    resolved.collection?.utils.isError && resolved.collection.utils.lastError != null
      ? toError(resolved.collection.utils.lastError)
      : null;

  return {
    rows,
    groups,
    isLoading: resolved.collection !== null && isLoading,
    error: resolved.error ?? queryError,
    collection: resolved.collection,
  };
}

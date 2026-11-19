import { useCallback, useEffect, useState } from "react";

import { useLiveQuery } from "@tanstack/react-db";

import {
  getPublisherReportCollection,
  getReportCollection,
  type ReportCollection,
} from "./collection.ts";
import type { Report } from "./schema.ts";

export interface UseReportsResult {
  reports: Report[];
  isLoading: boolean;
  error: Error | null;
  canRetry: boolean;
  collection: ReportCollection | null;
  retry: () => Promise<void>;
}

interface ResolvedCollection {
  collection: ReportCollection | null;
  error: Error | null;
}

function toError(value: unknown): Error {
  if (value instanceof Error) {
    return value;
  }
  const message = (value as { message?: unknown } | null)?.message;
  return new Error(typeof message === "string" ? message : "Failed to load reports");
}

function resolveCollection(
  congregationId: string | null | undefined,
  monthId: string | null | undefined,
  collection?: ReportCollection,
): ResolvedCollection {
  if (collection) {
    return { collection, error: null };
  }
  if (!congregationId || !monthId) {
    return { collection: null, error: null };
  }
  try {
    return { collection: getReportCollection(congregationId, monthId), error: null };
  } catch (err) {
    return { collection: null, error: toError(err) };
  }
}

/**
 * Field-service reports for `congregationId` within the `monthId` activity
 * window (see `createReportCollection`).
 */
export function useReports(
  congregationId?: string | null,
  monthId?: string | null,
  collection?: ReportCollection,
): UseReportsResult {
  const [resolved, setResolved] = useState<ResolvedCollection>(() =>
    resolveCollection(congregationId, monthId, collection),
  );

  useEffect(() => {
    const next = resolveCollection(congregationId, monthId, collection);
    setResolved((prev) =>
      prev.collection === next.collection && prev.error === next.error ? prev : next,
    );
  }, [collection, congregationId, monthId]);

  const active = collection ?? resolved.collection;

  const { data, isLoading } = useLiveQuery((q) => (active ? q.from({ r: active }) : undefined));

  const retry = useCallback(async () => {
    const target = collection ?? resolved.collection;
    if (!target) {
      setResolved(resolveCollection(congregationId, monthId, collection));
      return;
    }
    await target.utils.refetch?.({ throwOnError: false });
  }, [collection, congregationId, monthId, resolved.collection]);

  const queryError =
    active?.utils.isError && active.utils.lastError != null
      ? toError(active.utils.lastError)
      : null;

  return {
    reports: data ?? [],
    isLoading: active !== null && isLoading,
    error: resolved.error ?? queryError,
    canRetry: active !== null,
    collection: active,
    retry,
  };
}

function resolvePublisherCollection(
  idsKey: string,
  monthId: string | null | undefined,
  collection?: ReportCollection,
): ResolvedCollection {
  if (collection) {
    return { collection, error: null };
  }
  if (!idsKey || !monthId) {
    return { collection: null, error: null };
  }
  try {
    return { collection: getPublisherReportCollection(idsKey.split(","), monthId), error: null };
  } catch (err) {
    return { collection: null, error: toError(err) };
  }
}

/**
 * Field-service reports filed under `confidentialIds` within the
 * `PUBLISHER_REPORT_WINDOW_MONTHS`-month window ending at `monthId` (see
 * `createPublisherReportCollection`).
 */
export function usePublisherReports(
  confidentialIds: string[],
  monthId?: string | null,
  collection?: ReportCollection,
): UseReportsResult {
  // The sorted, deduped join is stable across renders even when the caller
  // passes a fresh array each time.
  const idsKey = [...new Set(confidentialIds)].sort().join(",");
  const [resolved, setResolved] = useState<ResolvedCollection>(() =>
    resolvePublisherCollection(idsKey, monthId, collection),
  );

  useEffect(() => {
    const next = resolvePublisherCollection(idsKey, monthId, collection);
    setResolved((prev) =>
      prev.collection === next.collection && prev.error === next.error ? prev : next,
    );
  }, [collection, idsKey, monthId]);

  const active = collection ?? resolved.collection;

  const { data, isLoading } = useLiveQuery((q) => (active ? q.from({ r: active }) : undefined));

  const retry = useCallback(async () => {
    const target = collection ?? resolved.collection;
    if (!target) {
      setResolved(resolvePublisherCollection(idsKey, monthId, collection));
      return;
    }
    await target.utils.refetch?.({ throwOnError: false });
  }, [collection, idsKey, monthId, resolved.collection]);

  const queryError =
    active?.utils.isError && active.utils.lastError != null
      ? toError(active.utils.lastError)
      : null;

  return {
    reports: data ?? [],
    isLoading: active !== null && isLoading,
    error: resolved.error ?? queryError,
    canRetry: active !== null,
    collection: active,
    retry,
  };
}

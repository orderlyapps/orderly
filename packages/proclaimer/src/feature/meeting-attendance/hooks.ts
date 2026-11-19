import { useCallback, useEffect, useState } from "react";

import { useLiveQuery } from "@tanstack/react-db";

import { getMeetingAttendanceCollection, type MeetingAttendanceCollection } from "./collection.ts";
import type { MeetingAttendance } from "./schema.ts";

export interface UseMeetingAttendancesResult {
  attendances: MeetingAttendance[];
  isLoading: boolean;
  error: Error | null;
  canRetry: boolean;
  collection: MeetingAttendanceCollection | null;
  retry: () => Promise<void>;
}

interface ResolvedCollection {
  collection: MeetingAttendanceCollection | null;
  error: Error | null;
}

function toError(value: unknown): Error {
  if (value instanceof Error) {
    return value;
  }
  const message = (value as { message?: unknown } | null)?.message;
  return new Error(typeof message === "string" ? message : "Failed to load meeting attendance");
}

function resolveCollection(
  congregationId: string | null | undefined,
  monthId: string | null | undefined,
  collection?: MeetingAttendanceCollection,
): ResolvedCollection {
  if (collection) {
    return { collection, error: null };
  }
  if (!congregationId || !monthId) {
    return { collection: null, error: null };
  }
  try {
    return {
      collection: getMeetingAttendanceCollection(congregationId, monthId),
      error: null,
    };
  } catch (err) {
    return { collection: null, error: toError(err) };
  }
}

/**
 * Meeting attendance rows for `congregationId` for the weeks starting in
 * `monthId` (see `createMeetingAttendanceCollection`).
 */
export function useMeetingAttendances(
  congregationId?: string | null,
  monthId?: string | null,
  collection?: MeetingAttendanceCollection,
): UseMeetingAttendancesResult {
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

  const { data, isLoading } = useLiveQuery((q) => (active ? q.from({ a: active }) : undefined));

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
    attendances: data ?? [],
    isLoading: active !== null && isLoading,
    error: resolved.error ?? queryError,
    canRetry: active !== null,
    collection: active,
    retry,
  };
}

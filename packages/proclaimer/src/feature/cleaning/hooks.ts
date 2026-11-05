import { useCallback, useEffect, useMemo, useState } from "react";

import { useLiveQuery } from "@tanstack/react-db";

import {
  getCleanMajorCollection,
  getCleanMinorCollection,
  getGroupCollection,
  type CleaningAssignmentCollection,
  type GroupCollection,
} from "./collection.ts";
import { buildCleaningSchedule, type CleaningMonth } from "./schedule.ts";

export interface UseCleaningScheduleResult {
  months: CleaningMonth[];
  isLoading: boolean;
  error: Error | null;
  canRetry: boolean;
  retry: () => Promise<void>;
}

interface ResolvedCollections {
  major: CleaningAssignmentCollection | null;
  minor: CleaningAssignmentCollection | null;
  groups: GroupCollection | null;
  error: Error | null;
}

function toError(value: unknown): Error {
  if (value instanceof Error) {
    return value;
  }
  const message = (value as { message?: unknown } | null)?.message;
  return new Error(typeof message === "string" ? message : "Failed to load the cleaning schedule");
}

function collectionError(collections: ResolvedCollections): Error | null {
  for (const collection of [collections.major, collections.minor, collections.groups]) {
    if (collection?.utils.isError && collection.utils.lastError != null) {
      return toError(collection.utils.lastError);
    }
  }
  return null;
}

function resolveCollections(congregationId: string | null | undefined): ResolvedCollections {
  const resolved: ResolvedCollections = { major: null, minor: null, groups: null, error: null };
  if (!congregationId) {
    return resolved;
  }
  try {
    resolved.major = getCleanMajorCollection(congregationId);
    resolved.minor = getCleanMinorCollection(congregationId);
    resolved.groups = getGroupCollection(congregationId);
  } catch (err) {
    resolved.error = toError(err);
  }
  return resolved;
}

function sameCollections(a: ResolvedCollections, b: ResolvedCollections): boolean {
  return a.major === b.major && a.minor === b.minor && a.groups === b.groups && a.error === b.error;
}

export function useCleaningSchedule(congregationId?: string | null): UseCleaningScheduleResult {
  const [collections, setCollections] = useState<ResolvedCollections>(() =>
    resolveCollections(congregationId),
  );

  useEffect(() => {
    const next = resolveCollections(congregationId);
    setCollections((prev) => (sameCollections(prev, next) ? prev : next));
  }, [congregationId]);

  const { data: major, isLoading: majorLoading } = useLiveQuery((q) =>
    collections.major ? q.from({ c: collections.major }).orderBy(({ c }) => c.week_id) : undefined,
  );

  const { data: minor, isLoading: minorLoading } = useLiveQuery((q) =>
    collections.minor ? q.from({ c: collections.minor }).orderBy(({ c }) => c.week_id) : undefined,
  );

  const { data: groups, isLoading: groupsLoading } = useLiveQuery((q) =>
    collections.groups ? q.from({ g: collections.groups }) : undefined,
  );

  const months = useMemo(
    () => buildCleaningSchedule(major ?? [], minor ?? [], groups ?? []),
    [major, minor, groups],
  );

  const hasCongregation = Boolean(congregationId);
  const isLoading =
    hasCongregation &&
    ((collections.major !== null && majorLoading) ||
      (collections.minor !== null && minorLoading) ||
      (collections.groups !== null && groupsLoading));

  const retry = useCallback(async () => {
    const next = resolveCollections(congregationId);
    setCollections((prev) => (sameCollections(prev, next) ? prev : next));
    await Promise.all(
      [next.major, next.minor, next.groups].map((collection) =>
        Promise.resolve(collection?.utils.refetch?.({ throwOnError: false })),
      ),
    );
  }, [congregationId]);

  return {
    months,
    isLoading,
    error: collections.error ?? collectionError(collections),
    canRetry:
      collections.error !== null ||
      collections.major !== null ||
      collections.minor !== null ||
      collections.groups !== null,
    retry,
  };
}

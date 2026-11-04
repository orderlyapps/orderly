import { useCallback, useEffect, useMemo, useState } from "react";

import { eq, useLiveQuery } from "@tanstack/react-db";

import { getEventCollection, type EventCollection } from "../event/collection.ts";
import { getPublisherCollection, type PublisherCollection } from "../publisher/collection.ts";
import {
  getMidweekAssignmentCollection,
  getMidweekMeetingDataCollection,
  type MidweekAssignmentCollection,
  type MidweekMeetingDataCollection,
} from "./collection.ts";
import { buildMeetingProgram, type MeetingProgram } from "./program.ts";

export interface UseMidweekMeetingResult {
  program: MeetingProgram;
  isLoading: boolean;
  error: Error | null;
  canRetry: boolean;
  retry: () => Promise<void>;
}

interface ResolvedCollections {
  meetingData: MidweekMeetingDataCollection | null;
  assignments: MidweekAssignmentCollection | null;
  publishers: PublisherCollection | null;
  events: EventCollection | null;
  error: Error | null;
}

function toError(value: unknown): Error {
  if (value instanceof Error) {
    return value;
  }
  const message = (value as { message?: unknown } | null)?.message;
  return new Error(typeof message === "string" ? message : "Failed to load the midweek meeting");
}

function collectionError(collections: ResolvedCollections): Error | null {
  for (const collection of [
    collections.meetingData,
    collections.assignments,
    collections.publishers,
    collections.events,
  ]) {
    if (collection?.utils.isError && collection.utils.lastError != null) {
      return toError(collection.utils.lastError);
    }
  }
  return null;
}

function resolveCollections(congregationId: string | null | undefined): ResolvedCollections {
  const resolved: ResolvedCollections = {
    meetingData: null,
    assignments: null,
    publishers: null,
    events: null,
    error: null,
  };
  try {
    resolved.meetingData = getMidweekMeetingDataCollection();
  } catch (err) {
    resolved.error = toError(err);
    return resolved;
  }
  if (!congregationId) {
    return resolved;
  }
  try {
    resolved.assignments = getMidweekAssignmentCollection(congregationId);
    resolved.publishers = getPublisherCollection(congregationId);
    resolved.events = getEventCollection(congregationId);
  } catch (err) {
    resolved.error = toError(err);
  }
  return resolved;
}

function sameCollections(a: ResolvedCollections, b: ResolvedCollections): boolean {
  return (
    a.meetingData === b.meetingData &&
    a.assignments === b.assignments &&
    a.publishers === b.publishers &&
    a.events === b.events &&
    a.error === b.error
  );
}

export function useMidweekMeeting(
  weekId: string,
  congregationId?: string | null,
): UseMidweekMeetingResult {
  const [collections, setCollections] = useState<ResolvedCollections>(() =>
    resolveCollections(congregationId),
  );

  useEffect(() => {
    const next = resolveCollections(congregationId);
    setCollections((prev) => (sameCollections(prev, next) ? prev : next));
  }, [congregationId]);

  const { data: meetingRows, isLoading: meetingLoading } = useLiveQuery({
    query: (q) =>
      collections.meetingData
        ? q.from({ m: collections.meetingData }).where(({ m }) => eq(m.week_id, weekId))
        : undefined,
  });

  const { data: assignmentRows, isLoading: assignmentsLoading } = useLiveQuery({
    query: (q) =>
      collections.assignments
        ? q.from({ a: collections.assignments }).where(({ a }) => eq(a.week_id, weekId))
        : undefined,
  });

  const { data: publishers, isLoading: publishersLoading } = useLiveQuery({
    query: (q) => (collections.publishers ? q.from({ p: collections.publishers }) : undefined),
  });

  const { data: events, isLoading: eventsLoading } = useLiveQuery({
    query: (q) => (collections.events ? q.from({ e: collections.events }) : undefined),
  });

  const program = useMemo(
    () =>
      buildMeetingProgram({
        weekId,
        meeting: meetingRows?.[0],
        assignments: assignmentRows,
        publishers,
        events,
      }),
    [weekId, meetingRows, assignmentRows, publishers, events],
  );

  const hasCongregation = Boolean(congregationId);
  const isLoading =
    (collections.meetingData !== null && meetingLoading) ||
    (hasCongregation &&
      ((collections.assignments !== null && assignmentsLoading) ||
        (collections.publishers !== null && publishersLoading) ||
        (collections.events !== null && eventsLoading)));

  const retry = useCallback(async () => {
    const next = resolveCollections(congregationId);
    setCollections((prev) => (sameCollections(prev, next) ? prev : next));
    await Promise.all(
      [next.meetingData, next.assignments, next.publishers, next.events].map((collection) =>
        Promise.resolve(collection?.utils.refetch?.({ throwOnError: false })),
      ),
    );
  }, [congregationId]);

  return {
    program,
    isLoading,
    error: collections.error ?? collectionError(collections),
    canRetry:
      collections.error !== null ||
      collections.meetingData !== null ||
      collections.assignments !== null ||
      collections.publishers !== null ||
      collections.events !== null,
    retry,
  };
}

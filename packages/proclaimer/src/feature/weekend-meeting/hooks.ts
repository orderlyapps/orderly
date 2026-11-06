import { useCallback, useEffect, useMemo, useState } from "react";

import { eq, useLiveQuery } from "@tanstack/react-db";

import {
  getCongregationCollection,
  type CongregationCollection,
} from "../congregation/collection.ts";
import { getEventCollection, type EventCollection } from "../event/collection.ts";
import {
  getAllPublishersCollection,
  type AllPublishersCollection,
} from "../publisher/collection.ts";
import {
  getSpeakerAssignmentCollection,
  getTalkOutlineCollection,
  getWeekendAssignmentCollection,
  type SpeakerAssignmentCollection,
  type TalkOutlineCollection,
  type WeekendAssignmentCollection,
} from "./collection.ts";
import { buildWeekendProgram, type WeekendMeetingProgram } from "./program.ts";

export interface UseWeekendMeetingResult {
  program: WeekendMeetingProgram;
  isLoading: boolean;
  error: Error | null;
  canRetry: boolean;
  retry: () => Promise<void>;
}

interface ResolvedCollections {
  speakerAssignments: SpeakerAssignmentCollection | null;
  weekendAssignments: WeekendAssignmentCollection | null;
  outlines: TalkOutlineCollection | null;
  publishers: AllPublishersCollection | null;
  congregations: CongregationCollection | null;
  events: EventCollection | null;
  error: Error | null;
}

function toError(value: unknown): Error {
  if (value instanceof Error) {
    return value;
  }
  const message = (value as { message?: unknown } | null)?.message;
  return new Error(typeof message === "string" ? message : "Failed to load the weekend meeting");
}

function collectionError(collections: ResolvedCollections): Error | null {
  for (const collection of [
    collections.speakerAssignments,
    collections.weekendAssignments,
    collections.outlines,
    collections.publishers,
    collections.congregations,
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
    speakerAssignments: null,
    weekendAssignments: null,
    outlines: null,
    publishers: null,
    congregations: null,
    events: null,
    error: null,
  };
  try {
    resolved.speakerAssignments = getSpeakerAssignmentCollection();
    resolved.outlines = getTalkOutlineCollection();
    resolved.publishers = getAllPublishersCollection();
    resolved.congregations = getCongregationCollection();
  } catch (err) {
    resolved.error = toError(err);
    return resolved;
  }
  if (!congregationId) {
    return resolved;
  }
  try {
    resolved.weekendAssignments = getWeekendAssignmentCollection(congregationId);
    resolved.events = getEventCollection(congregationId);
  } catch (err) {
    resolved.error = toError(err);
  }
  return resolved;
}

function sameCollections(a: ResolvedCollections, b: ResolvedCollections): boolean {
  return (
    a.speakerAssignments === b.speakerAssignments &&
    a.weekendAssignments === b.weekendAssignments &&
    a.outlines === b.outlines &&
    a.publishers === b.publishers &&
    a.congregations === b.congregations &&
    a.events === b.events &&
    a.error === b.error
  );
}

export function useWeekendMeeting(
  weekId: string,
  congregationId?: string | null,
): UseWeekendMeetingResult {
  const [collections, setCollections] = useState<ResolvedCollections>(() =>
    resolveCollections(congregationId),
  );

  useEffect(() => {
    const next = resolveCollections(congregationId);
    setCollections((prev) => (sameCollections(prev, next) ? prev : next));
  }, [congregationId]);

  const { data: speakerAssignments, isLoading: speakersLoading } = useLiveQuery({
    query: (q) =>
      collections.speakerAssignments
        ? q.from({ s: collections.speakerAssignments }).where(({ s }) => eq(s.week_id, weekId))
        : undefined,
  });

  const { data: weekendAssignments, isLoading: assignmentsLoading } = useLiveQuery({
    query: (q) =>
      collections.weekendAssignments
        ? q.from({ a: collections.weekendAssignments }).where(({ a }) => eq(a.week_id, weekId))
        : undefined,
  });

  const { data: outlines, isLoading: outlinesLoading } = useLiveQuery({
    query: (q) => (collections.outlines ? q.from({ o: collections.outlines }) : undefined),
  });

  const { data: publishers, isLoading: publishersLoading } = useLiveQuery({
    query: (q) => (collections.publishers ? q.from({ p: collections.publishers }) : undefined),
  });

  const { data: congregations, isLoading: congregationsLoading } = useLiveQuery({
    query: (q) =>
      collections.congregations ? q.from({ c: collections.congregations }) : undefined,
  });

  const { data: events, isLoading: eventsLoading } = useLiveQuery({
    query: (q) => (collections.events ? q.from({ e: collections.events }) : undefined),
  });

  const program = useMemo(
    () =>
      buildWeekendProgram({
        weekId,
        congregationId,
        speakerAssignments,
        weekendAssignments,
        outlines,
        publishers,
        congregations,
        events,
      }),
    [
      weekId,
      congregationId,
      speakerAssignments,
      weekendAssignments,
      outlines,
      publishers,
      congregations,
      events,
    ],
  );

  const hasCongregation = Boolean(congregationId);
  const isLoading =
    (collections.speakerAssignments !== null && speakersLoading) ||
    (collections.outlines !== null && outlinesLoading) ||
    (collections.publishers !== null && publishersLoading) ||
    (collections.congregations !== null && congregationsLoading) ||
    (hasCongregation &&
      ((collections.weekendAssignments !== null && assignmentsLoading) ||
        (collections.events !== null && eventsLoading)));

  const retry = useCallback(async () => {
    const next = resolveCollections(congregationId);
    setCollections((prev) => (sameCollections(prev, next) ? prev : next));
    await Promise.all(
      [
        next.speakerAssignments,
        next.weekendAssignments,
        next.outlines,
        next.publishers,
        next.congregations,
        next.events,
      ].map((collection) => Promise.resolve(collection?.utils.refetch?.({ throwOnError: false }))),
    );
  }, [congregationId]);

  return {
    program,
    isLoading,
    error: collections.error ?? collectionError(collections),
    canRetry:
      collections.error !== null ||
      collections.speakerAssignments !== null ||
      collections.weekendAssignments !== null ||
      collections.outlines !== null ||
      collections.publishers !== null ||
      collections.congregations !== null ||
      collections.events !== null,
    retry,
  };
}

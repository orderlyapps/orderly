import { useCallback, useEffect, useMemo, useState } from "react";

import { and, eq, gte, inArray, useLiveQuery } from "@tanstack/react-db";

import {
  getCleanMajorCollection,
  getCleanMinorCollection,
  type CleaningAssignmentCollection,
} from "../cleaning/collection.ts";
import {
  getMidweekAssignmentCollection,
  getMidweekMeetingDataCollection,
  type MidweekAssignmentCollection,
  type MidweekMeetingDataCollection,
} from "../midweek-meeting/collection.ts";
import { getPublisherCollection, type PublisherCollection } from "../publisher/collection.ts";
import {
  getSpeakerAssignmentCollection,
  getWeekendAssignmentCollection,
  type SpeakerAssignmentCollection,
  type WeekendAssignmentCollection,
} from "../weekend-meeting/collection.ts";
import { currentWeekId } from "../../util/week.ts";
import { buildUpcomingAssignments, type UpcomingAssignment } from "./assignments.ts";

export interface UpcomingAssignmentCollections {
  midweekAssignments?: MidweekAssignmentCollection;
  midweekMeetingData?: MidweekMeetingDataCollection;
  weekendAssignments?: WeekendAssignmentCollection;
  speakerAssignments?: SpeakerAssignmentCollection;
  publishers?: PublisherCollection;
  cleanMajor?: CleaningAssignmentCollection;
  cleanMinor?: CleaningAssignmentCollection;
}

export interface UseUpcomingAssignmentsResult {
  assignments: UpcomingAssignment[];
  isLoading: boolean;
  error: Error | null;
  canRetry: boolean;
  retry: () => Promise<void>;
}

interface ResolvedCollections {
  midweekAssignments: MidweekAssignmentCollection | null;
  midweekMeetingData: MidweekMeetingDataCollection | null;
  weekendAssignments: WeekendAssignmentCollection | null;
  speakerAssignments: SpeakerAssignmentCollection | null;
  publishers: PublisherCollection | null;
  cleanMajor: CleaningAssignmentCollection | null;
  cleanMinor: CleaningAssignmentCollection | null;
  error: Error | null;
}

function toError(value: unknown): Error {
  if (value instanceof Error) {
    return value;
  }
  const message = (value as { message?: unknown } | null)?.message;
  return new Error(typeof message === "string" ? message : "Failed to load assignments");
}

function collectionError(collections: ResolvedCollections): Error | null {
  for (const collection of [
    collections.midweekAssignments,
    collections.midweekMeetingData,
    collections.weekendAssignments,
    collections.speakerAssignments,
    collections.publishers,
    collections.cleanMajor,
    collections.cleanMinor,
  ]) {
    if (collection?.utils.isError && collection.utils.lastError != null) {
      return toError(collection.utils.lastError);
    }
  }
  return null;
}

function resolveCollections(
  congregationId: string | null | undefined,
  injected?: UpcomingAssignmentCollections,
): ResolvedCollections {
  const resolved: ResolvedCollections = {
    midweekAssignments: injected?.midweekAssignments ?? null,
    midweekMeetingData: injected?.midweekMeetingData ?? null,
    weekendAssignments: injected?.weekendAssignments ?? null,
    speakerAssignments: injected?.speakerAssignments ?? null,
    publishers: injected?.publishers ?? null,
    cleanMajor: injected?.cleanMajor ?? null,
    cleanMinor: injected?.cleanMinor ?? null,
    error: null,
  };
  try {
    resolved.midweekMeetingData ??= getMidweekMeetingDataCollection();
    resolved.speakerAssignments ??= getSpeakerAssignmentCollection();
  } catch (err) {
    resolved.error = toError(err);
    return resolved;
  }
  if (!congregationId) {
    return resolved;
  }
  try {
    resolved.midweekAssignments ??= getMidweekAssignmentCollection(congregationId);
    resolved.weekendAssignments ??= getWeekendAssignmentCollection(congregationId);
    resolved.publishers ??= getPublisherCollection(congregationId);
    resolved.cleanMajor ??= getCleanMajorCollection(congregationId);
    resolved.cleanMinor ??= getCleanMinorCollection(congregationId);
  } catch (err) {
    resolved.error = toError(err);
  }
  return resolved;
}

function sameCollections(a: ResolvedCollections, b: ResolvedCollections): boolean {
  return (
    a.midweekAssignments === b.midweekAssignments &&
    a.midweekMeetingData === b.midweekMeetingData &&
    a.weekendAssignments === b.weekendAssignments &&
    a.speakerAssignments === b.speakerAssignments &&
    a.publishers === b.publishers &&
    a.cleanMajor === b.cleanMajor &&
    a.cleanMinor === b.cleanMinor &&
    a.error === b.error
  );
}

/**
 * The next assignments for the selected publisher, starting from the current
 * week: midweek meeting parts, weekend meeting roles and public talks.
 */
export function useUpcomingAssignments(
  congregationId: string | null | undefined,
  publisherId: string | null | undefined,
  injectedCollections?: UpcomingAssignmentCollections,
  now?: Date,
): UseUpcomingAssignmentsResult {
  const [collections, setCollections] = useState<ResolvedCollections>(() =>
    resolveCollections(congregationId, injectedCollections),
  );

  useEffect(() => {
    const next = resolveCollections(congregationId, injectedCollections);
    setCollections((prev) => (sameCollections(prev, next) ? prev : next));
  }, [congregationId, injectedCollections]);

  const weekStart = currentWeekId(now ?? new Date());
  const hasPublisher = Boolean(publisherId);

  const { data: midweekRows, isLoading: midweekLoading } = useLiveQuery({
    query: (q) =>
      collections.midweekAssignments && publisherId
        ? q
            .from({ a: collections.midweekAssignments })
            .where(({ a }) => and(eq(a.participant_id, publisherId), gte(a.week_id, weekStart)))
            .orderBy(({ a }) => a.week_id)
        : undefined,
  });

  const weekIds = useMemo(() => midweekRows?.map((row) => row.week_id) ?? [], [midweekRows]);

  const { data: meetingData, isLoading: meetingDataLoading } = useLiveQuery({
    query: (q) =>
      collections.midweekMeetingData && weekIds.length > 0
        ? q
            .from({ m: collections.midweekMeetingData })
            .where(({ m }) => inArray(m.week_id, weekIds))
        : undefined,
  });

  const { data: weekendRows, isLoading: weekendLoading } = useLiveQuery({
    query: (q) =>
      collections.weekendAssignments && publisherId
        ? q
            .from({ a: collections.weekendAssignments })
            .where(({ a }) => and(eq(a.participant_id, publisherId), gte(a.week_id, weekStart)))
            .orderBy(({ a }) => a.week_id)
        : undefined,
  });

  const { data: speakerRows, isLoading: speakerLoading } = useLiveQuery({
    query: (q) =>
      collections.speakerAssignments && publisherId
        ? q
            .from({ s: collections.speakerAssignments })
            .where(({ s }) => and(eq(s.speaker_id, publisherId), gte(s.week_id, weekStart)))
            .orderBy(({ s }) => s.week_id)
        : undefined,
  });

  const { data: publisherRows, isLoading: publisherLoading } = useLiveQuery({
    query: (q) =>
      collections.publishers && publisherId
        ? q.from({ p: collections.publishers }).where(({ p }) => eq(p.id, publisherId))
        : undefined,
  });

  // Cleaning assignments belong to the publisher's field service group, not
  // the publisher directly.
  const groupId = publisherRows?.[0]?.group_id ?? null;

  const { data: cleanMajorRows, isLoading: cleanMajorLoading } = useLiveQuery({
    query: (q) =>
      collections.cleanMajor && groupId
        ? q
            .from({ c: collections.cleanMajor })
            .where(({ c }) => and(eq(c.group_id, groupId), gte(c.week_id, weekStart)))
            .orderBy(({ c }) => c.week_id)
        : undefined,
  });

  const { data: cleanMinorRows, isLoading: cleanMinorLoading } = useLiveQuery({
    query: (q) =>
      collections.cleanMinor && groupId
        ? q
            .from({ c: collections.cleanMinor })
            .where(({ c }) => and(eq(c.group_id, groupId), gte(c.week_id, weekStart)))
            .orderBy(({ c }) => c.week_id)
        : undefined,
  });

  const assignments = useMemo(
    () =>
      buildUpcomingAssignments({
        midweek: midweekRows,
        midweekMeetingData: meetingData,
        weekend: weekendRows,
        speaker: speakerRows,
        cleanMajor: cleanMajorRows,
        cleanMinor: cleanMinorRows,
      }),
    [midweekRows, meetingData, weekendRows, speakerRows, cleanMajorRows, cleanMinorRows],
  );

  const isLoading =
    hasPublisher &&
    ((collections.midweekAssignments !== null && midweekLoading) ||
      (collections.midweekMeetingData !== null && weekIds.length > 0 && meetingDataLoading) ||
      (collections.weekendAssignments !== null && weekendLoading) ||
      (collections.speakerAssignments !== null && speakerLoading) ||
      (collections.publishers !== null && publisherLoading) ||
      (collections.cleanMajor !== null && groupId !== null && cleanMajorLoading) ||
      (collections.cleanMinor !== null && groupId !== null && cleanMinorLoading));

  const retry = useCallback(async () => {
    const next = resolveCollections(congregationId, injectedCollections);
    setCollections((prev) => (sameCollections(prev, next) ? prev : next));
    await Promise.all(
      [
        next.midweekAssignments,
        next.midweekMeetingData,
        next.weekendAssignments,
        next.speakerAssignments,
        next.publishers,
        next.cleanMajor,
        next.cleanMinor,
      ].map((collection) => Promise.resolve(collection?.utils.refetch?.({ throwOnError: false }))),
    );
  }, [congregationId, injectedCollections]);

  return {
    assignments,
    isLoading,
    error: collections.error ?? collectionError(collections),
    canRetry:
      collections.error !== null ||
      collections.midweekAssignments !== null ||
      collections.midweekMeetingData !== null ||
      collections.weekendAssignments !== null ||
      collections.speakerAssignments !== null ||
      collections.publishers !== null ||
      collections.cleanMajor !== null ||
      collections.cleanMinor !== null,
    retry,
  };
}

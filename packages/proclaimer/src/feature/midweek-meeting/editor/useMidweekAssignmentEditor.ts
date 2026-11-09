import { useCallback, useEffect, useMemo, useState } from "react";

import { eq, useLiveQuery } from "@tanstack/react-db";

import { getPublisherCollection, type PublisherCollection } from "../../publisher/collection.ts";
import type { Publisher } from "../../publisher/schema.ts";
import {
  getMidweekAssignmentCollection,
  getMidweekMeetingDataCollection,
  getMidweekParticipationCollection,
  midweekAssignmentKey,
  midweekParticipationKey,
  type MidweekAssignmentCollection,
  type MidweekMeetingDataCollection,
  type MidweekParticipationCollection,
} from "../collection.ts";
import { buildMeetingProgram } from "../program.ts";
import type {
  MidweekMeetingAssignment,
  MidweekMeetingAssignmentId,
  MidweekMeetingData,
  MidweekParticipation,
  MidweekParticipationId,
} from "../schema.ts";
import { midweekMeetingAssignmentIds } from "../schema.ts";
import type { MeetingSectionColor } from "../../meeting/types.ts";
import { assistantAssignmentIdFor, participationTypeMap } from "./assignments.ts";

export interface UseMidweekAssignmentEditorProps {
  weekId: string;
  assignmentId: string;
  congregationId?: string | null;
  /** Gate from usePermissions().hasMidweekMeetingOverseer — when false the
   *  returned write handlers are inert. */
  canEdit: boolean;
}

export interface AssignmentItemInfo {
  id: string;
  title: string;
  subtitle?: string;
  minutes?: number;
  color: MeetingSectionColor;
}

export interface UseMidweekAssignmentEditorResult {
  isLoading: boolean;
  error: Error | null;
  canRetry: boolean;
  retry: () => Promise<void>;
  item: AssignmentItemInfo;
  participationId: MidweekParticipationId;
  assignee?: Publisher;
  assigneeLabel: string;
  assistantId?: MidweekMeetingAssignmentId;
  assistantAssignee?: Publisher;
  assistantLabel: string;
  assistantParticipationId?: MidweekParticipationId;
  assignments: MidweekMeetingAssignment[];
  publishers: Publisher[];
  participations: MidweekParticipation[];
  /** participant_ids that already hold an assignment this week. */
  weekAssignmentIds: Set<string>;
  selectAssignee: (publisherId: string) => void;
  removeAssignee: () => void;
  selectAssistant: (publisherId: string) => void;
  removeAssistant: () => void;
  addParticipant: (publisherId: string, participationId: MidweekParticipationId) => void;
  removeParticipant: (publisherId: string, participationId: MidweekParticipationId) => void;
}

interface ResolvedCollections {
  meetingData: MidweekMeetingDataCollection | null;
  assignments: MidweekAssignmentCollection | null;
  publishers: PublisherCollection | null;
  participation: MidweekParticipationCollection | null;
  error: Error | null;
}

function toError(value: unknown): Error {
  if (value instanceof Error) {
    return value;
  }
  const message = (value as { message?: unknown } | null)?.message;
  return new Error(typeof message === "string" ? message : "Failed to load the assignment");
}

function collectionError(collections: ResolvedCollections): Error | null {
  for (const collection of [
    collections.meetingData,
    collections.assignments,
    collections.publishers,
    collections.participation,
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
    participation: null,
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
    resolved.participation = getMidweekParticipationCollection();
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
    a.participation === b.participation &&
    a.error === b.error
  );
}

function assigneeLabelFor(assignmentId: string): string {
  if (/^school_\d_(bible_reading|apply_\d)$/.test(assignmentId)) {
    return "Student";
  }
  if (assignmentId === "cbs_reader") {
    return "Reader";
  }
  if (assignmentId === "cbs_conductor") {
    return "Conductor";
  }
  return "Participant";
}

export function useMidweekAssignmentEditor({
  weekId,
  assignmentId,
  congregationId,
  canEdit,
}: UseMidweekAssignmentEditorProps): UseMidweekAssignmentEditorResult {
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
    query: (q) => (collections.assignments ? q.from({ a: collections.assignments }) : undefined),
  });

  const { data: publishers, isLoading: publishersLoading } = useLiveQuery({
    query: (q) => (collections.publishers ? q.from({ p: collections.publishers }) : undefined),
  });

  const { data: participations, isLoading: participationsLoading } = useLiveQuery({
    query: (q) =>
      collections.participation ? q.from({ p: collections.participation }) : undefined,
  });

  const meeting: MidweekMeetingData | undefined = meetingRows?.[0];
  const assignments = useMemo(() => assignmentRows ?? [], [assignmentRows]);
  const allPublishers = useMemo(() => publishers ?? [], [publishers]);

  const assignment = assignments.find(
    (a) => a.week_id === weekId && a.assignment_id === assignmentId,
  );

  const assistantId = assistantAssignmentIdFor(assignmentId);
  const assistantAssignment = assistantId
    ? assignments.find((a) => a.week_id === weekId && a.assignment_id === assistantId)
    : undefined;

  const item = useMemo<AssignmentItemInfo>(() => {
    const program = buildMeetingProgram({ weekId, meeting, assignments, publishers });
    for (const section of program.sections) {
      for (const block of section.blocks) {
        const found = block.items.find((programItem) => programItem.id === assignmentId);
        if (found) {
          return {
            id: found.id,
            title: found.title,
            subtitle: found.subtitle,
            minutes: found.minutes,
            color: section.color,
          };
        }
      }
    }
    return {
      id: assignmentId,
      title: assignmentId.replace(/_/g, " "),
      color: "medium",
    };
  }, [weekId, meeting, assignments, publishers, assignmentId]);

  const publisherById = useMemo(() => {
    const map = new Map<string, Publisher>();
    for (const publisher of allPublishers) {
      if (publisher.id) {
        map.set(publisher.id, publisher);
      }
    }
    return map;
  }, [allPublishers]);

  const assignee = assignment ? publisherById.get(assignment.participant_id) : undefined;
  const assistantAssignee = assistantAssignment
    ? publisherById.get(assistantAssignment.participant_id)
    : undefined;

  const weekAssignmentIds = useMemo(
    () => new Set(assignments.filter((a) => a.week_id === weekId).map((a) => a.participant_id)),
    [assignments, weekId],
  );

  const participationId =
    participationTypeMap[assignmentId as MidweekMeetingAssignmentId] ?? "prayer";
  const assistantParticipationId = assistantId ? participationTypeMap[assistantId] : undefined;

  const selectFor = useCallback(
    (targetId: string, publisherId: string) => {
      const collection = collections.assignments;
      if (
        !canEdit ||
        !collection ||
        !congregationId ||
        !midweekMeetingAssignmentIds.includes(targetId as MidweekMeetingAssignmentId)
      ) {
        return;
      }
      const key = midweekAssignmentKey(targetId, congregationId, weekId);
      const existing = collection.get(key);
      if (existing) {
        collection.update(key, (draft) => {
          draft.participant_id = publisherId;
        });
      } else {
        collection.insert({
          assignment_id: targetId as MidweekMeetingAssignmentId,
          congregation_id: congregationId,
          week_id: weekId,
          participant_id: publisherId,
        });
      }
    },
    [canEdit, collections.assignments, congregationId, weekId],
  );

  const removeFor = useCallback(
    (targetId: string) => {
      const collection = collections.assignments;
      if (
        !canEdit ||
        !collection ||
        !congregationId ||
        !midweekMeetingAssignmentIds.includes(targetId as MidweekMeetingAssignmentId)
      ) {
        return;
      }
      const key = midweekAssignmentKey(targetId, congregationId, weekId);
      if (collection.get(key)) {
        collection.delete(key);
      }
    },
    [canEdit, collections.assignments, congregationId, weekId],
  );

  const selectAssignee = useCallback(
    (publisherId: string) => selectFor(assignmentId, publisherId),
    [selectFor, assignmentId],
  );
  const removeAssignee = useCallback(() => removeFor(assignmentId), [removeFor, assignmentId]);
  const selectAssistant = useCallback(
    (publisherId: string) => {
      if (assistantId) {
        selectFor(assistantId, publisherId);
      }
    },
    [selectFor, assistantId],
  );
  const removeAssistant = useCallback(() => {
    if (assistantId) {
      removeFor(assistantId);
    }
  }, [removeFor, assistantId]);

  const addParticipant = useCallback(
    (publisherId: string, targetParticipationId: MidweekParticipationId) => {
      const collection = collections.participation;
      if (!canEdit || !collection) {
        return;
      }
      const key = midweekParticipationKey(publisherId, targetParticipationId);
      if (collection.get(key)) {
        collection.update(key, (draft) => {
          draft.is_participant = true;
        });
      } else {
        collection.insert({
          participant_id: publisherId,
          participation_id: targetParticipationId,
          is_participant: true,
        });
      }
    },
    [canEdit, collections.participation],
  );

  const removeParticipant = useCallback(
    (publisherId: string, targetParticipationId: MidweekParticipationId) => {
      const collection = collections.participation;
      if (!canEdit || !collection) {
        return;
      }
      const key = midweekParticipationKey(publisherId, targetParticipationId);
      if (collection.get(key)) {
        collection.update(key, (draft) => {
          draft.is_participant = false;
        });
      }
    },
    [canEdit, collections.participation],
  );

  const hasCongregation = Boolean(congregationId);
  const isLoading =
    (collections.meetingData !== null && meetingLoading) ||
    (hasCongregation &&
      ((collections.assignments !== null && assignmentsLoading) ||
        (collections.publishers !== null && publishersLoading) ||
        (collections.participation !== null && participationsLoading)));

  const retry = useCallback(async () => {
    const next = resolveCollections(congregationId);
    setCollections((prev) => (sameCollections(prev, next) ? prev : next));
    await Promise.all(
      [next.meetingData, next.assignments, next.publishers, next.participation].map((collection) =>
        Promise.resolve(collection?.utils.refetch?.({ throwOnError: false })),
      ),
    );
  }, [congregationId]);

  return {
    isLoading,
    error: collections.error ?? collectionError(collections),
    canRetry:
      collections.error !== null ||
      collections.meetingData !== null ||
      collections.assignments !== null,
    retry,
    item,
    participationId,
    assignee,
    assigneeLabel: assigneeLabelFor(assignmentId),
    assistantId,
    assistantAssignee,
    assistantLabel: assistantId === "cbs_reader" ? "Reader" : "Assistant",
    assistantParticipationId,
    assignments,
    publishers: allPublishers,
    participations: participations ?? [],
    weekAssignmentIds,
    selectAssignee,
    removeAssignee,
    selectAssistant,
    removeAssistant,
    addParticipant,
    removeParticipant,
  };
}

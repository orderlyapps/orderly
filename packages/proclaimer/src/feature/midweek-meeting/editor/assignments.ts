import type {
  MidweekMeetingAssignment,
  MidweekMeetingAssignmentId,
  MidweekParticipationId,
} from "../schema.ts";
import { midweekParticipationIds } from "../schema.ts";
import type { Publisher } from "../../publisher/schema.ts";
import { getPublisherDisplayName } from "../../publisher/schema.ts";
import { weeksBetween } from "../../../util/week.ts";

export const midweekParticipationTypeLabels: Record<MidweekParticipationId, string> = {
  chairman: "Chairman",
  prayer: "Prayer",
  treasures: "Treasures",
  gems: "Gems",
  bible_reading: "Bible Reading",
  apply: "Apply",
  talk: "Talk",
  assistant: "Assistant",
  counselor: "Counselor",
  living: "Living",
  cbs_conductor: "CBS Conductor",
  cbs_reader: "CBS Reader",
};

/** Which participation type qualifies a publisher for each assignment. */
export const participationTypeMap: Record<MidweekMeetingAssignmentId, MidweekParticipationId> = {
  prayer_1: "prayer",
  treasures: "treasures",
  gems: "gems",
  school_1_bible_reading: "bible_reading",
  school_1_apply_1: "apply",
  school_1_assistant_1: "assistant",
  school_1_apply_2: "apply",
  school_1_assistant_2: "assistant",
  school_1_apply_3: "apply",
  school_1_assistant_3: "assistant",
  school_1_apply_4: "apply",
  school_1_assistant_4: "assistant",
  chairman_1: "chairman",
  chairman_2: "counselor",
  school_2_bible_reading: "bible_reading",
  school_2_apply_1: "apply",
  school_2_assistant_1: "assistant",
  school_2_apply_2: "apply",
  school_2_assistant_2: "assistant",
  school_2_apply_3: "apply",
  school_2_assistant_3: "assistant",
  school_2_apply_4: "apply",
  school_2_assistant_4: "assistant",
  chairman_3: "counselor",
  school_3_bible_reading: "bible_reading",
  school_3_apply_1: "apply",
  school_3_assistant_1: "assistant",
  school_3_apply_2: "apply",
  school_3_assistant_2: "assistant",
  school_3_apply_3: "apply",
  school_3_assistant_3: "assistant",
  school_3_apply_4: "apply",
  school_3_assistant_4: "assistant",
  living_1: "living",
  living_2: "living",
  cbs_conductor: "cbs_conductor",
  cbs_reader: "cbs_reader",
  prayer_2: "prayer",
};

/** Inverse of participationTypeMap: every assignment id grouped by type. */
export const participationAssignmentIds: Record<
  MidweekParticipationId,
  MidweekMeetingAssignmentId[]
> = (() => {
  const result = {} as Record<MidweekParticipationId, MidweekMeetingAssignmentId[]>;
  for (const id of midweekParticipationIds) {
    result[id] = [];
  }
  for (const [assignmentId, type] of Object.entries(participationTypeMap) as [
    MidweekMeetingAssignmentId,
    MidweekParticipationId,
  ][]) {
    (result[type] ??= []).push(assignmentId);
  }
  return result;
})();

/** The paired assistant slot for parts that take an assistant or reader. */
export function assistantAssignmentIdFor(
  assignmentId: string,
): MidweekMeetingAssignmentId | undefined {
  const applyMatch = /^(school_\d)_apply_(\d)$/.exec(assignmentId);
  if (applyMatch) {
    return `${applyMatch[1]}_assistant_${applyMatch[2]}` as MidweekMeetingAssignmentId;
  }
  if (assignmentId === "cbs_conductor") {
    return "cbs_reader";
  }
  return undefined;
}

/** The paired student/conductor slot for an assistant or reader row. */
export function partnerAssignmentIdFor(
  assignmentId: string,
): { assignmentId: MidweekMeetingAssignmentId; preposition: "with" | "for" } | undefined {
  const applyMatch = /^(school_\d)_apply_(\d)$/.exec(assignmentId);
  if (applyMatch) {
    return {
      assignmentId: `${applyMatch[1]}_assistant_${applyMatch[2]}` as MidweekMeetingAssignmentId,
      preposition: "with",
    };
  }
  const assistantMatch = /^(school_\d)_assistant_(\d)$/.exec(assignmentId);
  if (assistantMatch) {
    return {
      assignmentId: `${assistantMatch[1]}_apply_${assistantMatch[2]}` as MidweekMeetingAssignmentId,
      preposition: "for",
    };
  }
  if (assignmentId === "cbs_conductor") {
    return { assignmentId: "cbs_reader", preposition: "with" };
  }
  if (assignmentId === "cbs_reader") {
    return { assignmentId: "cbs_conductor", preposition: "for" };
  }
  return undefined;
}

export type GenderFilter = "all" | "male" | "female";

export const genderFilteredTypes: MidweekParticipationId[] = ["apply", "assistant"];

export function usesGenderFilter(participationId: MidweekParticipationId): boolean {
  return genderFilteredTypes.includes(participationId);
}

export interface PublisherAssignmentStats {
  publisherId: string;
  /** Whole weeks between the current week and the publisher's nearest
   *  assignment (past or future) of the tracked participation types. */
  weeksAwayClosest: number | null;
}

/** Weeks-away stats per publisher for the given participation types. */
export function computeAssignmentStats(
  assignments: MidweekMeetingAssignment[],
  statTypes: MidweekParticipationId[],
  currentWeekId: string,
): Map<string, PublisherAssignmentStats> {
  const relevantIds = new Set<string>();
  for (const type of statTypes) {
    for (const id of participationAssignmentIds[type] ?? []) {
      relevantIds.add(id);
    }
  }

  const weekIdsByPublisher = new Map<string, string[]>();
  for (const assignment of assignments) {
    if (!relevantIds.has(assignment.assignment_id)) {
      continue;
    }
    const list = weekIdsByPublisher.get(assignment.participant_id) ?? [];
    list.push(assignment.week_id);
    weekIdsByPublisher.set(assignment.participant_id, list);
  }

  const stats = new Map<string, PublisherAssignmentStats>();
  for (const [publisherId, weekIds] of weekIdsByPublisher) {
    let weeksAwayClosest: number | null = null;
    for (const weekId of weekIds) {
      // An assignment in the current week doesn't count toward "weeks away".
      if (weekId === currentWeekId) {
        continue;
      }
      const weeksAway = Math.abs(weeksBetween(weekId, currentWeekId));
      if (weeksAwayClosest === null || weeksAway < weeksAwayClosest) {
        weeksAwayClosest = weeksAway;
      }
    }
    stats.set(publisherId, { publisherId, weeksAwayClosest });
  }
  return stats;
}

export function statLabelFor(
  publisherId: string | undefined,
  stats: Map<string, PublisherAssignmentStats>,
): string | undefined {
  if (!publisherId) {
    return undefined;
  }
  const weeksAway = stats.get(publisherId)?.weeksAwayClosest;
  return weeksAway != null ? `${weeksAway}w` : undefined;
}

/** participant_id → the participation ids that publisher is marked for. */
export function participationTypesByPublisher(
  participations: { participant_id: string; participation_id: string; is_participant: boolean }[],
): Map<string, Set<MidweekParticipationId>> {
  const byPublisher = new Map<string, Set<MidweekParticipationId>>();
  for (const participation of participations) {
    if (!participation.is_participant) {
      continue;
    }
    const set = byPublisher.get(participation.participant_id) ?? new Set<MidweekParticipationId>();
    set.add(participation.participation_id as MidweekParticipationId);
    byPublisher.set(participation.participant_id, set);
  }
  return byPublisher;
}

/** Publishers eligible for a participation type: not archived and flagged as
 *  a participant for that type. */
export function eligiblePublishers(
  publishers: Publisher[],
  participationTypes: Map<string, Set<MidweekParticipationId>>,
  participationId: MidweekParticipationId,
  gender: GenderFilter | null,
): Publisher[] {
  return publishers.filter((publisher) => {
    if (publisher.archived_at) {
      return false;
    }
    if (!publisher.id || !participationTypes.get(publisher.id)?.has(participationId)) {
      return false;
    }
    if (gender && gender !== "all" && publisher.gender !== gender) {
      return false;
    }
    return true;
  });
}

/** Longest time since the tracked assignment first, then alphabetically. */
export function sortPublishersByStats(
  publishers: Publisher[],
  stats: Map<string, PublisherAssignmentStats>,
): Publisher[] {
  return [...publishers].sort((a, b) => {
    const va = (a.id ? stats.get(a.id)?.weeksAwayClosest : null) ?? -1;
    const vb = (b.id ? stats.get(b.id)?.weeksAwayClosest : null) ?? -1;
    if (va === -1 && vb === -1) {
      return getPublisherDisplayName(a).localeCompare(getPublisherDisplayName(b));
    }
    if (va === -1) {
      return -1;
    }
    if (vb === -1) {
      return 1;
    }
    if (vb !== va) {
      return vb - va;
    }
    return getPublisherDisplayName(a).localeCompare(getPublisherDisplayName(b));
  });
}

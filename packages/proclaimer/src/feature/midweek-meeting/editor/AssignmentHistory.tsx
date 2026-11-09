import { IonItem, IonLabel, IonList, IonNote } from "@ionic/react";

import type { Publisher } from "../../publisher/schema.ts";
import { getPublisherDisplayName } from "../../publisher/schema.ts";
import type {
  MidweekMeetingAssignment,
  MidweekMeetingAssignmentId,
  MidweekParticipationId,
} from "../schema.ts";
import { weeksBetween } from "../../../util/week.ts";
import {
  midweekParticipationTypeLabels,
  participationTypeMap,
  partnerAssignmentIdFor,
} from "./assignments.ts";

export interface AssignmentHistoryProps {
  publisherId: string;
  weekId: string;
  assignments: MidweekMeetingAssignment[];
  publishers: Publisher[];
}

function assignmentTypeLabel(assignmentId: string): string {
  const type: MidweekParticipationId | undefined =
    participationTypeMap[assignmentId as MidweekMeetingAssignmentId];
  if (!type) {
    return assignmentId.replace(/_/g, " ");
  }
  return midweekParticipationTypeLabels[type] ?? type.replace(/_/g, " ");
}

export function AssignmentHistory({
  publisherId,
  weekId,
  assignments,
  publishers,
}: AssignmentHistoryProps) {
  const publisherAssignments = assignments.filter((a) => a.participant_id === publisherId);

  const past = publisherAssignments
    .filter((a) => a.week_id < weekId)
    .sort((a, b) => b.week_id.localeCompare(a.week_id))
    .slice(0, 5);

  const current = publisherAssignments.filter((a) => a.week_id === weekId);

  const future = publisherAssignments
    .filter((a) => a.week_id > weekId)
    .sort((a, b) => a.week_id.localeCompare(b.week_id));

  const rows = [...past.reverse(), ...current, ...future];
  if (rows.length === 0) {
    return null;
  }

  return (
    <IonList inset>
      {rows.map((row, index) => {
        const weeksAway = Math.abs(weeksBetween(weekId, row.week_id));
        const isCurrent = row.week_id === weekId;
        const isFuture = row.week_id > weekId;
        const weeksLabel = isCurrent
          ? "This week"
          : isFuture
            ? `In ${weeksAway}w`
            : `${weeksAway}w ago`;

        const partner = partnerAssignmentIdFor(row.assignment_id);
        let partnerName: string | null = null;
        if (partner) {
          const partnerRecord = assignments.find(
            (a) => a.week_id === row.week_id && a.assignment_id === partner.assignmentId,
          );
          const partnerPublisher = partnerRecord
            ? publishers.find((p) => p.id === partnerRecord.participant_id)
            : undefined;
          if (partnerPublisher) {
            partnerName = getPublisherDisplayName(partnerPublisher);
          }
        }

        return (
          <IonItem
            key={`${row.week_id}-${row.assignment_id}-${index}`}
            lines={index === rows.length - 1 ? "none" : "inset"}
          >
            <IonLabel color={isCurrent ? "primary" : isFuture ? "medium" : undefined}>
              {assignmentTypeLabel(row.assignment_id)}
              {partnerName && partner ? ` ${partner.preposition} ${partnerName}` : ""}
            </IonLabel>
            <IonNote slot="end" color={isCurrent ? "primary" : undefined}>
              {weeksLabel}
            </IonNote>
          </IonItem>
        );
      })}
    </IonList>
  );
}

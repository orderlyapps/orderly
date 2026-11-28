import { IonItem, IonLabel, IonList, IonNote } from "@ionic/react";

import { MonthHeader } from "../../../components/MonthHeader.tsx";

import type { Publisher } from "../../publisher/schema.ts";
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

function formatPartnerName(publisher: Publisher): string {
  const first = publisher.display_name?.trim() || publisher.first_name;
  return `${first} ${publisher.last_name}`.trim();
}

const sectionListStyle = { marginTop: 4, marginBottom: 0 } as const;

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
    .slice(0, 5)
    .reverse();

  const current = publisherAssignments.filter((a) => a.week_id === weekId);

  const future = publisherAssignments
    .filter((a) => a.week_id > weekId)
    .sort((a, b) => a.week_id.localeCompare(b.week_id));

  function assignmentText(row: MidweekMeetingAssignment): string {
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
        partnerName = formatPartnerName(partnerPublisher);
      }
    }

    return `${assignmentTypeLabel(row.assignment_id)}${
      partnerName && partner ? ` ${partner.preposition} ${partnerName}` : ""
    }`;
  }

  function renderAssignmentRow(row: MidweekMeetingAssignment, index: number, rowCount: number) {
    const weeksAway = Math.abs(weeksBetween(weekId, row.week_id));
    const isCurrent = row.week_id === weekId;
    const isFuture = row.week_id > weekId;

    return (
      <IonItem
        key={`${row.week_id}-${row.assignment_id}`}
        lines={index === rowCount - 1 ? "none" : "inset"}
      >
        <IonLabel color={isCurrent ? "primary" : isFuture ? "medium" : undefined}>
          {assignmentText(row)}
        </IonLabel>
        {!isCurrent && <IonNote slot="end">{weeksAway}w</IonNote>}
      </IonItem>
    );
  }

  return (
    <>
      {past.length > 0 && (
        <div>
          <MonthHeader label="Past" />
          <IonList inset style={sectionListStyle}>
            {past.map((row, index) => renderAssignmentRow(row, index, past.length))}
          </IonList>
        </div>
      )}

      <div>
        <MonthHeader label="This Week" />
        <IonList inset style={sectionListStyle}>
          {current.length === 0 ? (
            <IonItem lines="none">
              <IonLabel color="medium">—</IonLabel>
            </IonItem>
          ) : (
            current.map((row, index) => renderAssignmentRow(row, index, current.length))
          )}
        </IonList>
      </div>

      {future.length > 0 && (
        <div>
          <MonthHeader label="Future" />
          <IonList inset style={sectionListStyle}>
            {future.map((row, index) => renderAssignmentRow(row, index, future.length))}
          </IonList>
        </div>
      )}
    </>
  );
}

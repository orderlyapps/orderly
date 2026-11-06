import { IonItem, IonLabel, IonList } from "@ionic/react";

import { MonthHeader } from "../../components/MonthHeader.tsx";
import { groupAssignmentsByMonth } from "./assignments.ts";
import { AssignmentRow } from "./AssignmentRow.tsx";
import { useUpcomingAssignments, type UpcomingAssignmentCollections } from "./hooks.ts";

export interface AssignmentsViewProps {
  congregationId?: string | null;
  publisherId?: string | null;
  collections?: UpcomingAssignmentCollections;
  now?: Date;
}

export function AssignmentsView({
  congregationId,
  publisherId,
  collections,
  now,
}: AssignmentsViewProps) {
  const { assignments, isLoading } = useUpcomingAssignments(
    congregationId,
    publisherId,
    collections,
    now,
  );

  if (!publisherId || isLoading) {
    return null;
  }

  if (assignments.length === 0) {
    return (
      <IonList>
        <IonItem lines="none">
          <IonLabel>No upcoming assignments</IonLabel>
        </IonItem>
      </IonList>
    );
  }

  const groups = groupAssignmentsByMonth(assignments, now ?? new Date());

  return (
    <>
      {groups.map((group) => (
        <div key={group.label} style={{ paddingBottom: 16 }}>
          <MonthHeader label={group.label} />
          <IonList style={{ marginTop: 4 }}>
            {group.assignments.map((assignment, index) => (
              <AssignmentRow
                key={assignment.id}
                assignment={assignment}
                isLast={index === group.assignments.length - 1}
                now={now}
              />
            ))}
          </IonList>
        </div>
      ))}
    </>
  );
}

import { IonItem, IonLabel, IonList } from "@ionic/react";

import { relativeWeekLabel, weekRangeLabel } from "../../util/week.ts";
import { useUpcomingAssignments, type UpcomingAssignmentCollections } from "./hooks.ts";

export interface HomeAssignmentsProps {
  congregationId?: string | null;
  publisherId?: string | null;
  collections?: UpcomingAssignmentCollections;
  now?: Date;
}

function assignmentWeekLabel(weekId: string, now?: Date): string {
  const range = weekRangeLabel(weekId, { includeYear: false });
  const relative = relativeWeekLabel(weekId, now ?? new Date());
  return relative ? `${range} (${relative})` : range;
}

export function HomeAssignments({
  congregationId,
  publisherId,
  collections,
  now,
}: HomeAssignmentsProps) {
  const { assignments, isLoading } = useUpcomingAssignments(
    congregationId,
    publisherId,
    collections,
    now,
  );

  if (!publisherId || isLoading) {
    return null;
  }

  const upcoming = assignments.slice(0, 3);
  if (upcoming.length === 0) {
    return null;
  }

  return (
    <div style={{ paddingBottom: 16 }}>
      <IonItem lines="inset">
        <IonLabel>
          <span style={{ color: "var(--ion-color-primary)", fontSize: "1.125rem" }}>
            Assignments
          </span>
        </IonLabel>
      </IonItem>
      <IonList>
        {upcoming.map((assignment, index) => (
          <IonItem key={assignment.id} lines={index === upcoming.length - 1 ? "none" : "inset"}>
            <IonLabel>
              <p style={{ color: "var(--ion-text-color)", fontWeight: 600 }}>
                {assignmentWeekLabel(assignment.weekId, now)}
              </p>
              <h3>{assignment.label}</h3>
            </IonLabel>
          </IonItem>
        ))}
      </IonList>
    </div>
  );
}

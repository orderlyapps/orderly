import { IonItem, IonLabel } from "@ionic/react";

import { relativeWeekLabel, weekRangeLabel } from "../../util/week.ts";
import type { UpcomingAssignment } from "./assignments.ts";

export interface AssignmentRowProps {
  assignment: UpcomingAssignment;
  isLast?: boolean;
  now?: Date;
}

function assignmentWeekLabel(weekId: string, now?: Date): string {
  const range = weekRangeLabel(weekId, { includeYear: false });
  const relative = relativeWeekLabel(weekId, now ?? new Date());
  return relative ? `${range} (${relative})` : range;
}

export function AssignmentRow({ assignment, isLast, now }: AssignmentRowProps) {
  return (
    <IonItem lines={isLast ? "none" : "inset"}>
      <IonLabel>
        <p style={{ color: "var(--ion-text-color)", fontWeight: 600 }}>
          {assignmentWeekLabel(assignment.weekId, now)}
        </p>
        <h3>{assignment.label}</h3>
      </IonLabel>
    </IonItem>
  );
}

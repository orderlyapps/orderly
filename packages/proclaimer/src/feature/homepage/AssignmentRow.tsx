import { IonItem, IonLabel } from "@ionic/react";

import { weekDisplayLabel } from "../../util/week.ts";
import type { UpcomingAssignment } from "./assignments.ts";

export interface AssignmentRowProps {
  assignment: UpcomingAssignment;
  isLast?: boolean;
  now?: Date;
}

export function AssignmentRow({ assignment, isLast, now }: AssignmentRowProps) {
  return (
    <IonItem lines={isLast ? "none" : "inset"}>
      <IonLabel>
        <p style={{ color: "var(--ion-text-color)", fontWeight: 600 }}>
          {weekDisplayLabel(assignment.weekId, now)}
        </p>
        <h3>{assignment.label}</h3>
      </IonLabel>
    </IonItem>
  );
}

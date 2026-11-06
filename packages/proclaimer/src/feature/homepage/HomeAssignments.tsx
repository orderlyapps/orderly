import { IonItem, IonLabel, IonList } from "@ionic/react";

import { AssignmentRow } from "./AssignmentRow.tsx";
import { useUpcomingAssignments, type UpcomingAssignmentCollections } from "./hooks.ts";

export interface HomeAssignmentsProps {
  congregationId?: string | null;
  publisherId?: string | null;
  collections?: UpcomingAssignmentCollections;
  now?: Date;
  routerLink?: string;
}

export function HomeAssignments({
  congregationId,
  publisherId,
  collections,
  now,
  routerLink = "/home/assignments",
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

  const showSeeMore = assignments.length > upcoming.length;

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
          <AssignmentRow
            key={assignment.id}
            assignment={assignment}
            isLast={index === upcoming.length - 1 && !showSeeMore}
            now={now}
          />
        ))}
      </IonList>
      {showSeeMore && (
        <IonItem button detail routerLink={routerLink} lines="none">
          <IonLabel className="ion-text-end" color="primary" style={{ fontSize: "0.875rem" }}>
            See more
          </IonLabel>
        </IonItem>
      )}
    </div>
  );
}

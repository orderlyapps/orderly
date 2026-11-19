import {
  IonButton,
  IonButtons,
  IonContent,
  IonHeader,
  IonItem,
  IonLabel,
  IonList,
  IonListHeader,
  IonModal,
  IonNote,
  IonSkeletonText,
  IonTitle,
  IonToolbar,
} from "@ionic/react";

import { monthLabel } from "../../util/month.ts";
import { weekRangeLabel } from "../../util/week.ts";
import type { WeekendAttendanceWeek } from "./stats.ts";

export interface WeekendAttendanceModalProps {
  isOpen: boolean;
  isLoading: boolean;
  monthId: string;
  /** Weeks counted in the stat, oldest first (see `weekendAttendanceWeeks`). */
  weeks: WeekendAttendanceWeek[];
  /** Average across `weeks`, or null when empty. */
  average: number | null;
  onDismiss: () => void;
}

/** Lists the weeks counted in the "Average Weekend Meeting Attendance" stat. */
export function WeekendAttendanceModal({
  isOpen,
  isLoading,
  monthId,
  weeks,
  average,
  onDismiss,
}: WeekendAttendanceModalProps) {
  return (
    <IonModal isOpen={isOpen} onDidDismiss={onDismiss}>
      <IonHeader>
        <IonToolbar>
          <IonTitle>Weekend Meeting Attendance</IonTitle>
          <IonButtons slot="end">
            <IonButton onClick={onDismiss}>Close</IonButton>
          </IonButtons>
        </IonToolbar>
      </IonHeader>
      <IonContent>
        <IonList>
          <IonListHeader>
            <IonLabel>
              <IonNote>
                {isLoading || average == null
                  ? `Weeks starting in ${monthLabel(monthId)}`
                  : `Average of ${Math.round(average)} across ${weeks.length} ${
                      weeks.length === 1 ? "week" : "weeks"
                    }`}
              </IonNote>
            </IonLabel>
          </IonListHeader>
          {isLoading ? (
            [1, 2, 3].map((i) => (
              <IonItem key={i}>
                <IonLabel>
                  <IonSkeletonText style={{ width: "60%" }} />
                </IonLabel>
              </IonItem>
            ))
          ) : weeks.length === 0 ? (
            <IonItem lines="none">
              <IonLabel color="medium">No attendance recorded for this month.</IonLabel>
            </IonItem>
          ) : (
            weeks.map((week) => (
              <IonItem key={week.weekId}>
                <IonLabel>
                  <h3>{weekRangeLabel(week.weekId)}</h3>
                  {week.remote > 0 && (
                    <p>
                      {week.inPerson} in person · {week.remote} remote
                    </p>
                  )}
                </IonLabel>
                <IonNote slot="end">{week.attendance}</IonNote>
              </IonItem>
            ))
          )}
        </IonList>
      </IonContent>
    </IonModal>
  );
}

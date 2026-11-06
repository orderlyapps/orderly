import {
  IonButton,
  IonItem,
  IonLabel,
  IonList,
  IonNote,
  IonSkeletonText,
  IonText,
} from "@ionic/react";

import { MonthHeader } from "../../components/MonthHeader.tsx";
import { weekDisplayLabel } from "../../util/week.ts";
import { useCleaningSchedule } from "./hooks.ts";
import type { CleaningMonth, CleaningWeek } from "./schedule.ts";

export interface CleaningViewProps {
  congregationId?: string | null;
}

function AssignmentLine({ label, groupName }: { label: string; groupName: string | null }) {
  return (
    <div style={{ paddingTop: 2, fontSize: 13, color: "var(--ion-color-medium)" }}>
      {label}:{" "}
      <span style={{ color: groupName ? "var(--ion-color-dark)" : undefined }}>
        {groupName ?? "—"}
      </span>
    </div>
  );
}

function WeekRow({ week, isLast }: { week: CleaningWeek; isLast: boolean }) {
  return (
    <IonItem lines={isLast ? "none" : "inset"} style={{ "--min-height": "52px" }}>
      <IonLabel style={{ marginBlock: 8 }}>
        <p style={{ color: "var(--ion-text-color)", fontWeight: 600 }}>
          {weekDisplayLabel(week.weekId)}
        </p>
        <AssignmentLine label="Thorough clean" groupName={week.majorGroupName} />
        <AssignmentLine label="Light clean" groupName={week.minorGroupName} />
      </IonLabel>
    </IonItem>
  );
}

function MonthSection({ month }: { month: CleaningMonth }) {
  return (
    <div>
      <MonthHeader label={month.label} />
      <IonList inset lines="none" style={{ marginTop: 4 }}>
        {month.weeks.map((week, index) => (
          <WeekRow key={week.weekId} week={week} isLast={index === month.weeks.length - 1} />
        ))}
      </IonList>
    </div>
  );
}

function LoadingBody() {
  return (
    <IonList inset>
      {[0, 1, 2, 3].map((row) => (
        <IonItem key={row} lines={row === 3 ? "none" : "inset"}>
          <IonLabel>
            <IonSkeletonText animated style={{ width: "40%", height: 13 }} />
            <p>
              <IonSkeletonText animated style={{ width: "65%", height: 11 }} />
            </p>
          </IonLabel>
        </IonItem>
      ))}
    </IonList>
  );
}

export function CleaningView({ congregationId }: CleaningViewProps) {
  const { months, isLoading, error, canRetry, retry } = useCleaningSchedule(congregationId);

  if (error) {
    return (
      <div style={{ padding: "40px 24px", textAlign: "center" }}>
        <IonNote color="danger">{error.message}</IonNote>
        {canRetry && (
          <div>
            <IonButton fill="clear" size="small" onClick={() => void retry()}>
              Try Again
            </IonButton>
          </div>
        )}
      </div>
    );
  }

  if (isLoading) {
    return <LoadingBody />;
  }

  if (months.length === 0) {
    return (
      <div style={{ padding: "40px 24px", textAlign: "center" }}>
        <IonText color="medium">
          <p>No cleaning assignments scheduled.</p>
        </IonText>
      </div>
    );
  }

  return (
    <>
      {months.map((month) => (
        <MonthSection key={month.key} month={month} />
      ))}
    </>
  );
}

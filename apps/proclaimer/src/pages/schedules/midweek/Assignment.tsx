import {
  IonBackButton,
  IonButtons,
  IonContent,
  IonHeader,
  IonPage,
  IonSpinner,
  IonTitle,
  IonToolbar,
} from "@ionic/react";
import { Navigate, useParams } from "react-router-dom";
import {
  MidweekAssignmentEditor,
  midweekMeetingAssignmentIds,
  parseWeekId,
  usePermissions,
  useSettings,
  weekIdOf,
  weekRangeLabel,
} from "proclaimer-core";

const ASSIGNMENT_IDS: ReadonlySet<string> = new Set(midweekMeetingAssignmentIds);

const Assignment = () => {
  const { settings, isLoading: settingsLoading } = useSettings();
  const { weekId, assignmentId } = useParams<{ weekId: string; assignmentId: string }>();
  const congregationId = settings.congregationId || undefined;
  const permissions = usePermissions(congregationId);

  // Meeting data is keyed by Monday, so normalize any valid date to its week id.
  const parsedWeekId = weekId ? parseWeekId(weekId) : null;
  const normalizedWeekId = parsedWeekId ? weekIdOf(parsedWeekId) : null;
  const validParams =
    normalizedWeekId && assignmentId && ASSIGNMENT_IDS.has(assignmentId)
      ? { weekId: normalizedWeekId, assignmentId }
      : null;

  if (!validParams) {
    return <Navigate to="/schedules/midweek" replace />;
  }

  if (settingsLoading || !permissions.isLoaded) {
    return (
      <IonPage>
        <IonHeader>
          <IonToolbar>
            <IonButtons slot="start">
              <IonBackButton defaultHref={`/schedules/midweek/${validParams.weekId}`} />
            </IonButtons>
            <IonTitle>{weekRangeLabel(validParams.weekId, { includeYear: false })}</IonTitle>
          </IonToolbar>
        </IonHeader>
        <IonContent>
          <div
            style={{
              display: "flex",
              justifyContent: "center",
              paddingTop: 64,
            }}
          >
            <IonSpinner name="crescent" />
          </div>
        </IonContent>
      </IonPage>
    );
  }

  if (!permissions.hasMidweekMeetingOverseer) {
    return <Navigate to={`/schedules/midweek/${validParams.weekId}`} replace />;
  }

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonButtons slot="start">
            <IonBackButton defaultHref={`/schedules/midweek/${validParams.weekId}`} />
          </IonButtons>
          <IonTitle>{weekRangeLabel(validParams.weekId, { includeYear: false })}</IonTitle>
        </IonToolbar>
      </IonHeader>
      <IonContent>
        <MidweekAssignmentEditor
          weekId={validParams.weekId}
          assignmentId={validParams.assignmentId}
          congregationId={congregationId}
          canEdit={permissions.hasMidweekMeetingOverseer}
        />
        <div style={{ paddingBottom: 96 }} />
      </IonContent>
    </IonPage>
  );
};

export default Assignment;

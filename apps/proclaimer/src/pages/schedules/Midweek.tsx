import {
  IonBackButton,
  IonButtons,
  IonContent,
  IonHeader,
  IonPage,
  IonTitle,
  IonToolbar,
} from "@ionic/react";
import { useState } from "react";
import { useParams } from "react-router-dom";
import {
  currentWeekId,
  MidweekMeetingView,
  parseWeekId,
  usePermissions,
  useSettings,
  weekIdOf,
} from "proclaimer-core";

const Midweek = () => {
  const { settings } = useSettings();
  const permissions = usePermissions(settings.congregationId || undefined);
  const { weekId: weekIdParam } = useParams<{ weekId?: string }>();
  // Meeting data is keyed by Monday, so normalize any valid date to its week id.
  const parsedWeekId = weekIdParam ? parseWeekId(weekIdParam) : null;
  // IonRouterOutlet remounts parameterized routes when the param changes, so
  // the week lives in state and the URL is synced silently — otherwise the
  // week slide transition would be destroyed on every navigation.
  const [weekId, setWeekId] = useState(() =>
    parsedWeekId ? weekIdOf(parsedWeekId) : currentWeekId(),
  );

  const selectWeek = (nextWeekId: string) => {
    setWeekId(nextWeekId);
    window.history.replaceState(null, "", `/schedules/midweek/${nextWeekId}`);
  };

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonButtons slot="start">
            <IonBackButton defaultHref="/schedules" />
          </IonButtons>
          <IonTitle>Midweek Meeting</IonTitle>
        </IonToolbar>
      </IonHeader>
      <IonContent>
        <MidweekMeetingView
          weekId={weekId}
          congregationId={settings.congregationId || undefined}
          onSelectWeek={selectWeek}
          canEditAssignments={permissions.hasMidweekMeetingOverseer}
          assignmentBasePath="/schedules/midweek"
        />
        <div style={{ paddingBottom: 96 }} />
      </IonContent>
    </IonPage>
  );
};

export default Midweek;

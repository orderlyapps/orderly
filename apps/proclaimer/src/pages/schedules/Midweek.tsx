import {
  IonBackButton,
  IonButtons,
  IonContent,
  IonHeader,
  IonPage,
  IonTitle,
  IonToolbar,
} from "@ionic/react";
import { useNavigate, useParams } from "react-router-dom";
import {
  currentWeekId,
  MidweekMeetingView,
  parseWeekId,
  useSettings,
  weekIdOf,
} from "proclaimer-core";

const Midweek = () => {
  const { settings } = useSettings();
  const navigate = useNavigate();
  const { weekId } = useParams<{ weekId?: string }>();
  // Meeting data is keyed by Monday, so normalize any valid date to its week id.
  const parsedWeekId = weekId ? parseWeekId(weekId) : null;
  const resolvedWeekId = parsedWeekId ? weekIdOf(parsedWeekId) : currentWeekId();

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
          weekId={resolvedWeekId}
          congregationId={settings.congregationId || undefined}
          onSelectWeek={(nextWeekId) =>
            navigate(`/schedules/midweek/${nextWeekId}`, { replace: true })
          }
        />
        <div style={{ paddingBottom: 96 }} />
      </IonContent>
    </IonPage>
  );
};

export default Midweek;

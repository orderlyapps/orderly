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
  parseWeekId,
  useSettings,
  weekIdOf,
  WeekendMeetingView,
} from "proclaimer-core";

const Weekend = () => {
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
          <IonTitle>Weekend Meeting</IonTitle>
        </IonToolbar>
      </IonHeader>
      <IonContent>
        <WeekendMeetingView
          weekId={resolvedWeekId}
          congregationId={settings.congregationId || undefined}
          onSelectWeek={(nextWeekId) =>
            navigate(`/schedules/weekend/${nextWeekId}`, { replace: true })
          }
        />
        <div style={{ paddingBottom: 48 }} />
      </IonContent>
    </IonPage>
  );
};

export default Weekend;

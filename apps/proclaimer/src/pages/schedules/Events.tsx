import {
  IonBackButton,
  IonButtons,
  IonContent,
  IonHeader,
  IonPage,
  IonTitle,
  IonToolbar,
} from "@ionic/react";
import { EventsView, useSettings } from "proclaimer-core";

const Events = () => {
  const { settings } = useSettings();

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonButtons slot="start">
            <IonBackButton defaultHref="/schedules" />
          </IonButtons>
          <IonTitle>Events</IonTitle>
        </IonToolbar>
      </IonHeader>
      <IonContent fullscreen>
        <IonHeader collapse="condense">
          <IonToolbar>
            <IonTitle size="large">Events</IonTitle>
          </IonToolbar>
        </IonHeader>
        <EventsView congregationId={settings.congregationId || undefined} />
      </IonContent>
    </IonPage>
  );
};

export default Events;

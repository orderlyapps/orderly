import {
  IonBackButton,
  IonButtons,
  IonContent,
  IonHeader,
  IonPage,
  IonTitle,
  IonToolbar,
} from "@ionic/react";
import { CleaningView, useSettings } from "proclaimer-core";

const Cleaning = () => {
  const { settings } = useSettings();

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonButtons slot="start">
            <IonBackButton defaultHref="/schedules" />
          </IonButtons>
          <IonTitle>Cleaning</IonTitle>
        </IonToolbar>
      </IonHeader>
      <IonContent>
        <IonHeader collapse="condense">
          <IonToolbar>
            <IonTitle size="large">Cleaning</IonTitle>
          </IonToolbar>
        </IonHeader>
        <CleaningView congregationId={settings.congregationId || undefined} />
      </IonContent>
    </IonPage>
  );
};

export default Cleaning;

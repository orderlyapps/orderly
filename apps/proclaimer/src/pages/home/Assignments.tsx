import {
  IonBackButton,
  IonButtons,
  IonContent,
  IonHeader,
  IonPage,
  IonTitle,
  IonToolbar,
} from "@ionic/react";
import { AssignmentsView, useSettings } from "proclaimer-core";

const Assignments = () => {
  const { settings } = useSettings();

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonButtons slot="start">
            <IonBackButton defaultHref="/home" />
          </IonButtons>
          <IonTitle>Assignments</IonTitle>
        </IonToolbar>
      </IonHeader>
      <IonContent>
        <IonHeader collapse="condense">
          <IonToolbar>
            <IonTitle size="large">Assignments</IonTitle>
          </IonToolbar>
        </IonHeader>
        <AssignmentsView
          congregationId={settings.congregationId || undefined}
          publisherId={settings.publisherId || undefined}
        />
      </IonContent>
    </IonPage>
  );
};

export default Assignments;

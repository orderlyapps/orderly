import { IonContent, IonHeader, IonPage, IonTitle, IonToolbar } from "@ionic/react";
import { PublishersView, useSettings } from "proclaimer-core";

const Publishers = () => {
  const { settings } = useSettings();

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonTitle>Publishers</IonTitle>
        </IonToolbar>
      </IonHeader>
      <IonContent fullscreen>
        <IonHeader collapse="condense">
          <IonToolbar>
            <IonTitle size="large">Publishers</IonTitle>
          </IonToolbar>
        </IonHeader>
        <PublishersView congregationId={settings.congregationId || undefined} />
      </IonContent>
    </IonPage>
  );
};

export default Publishers;

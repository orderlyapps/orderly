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
        <div className="ion-padding-top" />
        <PublishersView congregationId={settings.congregationId || undefined} />
        <div style={{ paddingBottom: 48 }} />
      </IonContent>
    </IonPage>
  );
};

export default Publishers;

import {
  IonBackButton,
  IonButtons,
  IonContent,
  IonHeader,
  IonPage,
  IonTitle,
  IonToolbar,
} from "@ionic/react";
import { DataSettingsView } from "subbie-core";

const Data = () => {
  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonButtons slot="start">
            <IonBackButton defaultHref="/settings" text="" />
          </IonButtons>
          <IonTitle>Backup &amp; Restore</IonTitle>
        </IonToolbar>
      </IonHeader>
      <IonContent fullscreen>
        <IonHeader collapse="condense">
          <IonToolbar>
            <IonTitle size="large">Backup &amp; Restore</IonTitle>
          </IonToolbar>
        </IonHeader>
        <DataSettingsView />
      </IonContent>
    </IonPage>
  );
};

export default Data;

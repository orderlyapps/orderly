import { IonContent, IonHeader, IonPage, IonTitle, IonToolbar } from "@ionic/react";
import { SettingsView } from "proclaimer-core";

const Settings = () => {
  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonTitle>Settings</IonTitle>
        </IonToolbar>
      </IonHeader>
      <IonContent fullscreen>
        <IonHeader collapse="condense">
          <IonToolbar>
            <IonTitle size="large">Settings</IonTitle>
          </IonToolbar>
        </IonHeader>
        <SettingsView />
      </IonContent>
    </IonPage>
  );
};

export default Settings;

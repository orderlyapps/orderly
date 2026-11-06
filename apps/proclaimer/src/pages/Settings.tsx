import { IonContent, IonHeader, IonPage, IonTitle, IonToolbar } from "@ionic/react";
import { SettingsView } from "proclaimer-core";

import { version } from "../../package.json";

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
        <div className="ion-padding-top" />
        <SettingsView version={version} />
        <div style={{ paddingBottom: 48 }} />
      </IonContent>
    </IonPage>
  );
};

export default Settings;

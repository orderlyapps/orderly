import { IonContent, IonHeader, IonPage, IonTitle, IonToolbar } from "@ionic/react";
import { SettingsView } from "ionic-core";

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
        <SettingsView version={version} />
      </IonContent>
    </IonPage>
  );
};

export default Settings;

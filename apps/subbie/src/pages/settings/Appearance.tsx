import {
  IonBackButton,
  IonButtons,
  IonContent,
  IonHeader,
  IonPage,
  IonTitle,
  IonToolbar,
} from "@ionic/react";
import { AppearanceSettingsView } from "subbie-core";

const Appearance = () => {
  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonButtons slot="start">
            <IonBackButton defaultHref="/settings" text="" />
          </IonButtons>
          <IonTitle>Appearance</IonTitle>
        </IonToolbar>
      </IonHeader>
      <IonContent fullscreen>
        <IonHeader collapse="condense">
          <IonToolbar>
            <IonTitle size="large">Appearance</IonTitle>
          </IonToolbar>
        </IonHeader>
        <AppearanceSettingsView />
      </IonContent>
    </IonPage>
  );
};

export default Appearance;

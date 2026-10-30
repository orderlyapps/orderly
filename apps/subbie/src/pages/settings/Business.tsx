import {
  IonBackButton,
  IonButtons,
  IonContent,
  IonHeader,
  IonPage,
  IonTitle,
  IonToolbar,
} from "@ionic/react";
import { BusinessSettingsView } from "subbie-core";

const Business = () => {
  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonButtons slot="start">
            <IonBackButton defaultHref="/settings" text="" />
          </IonButtons>
          <IonTitle>Business Details</IonTitle>
        </IonToolbar>
      </IonHeader>
      <IonContent fullscreen>
        <IonHeader collapse="condense">
          <IonToolbar>
            <IonTitle size="large">Business Details</IonTitle>
          </IonToolbar>
        </IonHeader>
        <BusinessSettingsView />
      </IonContent>
    </IonPage>
  );
};

export default Business;

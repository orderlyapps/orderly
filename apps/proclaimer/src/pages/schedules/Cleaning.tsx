import {
  IonBackButton,
  IonButtons,
  IonContent,
  IonHeader,
  IonPage,
  IonTitle,
  IonToolbar,
} from "@ionic/react";

import ExploreContainer from "../../components/ExploreContainer";

const Cleaning = () => {
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
      <IonContent fullscreen>
        <IonHeader collapse="condense">
          <IonToolbar>
            <IonTitle size="large">Cleaning</IonTitle>
          </IonToolbar>
        </IonHeader>
        <ExploreContainer name="Cleaning page" />
      </IonContent>
    </IonPage>
  );
};

export default Cleaning;

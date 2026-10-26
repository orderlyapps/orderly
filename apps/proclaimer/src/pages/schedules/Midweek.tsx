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

const Midweek = () => {
  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonButtons slot="start">
            <IonBackButton defaultHref="/schedules" />
          </IonButtons>
          <IonTitle>Midweek</IonTitle>
        </IonToolbar>
      </IonHeader>
      <IonContent fullscreen>
        <IonHeader collapse="condense">
          <IonToolbar>
            <IonTitle size="large">Midweek</IonTitle>
          </IonToolbar>
        </IonHeader>
        <ExploreContainer name="Midweek page" />
      </IonContent>
    </IonPage>
  );
};

export default Midweek;

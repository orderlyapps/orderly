import { IonContent, IonHeader, IonPage, IonTitle, IonToolbar } from "@ionic/react";

import ExploreContainer from "../components/ExploreContainer";

const Schedules = () => {
  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonTitle>Schedules</IonTitle>
        </IonToolbar>
      </IonHeader>
      <IonContent fullscreen>
        <IonHeader collapse="condense">
          <IonToolbar>
            <IonTitle size="large">Schedules</IonTitle>
          </IonToolbar>
        </IonHeader>
        <ExploreContainer name="Schedules page" />
      </IonContent>
    </IonPage>
  );
};

export default Schedules;

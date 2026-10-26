import { IonContent, IonHeader, IonPage, IonTitle, IonToolbar } from "@ionic/react";

import ExploreContainer from "../components/ExploreContainer";

const Publishers = () => {
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
        <ExploreContainer name="Publishers page" />
      </IonContent>
    </IonPage>
  );
};

export default Publishers;

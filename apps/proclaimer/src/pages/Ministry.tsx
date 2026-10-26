import { IonContent, IonHeader, IonPage, IonTitle, IonToolbar } from "@ionic/react";

import ExploreContainer from "../components/ExploreContainer";

const Ministry = () => {
  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonTitle>Ministry</IonTitle>
        </IonToolbar>
      </IonHeader>
      <IonContent fullscreen>
        <IonHeader collapse="condense">
          <IonToolbar>
            <IonTitle size="large">Ministry</IonTitle>
          </IonToolbar>
        </IonHeader>
        <ExploreContainer name="Ministry page" />
      </IonContent>
    </IonPage>
  );
};

export default Ministry;

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

const LetterWriting = () => {
  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonButtons slot="start">
            <IonBackButton defaultHref="/ministry" />
          </IonButtons>
          <IonTitle>Letter Writing</IonTitle>
        </IonToolbar>
      </IonHeader>
      <IonContent fullscreen>
        <IonHeader collapse="condense">
          <IonToolbar>
            <IonTitle size="large">Letter Writing</IonTitle>
          </IonToolbar>
        </IonHeader>
        <ExploreContainer name="Letter Writing page" />
      </IonContent>
    </IonPage>
  );
};

export default LetterWriting;

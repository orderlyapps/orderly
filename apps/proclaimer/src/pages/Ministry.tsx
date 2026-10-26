import {
  IonContent,
  IonHeader,
  IonItem,
  IonLabel,
  IonList,
  IonPage,
  IonTitle,
  IonToolbar,
} from "@ionic/react";

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
        <IonList>
          <IonItem routerLink="/ministry/map" detail>
            <IonLabel>Map</IonLabel>
          </IonItem>
          <IonItem routerLink="/ministry/letter-writing" detail>
            <IonLabel>Letter Writing</IonLabel>
          </IonItem>
          <IonItem routerLink="/ministry/schedule" detail>
            <IonLabel>Schedule</IonLabel>
          </IonItem>
        </IonList>
      </IonContent>
    </IonPage>
  );
};

export default Ministry;

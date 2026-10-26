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
        <IonList>
          <IonItem routerLink="/schedules/midweek" detail>
            <IonLabel>Midweek</IonLabel>
          </IonItem>
          <IonItem routerLink="/schedules/weekend" detail>
            <IonLabel>Weekend</IonLabel>
          </IonItem>
          <IonItem routerLink="/schedules/cleaning" detail>
            <IonLabel>Cleaning</IonLabel>
          </IonItem>
          <IonItem routerLink="/schedules/events" detail>
            <IonLabel>Events</IonLabel>
          </IonItem>
        </IonList>
      </IonContent>
    </IonPage>
  );
};

export default Schedules;

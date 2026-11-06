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
        <div className="ion-padding-top" />
        <IonList>
          <IonItem routerLink="/ministry/map" detail>
            <IonLabel style={{ color: "var(--ion-color-primary)", fontSize: "1.125rem" }}>
              Map
            </IonLabel>
          </IonItem>
          <IonItem routerLink="/ministry/letter-writing" detail>
            <IonLabel style={{ color: "var(--ion-color-primary)", fontSize: "1.125rem" }}>
              Letter Writing
            </IonLabel>
          </IonItem>
          <IonItem routerLink="/ministry/schedule" detail>
            <IonLabel style={{ color: "var(--ion-color-primary)", fontSize: "1.125rem" }}>
              Schedule
            </IonLabel>
          </IonItem>
        </IonList>
        <div style={{ paddingBottom: 48 }} />
      </IonContent>
    </IonPage>
  );
};

export default Ministry;

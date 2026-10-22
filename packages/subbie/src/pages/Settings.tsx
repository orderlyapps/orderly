import {
  IonContent,
  IonHeader,
  IonItem,
  IonItemGroup,
  IonLabel,
  IonList,
  IonListHeader,
  IonNote,
  IonPage,
  IonTitle,
  IonToggle,
  IonToolbar,
} from "@ionic/react";

export const Settings = () => {
  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonTitle>Settings</IonTitle>
        </IonToolbar>
      </IonHeader>
      <IonContent fullscreen>
        <IonHeader collapse="condense">
          <IonToolbar>
            <IonTitle size="large">Settings</IonTitle>
          </IonToolbar>
        </IonHeader>
        <IonList inset>
          <IonItemGroup>
            <IonListHeader>
              <IonLabel>Preferences</IonLabel>
            </IonListHeader>
            <IonItem>
              <IonToggle>Notifications</IonToggle>
            </IonItem>
            <IonItem>
              <IonToggle>Dark Mode</IonToggle>
            </IonItem>
          </IonItemGroup>
          <IonItemGroup>
            <IonListHeader>
              <IonLabel>Business</IonLabel>
            </IonListHeader>
            <IonItem button detail>
              <IonLabel>Company Profile</IonLabel>
            </IonItem>
            <IonItem button detail>
              <IonLabel>Payment Methods</IonLabel>
            </IonItem>
            <IonItem button detail>
              <IonLabel>Tax Rates</IonLabel>
              <IonNote slot="end">0%</IonNote>
            </IonItem>
          </IonItemGroup>
        </IonList>
      </IonContent>
    </IonPage>
  );
};

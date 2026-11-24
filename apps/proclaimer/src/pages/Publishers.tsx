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
import { PublishersView, usePermissions, useSettings } from "proclaimer-core";

const Publishers = () => {
  const { settings } = useSettings();
  const permissions = usePermissions(settings.congregationId || undefined);
  const canViewAllPublishers = permissions.hasElder || permissions.isSuperAdmin;

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
        <div className="ion-padding-top" />
        {permissions.isLoaded && canViewAllPublishers && (
          <IonList>
            <IonItem routerLink="/publishers/all" detail lines="inset">
              <IonLabel
                style={{ color: "var(--ion-color-primary)", fontSize: "1.125rem" }}
                className="ion-padding-vertical"
              >
                All Publishers
              </IonLabel>
            </IonItem>
          </IonList>
        )}
        <PublishersView congregationId={settings.congregationId || undefined} />
        <div style={{ paddingBottom: 48 }} />
      </IonContent>
    </IonPage>
  );
};

export default Publishers;

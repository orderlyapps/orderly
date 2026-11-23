import {
  IonBackButton,
  IonButtons,
  IonContent,
  IonHeader,
  IonItem,
  IonLabel,
  IonList,
  IonPage,
  IonSpinner,
  IonTitle,
  IonToolbar,
} from "@ionic/react";
import { Navigate } from "react-router-dom";
import { usePermissions, useSettings } from "proclaimer-core";

const Secretary = () => {
  const { settings, isLoading: settingsLoading } = useSettings();
  const permissions = usePermissions(settings.congregationId || undefined);
  const canUseSecretary = permissions.hasSecretary || permissions.isSuperAdmin;
  const isLoading = settingsLoading || !permissions.isLoaded;

  if (!isLoading && !canUseSecretary) {
    return <Navigate to="/home" replace />;
  }

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonButtons slot="start">
            <IonBackButton defaultHref="/home" />
          </IonButtons>
          <IonTitle>Secretary</IonTitle>
        </IonToolbar>
      </IonHeader>
      <IonContent fullscreen>
        <IonHeader collapse="condense">
          <IonToolbar>
            <IonTitle size="large">Secretary</IonTitle>
          </IonToolbar>
        </IonHeader>
        {isLoading ? (
          <div style={{ display: "flex", justifyContent: "center", paddingTop: 64 }}>
            <IonSpinner name="crescent" />
          </div>
        ) : (
          <>
            <div className="ion-padding-top" />
            <IonList>
              <IonItem routerLink="/secretary/branch-report" detail>
                <IonLabel
                  style={{ color: "var(--ion-color-primary)", fontSize: "1.125rem" }}
                  className="ion-padding-vertical"
                >
                  Branch Report
                </IonLabel>
              </IonItem>
              <IonItem routerLink="/secretary/emergency-contacts" detail>
                <IonLabel
                  style={{ color: "var(--ion-color-primary)", fontSize: "1.125rem" }}
                  className="ion-padding-vertical"
                >
                  Emergency Contacts
                </IonLabel>
              </IonItem>
            </IonList>
          </>
        )}
        <div style={{ paddingBottom: 48 }} />
      </IonContent>
    </IonPage>
  );
};

export default Secretary;

import {
  IonBackButton,
  IonButtons,
  IonContent,
  IonHeader,
  IonPage,
  IonSpinner,
  IonTitle,
  IonToolbar,
} from "@ionic/react";
import { Navigate } from "react-router-dom";
import { MissingContactsView, usePermissions, useSettings } from "proclaimer-core";

const EmergencyContacts = () => {
  const { settings, isLoading: settingsLoading } = useSettings();
  const congregationId = settings.congregationId || undefined;
  const permissions = usePermissions(congregationId);
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
            <IonBackButton defaultHref="/secretary" />
          </IonButtons>
          <IonTitle>Emergency Contacts</IonTitle>
        </IonToolbar>
      </IonHeader>
      <IonContent fullscreen>
        <IonHeader collapse="condense">
          <IonToolbar>
            <IonTitle size="large">Emergency Contacts</IonTitle>
          </IonToolbar>
        </IonHeader>
        {isLoading ? (
          <div style={{ display: "flex", justifyContent: "center", paddingTop: 64 }}>
            <IonSpinner name="crescent" />
          </div>
        ) : (
          <MissingContactsView congregationId={congregationId} />
        )}
        <div style={{ paddingBottom: 48 }} />
      </IonContent>
    </IonPage>
  );
};

export default EmergencyContacts;

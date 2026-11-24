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
import { PublisherDirectoryView, usePermissions, useSettings } from "proclaimer-core";

const AllPublishers = () => {
  const { settings, isLoading: settingsLoading } = useSettings();
  const congregationId = settings.congregationId || undefined;
  const permissions = usePermissions(congregationId);
  const canViewAllPublishers = permissions.hasElder || permissions.isSuperAdmin;
  const isLoading = settingsLoading || !permissions.isLoaded;

  if (!isLoading && !canViewAllPublishers) {
    return <Navigate to="/publishers" replace />;
  }

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonButtons slot="start">
            <IonBackButton defaultHref="/publishers" />
          </IonButtons>
          <IonTitle>All Publishers</IonTitle>
        </IonToolbar>
      </IonHeader>
      <IonContent fullscreen>
        <IonHeader collapse="condense">
          <IonToolbar>
            <IonTitle size="large">All Publishers</IonTitle>
          </IonToolbar>
        </IonHeader>
        {isLoading ? (
          <div style={{ display: "flex", justifyContent: "center", paddingTop: 64 }}>
            <IonSpinner name="crescent" />
          </div>
        ) : (
          <PublisherDirectoryView
            congregationId={congregationId}
            includeRestricted={permissions.hasSecretary || permissions.isSuperAdmin}
          />
        )}
        <div style={{ paddingBottom: 48 }} />
      </IonContent>
    </IonPage>
  );
};

export default AllPublishers;

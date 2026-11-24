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
import { Navigate, useParams } from "react-router-dom";
import {
  getPublisherDisplayName,
  PublisherDetailView,
  usePermissions,
  usePublishers,
  useSettings,
} from "proclaimer-core";

const PublisherDetail = () => {
  const { settings, isLoading: settingsLoading } = useSettings();
  const congregationId = settings.congregationId || undefined;
  const permissions = usePermissions(congregationId);
  const { publisherId } = useParams<{ publisherId?: string }>();
  const { publishers } = usePublishers(congregationId);
  const publisher = publishers.find((p) => p.id === publisherId);
  const canViewDirectory = permissions.hasElder || permissions.isSuperAdmin;
  const isLoading = settingsLoading || !permissions.isLoaded;

  if (!isLoading && !canViewDirectory) {
    return <Navigate to="/publishers" replace />;
  }

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonButtons slot="start">
            <IonBackButton defaultHref="/publishers/directory" />
          </IonButtons>
          <IonTitle>{publisher ? getPublisherDisplayName(publisher) : "Publisher"}</IonTitle>
        </IonToolbar>
      </IonHeader>
      <IonContent fullscreen>
        {isLoading ? (
          <div style={{ display: "flex", justifyContent: "center", paddingTop: 64 }}>
            <IonSpinner name="crescent" />
          </div>
        ) : (
          <PublisherDetailView publisherId={publisherId} congregationId={congregationId} />
        )}
        <div style={{ paddingBottom: 48 }} />
      </IonContent>
    </IonPage>
  );
};

export default PublisherDetail;

import { useState } from "react";

import {
  IonBackButton,
  IonButton,
  IonButtons,
  IonContent,
  IonHeader,
  IonIcon,
  IonPage,
  IonSpinner,
  IonTitle,
  IonToolbar,
} from "@ionic/react";
import { createOutline } from "ionicons/icons";
import { Navigate, useParams } from "react-router-dom";
import {
  getPublisherDisplayName,
  isPublisherRowId,
  isRestrictedDirectoryEntry,
  PublisherDetailView,
  PublisherNameModal,
  usePermissions,
  usePublishers,
  useSettings,
  type PublisherNameInput,
} from "proclaimer-core";

const PublisherDetail = () => {
  const { settings, isLoading: settingsLoading } = useSettings();
  const congregationId = settings.congregationId || undefined;
  const permissions = usePermissions(congregationId);
  const { publisherId } = useParams<{ publisherId?: string }>();
  const {
    publishers,
    isLoading: publishersLoading,
    collection: publishersCollection,
  } = usePublishers(congregationId);
  const publisher = publishers.find((p) => p.id === publisherId);
  const [isNameModalOpen, setIsNameModalOpen] = useState(false);
  const canViewAllPublishers = permissions.hasElder || permissions.isSuperAdmin;
  const canViewRestricted = permissions.hasSecretary || permissions.isSuperAdmin;
  const canEditPublisher = permissions.hasSecretary || permissions.isSuperAdmin;
  const isLoading = settingsLoading || !permissions.isLoaded;

  if (!isLoading && !canViewAllPublishers) {
    return <Navigate to="/publishers" replace />;
  }
  if (
    permissions.isLoaded &&
    !publishersLoading &&
    publisher &&
    isRestrictedDirectoryEntry(publisher) &&
    !canViewRestricted
  ) {
    return <Navigate to="/publishers/all" replace />;
  }

  const saveName = async (input: PublisherNameInput) => {
    const id = publisher?.id;
    if (!publishersCollection || !isPublisherRowId(id)) {
      return;
    }
    const tx = publishersCollection.update(id, (draft) => {
      draft.first_name = input.first_name;
      draft.last_name = input.last_name;
      draft.middle_name = input.middle_name || null;
      draft.display_name = input.display_name || null;
    });
    await tx.isPersisted.promise;
  };

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonButtons slot="start">
            <IonBackButton defaultHref="/publishers/all" />
          </IonButtons>
          <IonTitle>{publisher ? getPublisherDisplayName(publisher) : "Publisher"}</IonTitle>
          {canEditPublisher && publisher && (
            <IonButtons slot="end">
              <IonButton aria-label="Edit name" onClick={() => setIsNameModalOpen(true)}>
                <IonIcon slot="icon-only" icon={createOutline} />
              </IonButton>
            </IonButtons>
          )}
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
        <PublisherNameModal
          isOpen={isNameModalOpen}
          publisher={publisher ?? null}
          onSave={saveName}
          onDismiss={() => {
            setIsNameModalOpen(false);
          }}
        />
        <div style={{ paddingBottom: 48 }} />
      </IonContent>
    </IonPage>
  );
};

export default PublisherDetail;

import { useMemo, useState } from "react";

import {
  IonAccordion,
  IonAccordionGroup,
  IonButton,
  IonButtons,
  IonContent,
  IonHeader,
  IonIcon,
  IonItem,
  IonLabel,
  IonList,
  IonModal,
  IonNote,
  IonSpinner,
  IonTitle,
  IonToolbar,
  useIonAlert,
} from "@ionic/react";
import { addCircleOutline, checkmark } from "ionicons/icons";

import {
  familyHeadOptions,
  isPublisherRowId,
  PublisherSelect,
  usePublishers,
  type PublisherCollection,
} from "../publisher/index.ts";
import { AddContactDetailModal } from "./AddContactDetailModal.tsx";
import { getPublisherLocalCollection, type PublisherLocalCollection } from "./collection.ts";
import { addContactDetail, type ContactDetailInput } from "./edit.ts";
import { usePublisherLocalRecords } from "./hooks.ts";
import {
  buildMissingContactItems,
  type MissingContactField,
  type MissingContactItem,
} from "./missing.ts";

export interface MissingContactsViewProps {
  congregationId?: string | null;
  collection?: PublisherLocalCollection;
  publisherCollection?: PublisherCollection;
}

export function MissingContactsView({
  congregationId,
  collection,
  publisherCollection,
}: MissingContactsViewProps) {
  const [openId, setOpenId] = useState<string | undefined>(undefined);
  const [editing, setEditing] = useState<{
    item: MissingContactItem;
    field: MissingContactField;
  } | null>(null);
  const [familyHeadPublisherId, setFamilyHeadPublisherId] = useState<string | null>(null);
  const [presentAlert] = useIonAlert();
  const localCollection = collection ?? getPublisherLocalCollection();
  const {
    records,
    isLoading: recordsLoading,
    isError: recordsError,
  } = usePublisherLocalRecords(localCollection);
  const {
    publishers,
    isLoading: publishersLoading,
    error: publishersError,
    canRetry,
    retry,
    collection: publishersCollection,
  } = usePublishers(congregationId, publisherCollection);

  const items = useMemo(
    () => buildMissingContactItems({ publishers, records }),
    [publishers, records],
  );

  const familyHeadPublisher = publishers.find((p) => p.id === familyHeadPublisherId);
  const familyHeadCandidates = familyHeadPublisher
    ? familyHeadOptions(familyHeadPublisher, publishers)
    : [];

  async function handleSave(input: ContactDetailInput) {
    if (!editing) return;
    await addContactDetail(localCollection, editing.item.publisher_id, editing.field.key, input);
  }

  async function saveFamilyHead(headId: string | null) {
    const id = familyHeadPublisherId;
    if (!publishersCollection || !isPublisherRowId(id)) {
      return;
    }
    try {
      const tx = publishersCollection.update(id, (draft) => {
        draft.family_id = headId;
      });
      await tx.isPersisted.promise;
    } catch {
      void presentAlert({
        header: "Save Failed",
        message: "The family head could not be updated.",
        buttons: ["OK"],
      });
    }
  }

  if (publishersError) {
    return (
      <div style={{ padding: "40px 24px", textAlign: "center" }}>
        <IonNote color="danger">{publishersError.message}</IonNote>
        {canRetry && (
          <div>
            <IonButton fill="clear" size="small" onClick={() => void retry()}>
              Try Again
            </IonButton>
          </div>
        )}
      </div>
    );
  }

  if (recordsError) {
    return (
      <div style={{ padding: "40px 24px", textAlign: "center" }}>
        <IonNote color="danger" style={{ display: "block" }}>
          Publisher data on this device could not be loaded. Reload the app and try again.
        </IonNote>
      </div>
    );
  }

  if (recordsLoading || publishersLoading) {
    return (
      <div
        className="ion-padding"
        style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}
      >
        <IonSpinner name="crescent" />
        <IonNote color="medium">Loading publisher details…</IonNote>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="ion-padding" style={{ textAlign: "center" }}>
        <IonNote color="medium" style={{ display: "block" }}>
          All publishers have complete details.
        </IonNote>
      </div>
    );
  }

  return (
    <div className="ion-padding">
      <IonNote style={{ display: "block", marginBottom: "0.5rem", textAlign: "center" }}>
        {items.length} publisher{items.length !== 1 ? "s" : ""}{" "}
        {items.length !== 1 ? "have" : "has"} missing details:
      </IonNote>
      <IonAccordionGroup
        onIonChange={(e) => {
          const value = e.detail.value;
          setOpenId(typeof value === "string" ? value : undefined);
        }}
      >
        {items.map((item) => (
          <IonAccordion key={item.publisher_id} value={item.publisher_id}>
            <IonItem slot="header">
              <IonLabel className="ion-text-wrap">
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                  }}
                >
                  <span
                    style={
                      item.publisher_id === openId
                        ? { fontWeight: "bold", fontSize: "1.1rem" }
                        : undefined
                    }
                  >
                    {item.publisher_name}
                  </span>
                  <IonNote style={{ marginInlineEnd: 8 }}>{item.missing.length} missing</IonNote>
                </div>
              </IonLabel>
            </IonItem>
            <div slot="content" style={{ paddingBottom: "2.5rem" }}>
              <IonList>
                {item.missing.map((field) => (
                  <IonItem
                    key={field.key}
                    lines="none"
                    button
                    detail={false}
                    onClick={() =>
                      field.key === "family_head"
                        ? setFamilyHeadPublisherId(item.publisher_id)
                        : setEditing({ item, field })
                    }
                  >
                    <IonLabel className="ion-text-wrap" style={{ margin: "0.375rem 0" }}>
                      {field.label}
                    </IonLabel>
                    <IonIcon slot="end" icon={addCircleOutline} color="primary" />
                  </IonItem>
                ))}
              </IonList>
            </div>
          </IonAccordion>
        ))}
      </IonAccordionGroup>
      <AddContactDetailModal
        isOpen={editing !== null}
        field={editing?.field ?? null}
        publisherName={editing?.item.publisher_name}
        onSave={handleSave}
        onDismiss={() => setEditing(null)}
      />
      <IonModal
        isOpen={familyHeadPublisherId !== null}
        onDidDismiss={() => {
          setFamilyHeadPublisherId(null);
        }}
      >
        <IonHeader>
          <IonToolbar>
            <IonTitle>Family Head</IonTitle>
            <IonButtons slot="end">
              <IonButton
                onClick={() => {
                  setFamilyHeadPublisherId(null);
                }}
              >
                Close
              </IonButton>
            </IonButtons>
          </IonToolbar>
        </IonHeader>
        <IonContent>
          <PublisherSelect
            publishers={familyHeadCandidates}
            selectedId={familyHeadPublisher?.family_id ?? undefined}
            onSelect={(id) => {
              void saveFamilyHead(id);
              setFamilyHeadPublisherId(null);
            }}
          >
            <IonItem
              button
              detail={false}
              onClick={() => {
                void saveFamilyHead(null);
                setFamilyHeadPublisherId(null);
              }}
            >
              <IonLabel>No family</IonLabel>
              {!familyHeadPublisher?.family_id ? (
                <IonIcon icon={checkmark} slot="end" color="primary" />
              ) : null}
            </IonItem>
          </PublisherSelect>
        </IonContent>
      </IonModal>
    </div>
  );
}

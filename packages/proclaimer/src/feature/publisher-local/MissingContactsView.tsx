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
  IonSelect,
  IonSelectOption,
  IonSpinner,
  IonTitle,
  IonToggle,
  IonToolbar,
  useIonActionSheet,
  useIonAlert,
} from "@ionic/react";
import { addCircleOutline, checkmark, createOutline } from "ionicons/icons";

import {
  familyHeadOptions,
  isPublisherRowId,
  publisherTypeOptions,
  PublisherSelect,
  usePublishers,
  type PublisherCollection,
} from "../publisher/index.ts";
import { useSettings } from "../settings/hooks.ts";
import { AddContactDetailModal } from "./ContactDetailModal.tsx";
import { getPublisherLocalCollection, type PublisherLocalCollection } from "./collection.ts";
import {
  addContactDetail,
  updateContactDetail,
  type ContactDetailInput,
  type ContactDetailItem,
} from "./edit.ts";
import { usePublisherLocalRecords } from "./hooks.ts";
import {
  buildMissingContactItems,
  FAMILY_HEAD_FIELD,
  MISSING_CONTACT_FIELDS,
  type MissingContactField,
  type MissingContactItem,
} from "./missing.ts";
import type {
  PublisherLocal,
  PublisherLocalAddress,
  PublisherLocalEmail,
  PublisherLocalEmergencyContact,
  PublisherLocalPhone,
} from "./schema.ts";

const TYPE_FILTER_OPTIONS = publisherTypeOptions();

function contactDetailsFor(
  record: PublisherLocal | undefined,
  key: MissingContactField["key"],
): ContactDetailItem[] {
  const details = record?.[key];
  return Array.isArray(details) ? (details as ContactDetailItem[]) : [];
}

function contactDetailText(
  field: MissingContactField,
  detail: ContactDetailItem,
  index: number,
): string {
  switch (field.key) {
    case "phone": {
      const phone = detail as PublisherLocalPhone;
      return phone.label ? `${phone.label} — ${phone.number}` : phone.number;
    }
    case "email": {
      const email = detail as PublisherLocalEmail;
      return email.label ? `${email.label} — ${email.address}` : email.address;
    }
    case "address": {
      const address = detail as PublisherLocalAddress;
      const parts = [address.unit_number, address.house_number, address.street, address.suburb]
        .filter(Boolean)
        .join(" ");
      return address.label ? `${address.label} — ${parts}` : parts || `Address ${index + 1}`;
    }
    case "emergency_contact": {
      const contact = detail as PublisherLocalEmergencyContact;
      const name = `${contact.first_name} ${contact.last_name}`.trim();
      return contact.relationship ? `${name} — ${contact.relationship}` : name;
    }
  }
}

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
    detail: ContactDetailItem | null;
  } | null>(null);
  const [familyHeadPublisherId, setFamilyHeadPublisherId] = useState<string | null>(null);
  const [showMissingOnly, setShowMissingOnly] = useState(false);
  const [presentAlert] = useIonAlert();
  const [presentActionSheet] = useIonActionSheet();
  const { settings, setSetting } = useSettings();
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

  const visibleTypes = settings.emergencyContactsVisibleTypes;
  const showArchived = settings.emergencyContactsShowArchived;
  const recordsByPublisherId = useMemo(
    () => new Map(records.map((record) => [record.publisher_id, record])),
    [records],
  );
  const items = useMemo(
    () =>
      buildMissingContactItems({
        publishers,
        records,
        visibleTypes,
        showArchived,
        includeComplete: !showMissingOnly,
      }),
    [publishers, records, visibleTypes, showArchived, showMissingOnly],
  );

  const familyHeadPublisher = publishers.find((p) => p.id === familyHeadPublisherId);
  const familyHeadCandidates = familyHeadPublisher
    ? familyHeadOptions(familyHeadPublisher, publishers)
    : [];

  function openContactField(item: MissingContactItem, field: MissingContactField) {
    const details = contactDetailsFor(recordsByPublisherId.get(item.publisher_id), field.key);
    if (details.length === 0) {
      setEditing({ item, field, detail: null });
      return;
    }
    if (details.length === 1) {
      setEditing({ item, field, detail: details[0] ?? null });
      return;
    }
    void presentActionSheet({
      header: `Select ${field.label}`,
      buttons: [
        ...details.map((detail, index) => ({
          text: contactDetailText(field, detail, index),
          handler: () => {
            setEditing({ item, field, detail });
          },
        })),
        {
          text: `Add new ${field.label}`,
          handler: () => {
            setEditing({ item, field, detail: null });
          },
        },
        { text: "Cancel", role: "cancel" },
      ],
    });
  }

  async function handleSave(input: ContactDetailInput) {
    if (!editing) return;
    if (editing.detail) {
      await updateContactDetail(
        localCollection,
        editing.item.publisher_id,
        editing.field.key,
        editing.detail.id,
        input,
      );
      return;
    }
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

  const visibleMissingCount = items.filter((item) => item.missing.length > 0).length;

  const filterControl = (
    <>
      <IonItem>
        <IonToggle
          checked={showMissingOnly}
          onIonChange={(event) => {
            setShowMissingOnly(event.detail.checked);
          }}
        >
          Only show missing details
        </IonToggle>
      </IonItem>
      <IonItem>
        <IonSelect
          label="Publisher types shown"
          labelPlacement="stacked"
          interface="alert"
          multiple
          value={visibleTypes}
          onIonChange={(event) => {
            const value = event.detail.value;
            const nextVisibleTypes = Array.isArray(value) ? value : [];
            void setSetting("emergencyContactsVisibleTypes", nextVisibleTypes).catch(
              (error: unknown) => {
                console.warn("Failed to persist emergency contacts type filter", error);
              },
            );
          }}
        >
          {TYPE_FILTER_OPTIONS.map((option) => (
            <IonSelectOption key={option.value} value={option.value}>
              {option.label}
            </IonSelectOption>
          ))}
        </IonSelect>
      </IonItem>
      <IonItem>
        <IonToggle
          checked={showArchived}
          onIonChange={(event) => {
            void setSetting("emergencyContactsShowArchived", event.detail.checked).catch(
              (error: unknown) => {
                console.warn("Failed to persist emergency contacts archived filter", error);
              },
            );
          }}
        >
          Show archived publishers only
        </IonToggle>
      </IonItem>
    </>
  );

  if (items.length === 0) {
    const emptyMessage = showMissingOnly
      ? "No publishers with missing details match the selected filters."
      : showArchived
        ? "No archived publishers match the selected filters."
        : "No publishers match the selected filters.";
    return (
      <div className="ion-padding" style={{ textAlign: "center" }}>
        <IonList>{filterControl}</IonList>
        <IonNote color="medium" style={{ display: "block" }}>
          {emptyMessage}
        </IonNote>
      </div>
    );
  }

  return (
    <div className="ion-padding">
      <IonList>{filterControl}</IonList>
      <IonNote style={{ display: "block", marginBottom: "0.5rem", textAlign: "center" }}>
        {showMissingOnly
          ? `${items.length} publisher${items.length !== 1 ? "s" : ""} ${
              items.length !== 1 ? "have" : "has"
            } missing details:`
          : `${items.length} publisher${
              items.length !== 1 ? "s" : ""
            } shown; ${visibleMissingCount} ${
              visibleMissingCount !== 1 ? "have" : "has"
            } missing details:`}
      </IonNote>
      <IonAccordionGroup
        onIonChange={(e) => {
          const value = e.detail.value;
          setOpenId(typeof value === "string" ? value : undefined);
        }}
      >
        {items.map((item) => {
          const fields = showMissingOnly
            ? item.missing
            : [...MISSING_CONTACT_FIELDS, FAMILY_HEAD_FIELD];
          return (
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
                  {fields.map((field) => {
                    const details =
                      field.key === "family_head"
                        ? []
                        : contactDetailsFor(recordsByPublisherId.get(item.publisher_id), field.key);
                    return (
                      <IonItem
                        key={field.key}
                        lines="none"
                        button
                        detail={false}
                        onClick={() => {
                          if (field.key === "family_head") {
                            setFamilyHeadPublisherId(item.publisher_id);
                          } else {
                            openContactField(item, field);
                          }
                        }}
                      >
                        <IonLabel className="ion-text-wrap" style={{ margin: "0.375rem 0" }}>
                          {field.label}
                        </IonLabel>
                        <IonIcon
                          slot="end"
                          icon={details.length > 0 ? createOutline : addCircleOutline}
                          color="primary"
                        />
                      </IonItem>
                    );
                  })}
                </IonList>
              </div>
            </IonAccordion>
          );
        })}
      </IonAccordionGroup>
      <AddContactDetailModal
        isOpen={editing !== null}
        field={editing?.field ?? null}
        initial={editing?.detail ?? null}
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

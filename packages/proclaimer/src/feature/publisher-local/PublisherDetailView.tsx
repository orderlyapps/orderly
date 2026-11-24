import { Fragment, useRef, useState } from "react";
import {
  IonAvatar,
  IonButton,
  IonButtons,
  IonContent,
  IonDatetime,
  IonHeader,
  IonIcon,
  IonItem,
  IonLabel,
  IonList,
  IonModal,
  IonNote,
  IonSpinner,
  IonTitle,
  IonToast,
  IonToolbar,
  useIonAlert,
} from "@ionic/react";
import {
  callOutline,
  chatbubbleOutline,
  checkmark,
  copyOutline,
  createOutline,
  mailOutline,
  navigateOutline,
} from "ionicons/icons";

import { SectionHeader } from "../meeting/index.ts";
import { usePermissions } from "../permission/index.ts";
import {
  familyHeadLabel,
  familyHeadOptions,
  getPublisherDisplayName,
  isArchived,
  isPublisherRowId,
  isRemoved,
  PublisherSelect,
  publisherStandingLabel,
  publisherStandingOptions,
  publisherTypeLabel,
  publisherTypeOptions,
  usePublishers,
  type Publisher,
  type PublisherCollection,
} from "../publisher/index.ts";
import { formatAddressDisplay, type NameLookup } from "./address.ts";
import {
  getPublisherLocalCollection,
  type PublisherLocalCollection,
  type StreetCollection,
  type SuburbCollection,
} from "./collection.ts";
import { AddContactDetailModal, type ContactDetailField } from "./ContactDetailModal.tsx";
import {
  updateContactDetail,
  updatePublisherLocalDate,
  type ContactDetailInput,
  type ContactDetailItem,
} from "./edit.ts";
import { usePublisherLocalRecords, useTerritoryNames } from "./hooks.ts";
import { formatDate } from "./preview.ts";
import type { PublisherLocalAddress } from "./schema.ts";

export interface PublisherDetailViewProps {
  publisherId?: string;
  congregationId?: string | null;
  collection?: PublisherCollection;
  localCollection?: PublisherLocalCollection;
  suburbCollection?: SuburbCollection;
  streetCollection?: StreetCollection;
}

function DetailItem({
  label,
  value,
  onEdit,
}: {
  label: string;
  value: string;
  onEdit?: () => void;
}) {
  return (
    <IonItem lines="inset">
      <IonLabel className="ion-text-wrap">
        <p>{label}</p>
        <h3>{value}</h3>
      </IonLabel>
      {onEdit && (
        <IonButton
          slot="end"
          fill="clear"
          size="small"
          aria-label={`Edit ${label}`}
          onClick={onEdit}
        >
          <IonIcon slot="icon-only" icon={createOutline} />
        </IonButton>
      )}
    </IonItem>
  );
}

interface ContactAction {
  text: string;
  icon: string;
  handler: () => void;
}

function ContactItem({
  label,
  value,
  actions,
  onEdit,
}: {
  label: string;
  value: string;
  actions: ContactAction[];
  onEdit?: () => void;
}) {
  // With existing action icons the edit pencil sits next to them; a detail
  // with no actions gets it at the end of the item instead of a row below.
  const buttons: ContactAction[] =
    onEdit && actions.length > 0
      ? [...actions, { text: "Edit", icon: createOutline, handler: onEdit }]
      : actions;
  return (
    <IonItem lines="inset">
      <IonLabel className="ion-text-wrap">
        <p>{label}</p>
        <h3>{value}</h3>
        {buttons.length > 0 && (
          <div
            style={{
              display: "flex",
              justifyContent: "flex-end",
              gap: 16,
              marginTop: 4,
              marginRight: -12,
            }}
          >
            {buttons.map((action) => (
              <IonButton
                key={action.text}
                fill="clear"
                size="small"
                aria-label={action.text}
                onClick={action.handler}
              >
                <IonIcon slot="icon-only" icon={action.icon} />
              </IonButton>
            ))}
          </div>
        )}
      </IonLabel>
      {onEdit && actions.length === 0 && (
        <IonButton
          slot="end"
          fill="clear"
          size="small"
          aria-label={`Edit ${label}`}
          onClick={onEdit}
        >
          <IonIcon slot="icon-only" icon={createOutline} />
        </IonButton>
      )}
    </IonItem>
  );
}

const openUri = (uri: string) => {
  window.location.href = uri;
};

const openExternalUrl = (url: string) => {
  window.open(url, "_blank", "noopener,noreferrer");
};

const copyToClipboard = (value: string) => {
  void navigator.clipboard?.writeText(value);
};

function phoneActions(number: string, copy: (value: string) => void): ContactAction[] {
  const sanitized = number.replace(/[^\d+*#]/g, "");
  const buttons: ContactAction[] = [];
  if (sanitized.length > 0) {
    buttons.push(
      { text: "Call", icon: callOutline, handler: () => openUri(`tel:${sanitized}`) },
      { text: "Message", icon: chatbubbleOutline, handler: () => openUri(`sms:${sanitized}`) },
    );
  }
  buttons.push({ text: "Copy Number", icon: copyOutline, handler: () => copy(number) });
  return buttons;
}

function emailActions(address: string, copy: (value: string) => void): ContactAction[] {
  return [
    {
      text: "Email",
      icon: mailOutline,
      handler: () => openUri(`mailto:${encodeURIComponent(address)}`),
    },
    { text: "Copy Address", icon: copyOutline, handler: () => copy(address) },
  ];
}

function addressActions(
  address: PublisherLocalAddress,
  formatted: string,
  copy: (value: string) => void,
): ContactAction[] {
  const buttons: ContactAction[] = [];
  const coordinates = address.coordinates;
  const destination =
    coordinates && coordinates.length >= 2
      ? `${coordinates[1]},${coordinates[0]}`
      : formatted === "-"
        ? ""
        : formatted;
  if (destination) {
    buttons.push({
      text: "Navigate",
      icon: navigateOutline,
      handler: () =>
        openExternalUrl(
          `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(destination)}`,
        ),
    });
  }
  if (formatted !== "-") {
    buttons.push({
      text: "Copy Address",
      icon: copyOutline,
      handler: () => copy(formatted),
    });
  }
  return buttons;
}

function formatAddress(
  address: PublisherLocalAddress,
  suburbs: NameLookup[],
  streets: NameLookup[],
): string {
  const formatted = formatAddressDisplay(address, suburbs, streets);
  return formatted === "-" && (address.coordinates?.length ?? 0) >= 2
    ? `${address.coordinates?.[1]}, ${address.coordinates?.[0]}`
    : formatted;
}

function genderLabel(publisher: Publisher): string | null {
  if (publisher.gender === "male") {
    return "Male";
  }
  if (publisher.gender === "female") {
    return "Female";
  }
  return null;
}

const GENDER_OPTIONS = [
  { value: "male", label: "Male" },
  { value: "female", label: "Female" },
];

interface DetailOption {
  value: string | null;
  label: string;
}

type DetailEditTarget =
  | {
      kind: "contact";
      field: ContactDetailField;
      item: ContactDetailItem;
      /** Emergency contact id when editing a detail nested inside one. */
      parentId?: string;
    }
  | {
      kind: "option";
      field: "standing" | "type" | "gender";
      title: string;
      options: DetailOption[];
      selected: string | null;
    }
  | {
      kind: "date";
      field: "birth_date" | "baptism_date";
      title: string;
      value: string | null;
    };

function DetailOptionModal({
  isOpen,
  title,
  options,
  selected,
  onSelect,
  onDismiss,
}: {
  isOpen: boolean;
  title: string;
  options: DetailOption[];
  selected: string | null;
  onSelect: (value: string | null) => void;
  onDismiss: () => void;
}) {
  return (
    <IonModal isOpen={isOpen} onDidDismiss={onDismiss}>
      <IonHeader>
        <IonToolbar>
          <IonTitle>{title}</IonTitle>
          <IonButtons slot="end">
            <IonButton onClick={onDismiss}>Close</IonButton>
          </IonButtons>
        </IonToolbar>
      </IonHeader>
      <IonContent>
        <IonList>
          {options.map((option) => (
            <IonItem
              key={option.value ?? "none"}
              button
              detail={false}
              onClick={() => onSelect(option.value)}
            >
              <IonLabel>{option.label}</IonLabel>
              {selected === option.value && <IonIcon icon={checkmark} slot="end" color="primary" />}
            </IonItem>
          ))}
        </IonList>
      </IonContent>
    </IonModal>
  );
}

function DetailDateModal({
  isOpen,
  title,
  value,
  onSelect,
  onClear,
  onDismiss,
}: {
  isOpen: boolean;
  title: string;
  value: string | null;
  onSelect: (date: string) => void;
  onClear: () => void;
  onDismiss: () => void;
}) {
  const datetimeValue = value && /^\d{4}-\d{2}-\d{2}/.test(value) ? value.slice(0, 10) : null;
  return (
    <IonModal isOpen={isOpen} onDidDismiss={onDismiss}>
      <IonHeader>
        <IonToolbar>
          <IonTitle>{title}</IonTitle>
          <IonButtons slot="end">
            <IonButton onClick={onDismiss}>Close</IonButton>
          </IonButtons>
        </IonToolbar>
      </IonHeader>
      <IonContent>
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            padding: "8px 16px 24px",
          }}
        >
          <IonDatetime
            presentation="date"
            firstDayOfWeek={1}
            value={datetimeValue}
            onIonChange={(event) => {
              const raw = event.detail.value;
              const date = (Array.isArray(raw) ? raw[0] : raw)?.slice(0, 10);
              if (date) {
                onSelect(date);
              }
            }}
          />
          {value && (
            <IonButton fill="clear" onClick={onClear}>
              Clear
            </IonButton>
          )}
        </div>
      </IonContent>
    </IonModal>
  );
}

export function PublisherDetailView({
  publisherId,
  congregationId,
  collection,
  localCollection,
  suburbCollection,
  streetCollection,
}: PublisherDetailViewProps) {
  const local = localCollection ?? getPublisherLocalCollection();
  const {
    publishers,
    isLoading: publishersLoading,
    error,
    canRetry,
    retry,
    collection: publishersCollection,
  } = usePublishers(congregationId, collection);
  const {
    records,
    isLoading: recordsLoading,
    isError: recordsError,
  } = usePublisherLocalRecords(local);
  const { suburbs, streets } = useTerritoryNames(
    congregationId,
    suburbCollection,
    streetCollection,
  );
  const [presentAlert] = useIonAlert();
  const [isFamilyHeadModalOpen, setIsFamilyHeadModalOpen] = useState(false);
  const [showCopiedToast, setShowCopiedToast] = useState(false);
  const [editing, setEditing] = useState<DetailEditTarget | null>(null);
  // Keep rendering the last edit target while its modal animates closed.
  const lastEditing = useRef<DetailEditTarget | null>(null);
  if (editing) lastEditing.current = editing;
  const permissions = usePermissions(congregationId);

  const copyDetail = (value: string) => {
    copyToClipboard(value);
    setShowCopiedToast(true);
  };

  const publisher = publishers.find((p) => p.id === publisherId);
  const record = records.find((r) => r.publisher_id === publisherId);
  const photo = record?.photo?.[0];

  if (error) {
    return (
      <div style={{ padding: "40px 24px", textAlign: "center" }}>
        <IonNote color="danger">{error.message}</IonNote>
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

  if (publishersLoading || recordsLoading) {
    return (
      <div
        className="ion-padding"
        style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}
      >
        <IonSpinner name="crescent" />
      </div>
    );
  }

  if (!publisher) {
    return (
      <div style={{ padding: "40px 24px", textAlign: "center" }}>
        <IonNote color="medium">Publisher not found.</IonNote>
      </div>
    );
  }

  const standing = publisherStandingLabel(publisher);
  const type = publisherTypeLabel(publisher);
  const gender = genderLabel(publisher);
  const status = isArchived(publisher) ? "Archived" : isRemoved(publisher) ? "Removed" : null;
  const phones = record?.phone ?? [];
  const emails = record?.email ?? [];
  const addresses = record?.address ?? [];
  const emergencyContacts = record?.emergency_contact ?? [];

  const canEdit = permissions.hasSecretary || permissions.isSuperAdmin;
  const familyHeadCandidates = familyHeadOptions(publisher, publishers);
  const displayEditing = editing ?? lastEditing.current;

  const showSaveFailed = (message: string) => {
    void presentAlert({ header: "Save Failed", message, buttons: ["OK"] });
  };

  const editContactDetail = (
    key: ContactDetailField["key"],
    item: ContactDetailItem,
    label: string,
    parentId?: string,
  ) => {
    setEditing({ kind: "contact", field: { key, label }, item, parentId });
  };

  const saveContactDetail = async (input: ContactDetailInput) => {
    const target = editing;
    const id = publisher.id;
    if (!target || target.kind !== "contact" || !isPublisherRowId(id)) {
      return;
    }
    await updateContactDetail(local, id, target.field.key, target.item.id, input, target.parentId);
  };

  const savePublisherField = async (
    field: "standing" | "type" | "gender",
    value: string | null,
  ) => {
    const id = publisher.id;
    if (!publishersCollection || !isPublisherRowId(id)) {
      return;
    }
    try {
      const tx = publishersCollection.update(id, (draft) => {
        if (field === "standing") {
          draft.standing = value as Publisher["standing"];
        } else if (field === "type") {
          draft.type = value as Publisher["type"];
        } else {
          draft.gender = value as Publisher["gender"];
        }
      });
      await tx.isPersisted.promise;
    } catch {
      showSaveFailed("The publisher details could not be updated.");
    }
  };

  const saveDate = async (field: "birth_date" | "baptism_date", value: string | null) => {
    const id = publisher.id;
    if (!isPublisherRowId(id)) {
      return;
    }
    try {
      await updatePublisherLocalDate(local, id, field, value);
    } catch (error) {
      showSaveFailed(error instanceof Error ? error.message : "The date could not be updated.");
    }
  };

  const openOptionEdit = (
    field: "standing" | "type" | "gender",
    title: string,
    selected: string | null,
    options: DetailOption[],
  ) => {
    setEditing({
      kind: "option",
      field,
      title,
      selected,
      options: [{ value: null, label: "None" }, ...options],
    });
  };

  const saveFamilyHead = async (headId: string | null) => {
    const id = publisher.id;
    if (!publishersCollection || !isPublisherRowId(id)) {
      return;
    }
    const tx = publishersCollection.update(id, (draft) => {
      draft.family_id = headId;
    });
    try {
      await tx.isPersisted.promise;
    } catch {
      void presentAlert({
        header: "Save Failed",
        message: "The family head could not be updated.",
        buttons: ["OK"],
      });
    }
  };

  return (
    <>
      {photo && (
        <div style={{ display: "flex", justifyContent: "center", paddingTop: 24 }}>
          <IonAvatar style={{ width: 96, height: 96 }}>
            <img src={`data:${photo.mime_type};base64,${photo.data}`} alt={photo.label || ""} />
          </IonAvatar>
        </div>
      )}
      {!record && (
        <div className="ion-padding" style={{ textAlign: "center" }}>
          <IonNote color="medium">No contact details stored on this device.</IonNote>
        </div>
      )}
      {phones.length + emails.length + addresses.length > 0 && (
        <div>
          <SectionHeader title="Contact" color="medium" />
          <IonList>
            {phones.map((phone) => (
              <ContactItem
                key={`phone-${phone.id}`}
                label={phone.label ? `${phone.label} Phone` : "Phone"}
                value={phone.number}
                actions={phoneActions(phone.number, copyDetail)}
                onEdit={canEdit ? () => editContactDetail("phone", phone, "Phone") : undefined}
              />
            ))}
            {emails.map((email) => (
              <ContactItem
                key={`email-${email.id}`}
                label={email.label ? `${email.label} Email` : "Email"}
                value={email.address}
                actions={emailActions(email.address, copyDetail)}
                onEdit={canEdit ? () => editContactDetail("email", email, "Email") : undefined}
              />
            ))}
            {addresses.map((address) => {
              const formatted = formatAddress(address, suburbs, streets);
              return (
                <ContactItem
                  key={`address-${address.id}`}
                  label={address.label ? `${address.label} Address` : "Address"}
                  value={formatted}
                  actions={addressActions(address, formatted, copyDetail)}
                  onEdit={
                    canEdit ? () => editContactDetail("address", address, "Address") : undefined
                  }
                />
              );
            })}
          </IonList>
        </div>
      )}
      {emergencyContacts.length > 0 && (
        <div>
          <SectionHeader title="Emergency Contacts" color="medium" />
          <IonList>
            {emergencyContacts.map((contact) => {
              const name =
                `${contact.first_name} ${contact.last_name}`.trim() || "Emergency Contact";
              return (
                <Fragment key={contact.id}>
                  <DetailItem
                    label={`Emergency Contact${contact.relationship ? ` — ${contact.relationship}` : ""}`}
                    value={name}
                    onEdit={
                      canEdit
                        ? () => editContactDetail("emergency_contact", contact, "Emergency Contact")
                        : undefined
                    }
                  />
                  {(contact.phone ?? []).map((phone) => (
                    <ContactItem
                      key={`phone-${phone.id}`}
                      label={phone.label ? `${phone.label} Phone` : "Phone"}
                      value={phone.number}
                      actions={phoneActions(phone.number, copyDetail)}
                      onEdit={
                        canEdit
                          ? () => editContactDetail("phone", phone, "Phone", contact.id)
                          : undefined
                      }
                    />
                  ))}
                  {(contact.email ?? []).map((email) => (
                    <ContactItem
                      key={`email-${email.id}`}
                      label={email.label ? `${email.label} Email` : "Email"}
                      value={email.address}
                      actions={emailActions(email.address, copyDetail)}
                      onEdit={
                        canEdit
                          ? () => editContactDetail("email", email, "Email", contact.id)
                          : undefined
                      }
                    />
                  ))}
                  {(contact.address ?? []).map((address) => {
                    const formatted = formatAddress(address, suburbs, streets);
                    return (
                      <ContactItem
                        key={`address-${address.id}`}
                        label={address.label ? `${address.label} Address` : "Address"}
                        value={formatted}
                        actions={addressActions(address, formatted, copyDetail)}
                        onEdit={
                          canEdit
                            ? () => editContactDetail("address", address, "Address", contact.id)
                            : undefined
                        }
                      />
                    );
                  })}
                </Fragment>
              );
            })}
          </IonList>
        </div>
      )}
      <div>
        <SectionHeader title="Details" color="medium" />
        <IonList>
          {(standing || canEdit) && (
            <DetailItem
              label="Standing"
              value={standing ?? "None"}
              onEdit={
                canEdit
                  ? () =>
                      openOptionEdit(
                        "standing",
                        "Standing",
                        publisher.standing ?? null,
                        publisherStandingOptions(),
                      )
                  : undefined
              }
            />
          )}
          {(type || canEdit) && (
            <DetailItem
              label="Type"
              value={type ?? "None"}
              onEdit={
                canEdit
                  ? () =>
                      openOptionEdit("type", "Type", publisher.type ?? null, publisherTypeOptions())
                  : undefined
              }
            />
          )}
          {(gender || canEdit) && (
            <DetailItem
              label="Gender"
              value={gender ?? "None"}
              onEdit={
                canEdit
                  ? () =>
                      openOptionEdit("gender", "Gender", publisher.gender ?? null, GENDER_OPTIONS)
                  : undefined
              }
            />
          )}
          {status && <DetailItem label="Status" value={status} />}
          <DetailItem
            label="Family Head"
            value={familyHeadLabel(publisher, publishers)}
            onEdit={
              canEdit
                ? () => {
                    setIsFamilyHeadModalOpen(true);
                  }
                : undefined
            }
          />
          {(record?.birth_date?.value || canEdit) && (
            <DetailItem
              label="Date of Birth"
              value={record?.birth_date?.value ? formatDate(record.birth_date.value) : "None"}
              onEdit={
                canEdit
                  ? () =>
                      setEditing({
                        kind: "date",
                        field: "birth_date",
                        title: "Date of Birth",
                        value: record?.birth_date?.value ?? null,
                      })
                  : undefined
              }
            />
          )}
          {(record?.baptism_date?.value || canEdit) && (
            <DetailItem
              label="Baptism Date"
              value={record?.baptism_date?.value ? formatDate(record.baptism_date.value) : "None"}
              onEdit={
                canEdit
                  ? () =>
                      setEditing({
                        kind: "date",
                        field: "baptism_date",
                        title: "Baptism Date",
                        value: record?.baptism_date?.value ?? null,
                      })
                  : undefined
              }
            />
          )}
        </IonList>
      </div>
      <IonModal
        isOpen={isFamilyHeadModalOpen}
        onDidDismiss={() => {
          setIsFamilyHeadModalOpen(false);
        }}
      >
        <IonHeader>
          <IonToolbar>
            <IonTitle>Family Head</IonTitle>
            <IonButtons slot="end">
              <IonButton
                onClick={() => {
                  setIsFamilyHeadModalOpen(false);
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
            selectedId={publisher.family_id ?? undefined}
            onSelect={(id) => {
              void saveFamilyHead(id);
              setIsFamilyHeadModalOpen(false);
            }}
          >
            <IonItem
              button
              detail={false}
              onClick={() => {
                void saveFamilyHead(null);
                setIsFamilyHeadModalOpen(false);
              }}
            >
              <IonLabel>No family</IonLabel>
              {!publisher.family_id ? (
                <IonIcon icon={checkmark} slot="end" color="primary" />
              ) : null}
            </IonItem>
          </PublisherSelect>
        </IonContent>
      </IonModal>
      <AddContactDetailModal
        isOpen={editing?.kind === "contact"}
        field={displayEditing?.kind === "contact" ? displayEditing.field : null}
        initial={displayEditing?.kind === "contact" ? displayEditing.item : null}
        publisherName={getPublisherDisplayName(publisher)}
        onSave={saveContactDetail}
        onDismiss={() => {
          setEditing(null);
        }}
      />
      <DetailOptionModal
        isOpen={editing?.kind === "option"}
        title={displayEditing?.kind === "option" ? displayEditing.title : ""}
        options={displayEditing?.kind === "option" ? displayEditing.options : []}
        selected={displayEditing?.kind === "option" ? displayEditing.selected : null}
        onSelect={(value) => {
          if (editing?.kind === "option") {
            void savePublisherField(editing.field, value);
          }
          setEditing(null);
        }}
        onDismiss={() => {
          setEditing(null);
        }}
      />
      <DetailDateModal
        isOpen={editing?.kind === "date"}
        title={displayEditing?.kind === "date" ? displayEditing.title : ""}
        value={displayEditing?.kind === "date" ? displayEditing.value : null}
        onSelect={(date) => {
          if (editing?.kind === "date") {
            void saveDate(editing.field, date);
          }
          setEditing(null);
        }}
        onClear={() => {
          if (editing?.kind === "date") {
            void saveDate(editing.field, null);
          }
          setEditing(null);
        }}
        onDismiss={() => {
          setEditing(null);
        }}
      />
      <IonToast
        isOpen={showCopiedToast}
        message="Copied to clipboard"
        position="bottom"
        duration={2000}
        onDidDismiss={() => {
          setShowCopiedToast(false);
        }}
      />
    </>
  );
}

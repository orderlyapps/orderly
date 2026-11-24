import { Fragment, useState } from "react";
import {
  IonAvatar,
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
  useIonActionSheet,
  useIonAlert,
  type ActionSheetButton,
} from "@ionic/react";
import {
  callOutline,
  chatbubbleOutline,
  checkmark,
  copyOutline,
  mailOutline,
  navigateOutline,
} from "ionicons/icons";

import { SectionHeader } from "../meeting/index.ts";
import { usePermissions } from "../permission/index.ts";
import {
  familyHeadLabel,
  familyHeadOptions,
  isArchived,
  isPublisherRowId,
  isRemoved,
  PublisherSelect,
  publisherStandingLabel,
  publisherTypeLabel,
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

function DetailItem({ label, value }: { label: string; value: string }) {
  return (
    <IonItem lines="inset">
      <IonLabel className="ion-text-wrap">
        <p>{label}</p>
        <h3>{value}</h3>
      </IonLabel>
    </IonItem>
  );
}

function ActionItem({
  label,
  value,
  onSelect,
}: {
  label: string;
  value: string;
  onSelect: () => void;
}) {
  return (
    <IonItem lines="inset" button detail onClick={onSelect}>
      <IonLabel className="ion-text-wrap">
        <p>{label}</p>
        <h3>{value}</h3>
      </IonLabel>
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

function phoneActions(number: string): ActionSheetButton[] {
  const sanitized = number.replace(/[^\d+*#]/g, "");
  const buttons: ActionSheetButton[] = [];
  if (sanitized.length > 0) {
    buttons.push(
      { text: "Call", icon: callOutline, handler: () => openUri(`tel:${sanitized}`) },
      { text: "Message", icon: chatbubbleOutline, handler: () => openUri(`sms:${sanitized}`) },
    );
  }
  buttons.push({ text: "Copy Number", icon: copyOutline, handler: () => copyToClipboard(number) });
  return buttons;
}

function emailActions(address: string): ActionSheetButton[] {
  return [
    {
      text: "Email",
      icon: mailOutline,
      handler: () => openUri(`mailto:${encodeURIComponent(address)}`),
    },
    { text: "Copy Address", icon: copyOutline, handler: () => copyToClipboard(address) },
  ];
}

function addressActions(address: PublisherLocalAddress, formatted: string): ActionSheetButton[] {
  const buttons: ActionSheetButton[] = [];
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
      handler: () => copyToClipboard(formatted),
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
  const [presentActionSheet] = useIonActionSheet();
  const [presentAlert] = useIonAlert();
  const [isFamilyHeadModalOpen, setIsFamilyHeadModalOpen] = useState(false);
  const permissions = usePermissions(congregationId);

  const showActions = (header: string, buttons: ActionSheetButton[]) => {
    if (buttons.length === 0) {
      return;
    }
    void presentActionSheet({
      header,
      buttons: [...buttons, { text: "Cancel", role: "cancel" }],
    });
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

  const canEditFamilyHead = permissions.hasSecretary || permissions.isSuperAdmin;
  const familyHeadCandidates = familyHeadOptions(publisher, publishers);

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
              <ActionItem
                key={`phone-${phone.id}`}
                label={phone.label ? `${phone.label} Phone` : "Phone"}
                value={phone.number}
                onSelect={() => showActions(phone.number, phoneActions(phone.number))}
              />
            ))}
            {emails.map((email) => (
              <ActionItem
                key={`email-${email.id}`}
                label={email.label ? `${email.label} Email` : "Email"}
                value={email.address}
                onSelect={() => showActions(email.address, emailActions(email.address))}
              />
            ))}
            {addresses.map((address) => {
              const formatted = formatAddress(address, suburbs, streets);
              const label = address.label ? `${address.label} Address` : "Address";
              const actions = addressActions(address, formatted);
              if (actions.length === 0) {
                return <DetailItem key={`address-${address.id}`} label={label} value={formatted} />;
              }
              return (
                <ActionItem
                  key={`address-${address.id}`}
                  label={label}
                  value={formatted}
                  onSelect={() => showActions(formatted === "-" ? "Address" : formatted, actions)}
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
                  <IonItem lines="inset">
                    <IonLabel className="ion-text-wrap">
                      <p>
                        Emergency Contact
                        {contact.relationship ? ` — ${contact.relationship}` : ""}
                      </p>
                      <h3>{name}</h3>
                    </IonLabel>
                  </IonItem>
                  {(contact.phone ?? []).map((phone) => (
                    <ActionItem
                      key={`phone-${phone.id}`}
                      label={phone.label ? `${phone.label} Phone` : "Phone"}
                      value={phone.number}
                      onSelect={() => showActions(phone.number, phoneActions(phone.number))}
                    />
                  ))}
                  {(contact.email ?? []).map((email) => (
                    <ActionItem
                      key={`email-${email.id}`}
                      label={email.label ? `${email.label} Email` : "Email"}
                      value={email.address}
                      onSelect={() => showActions(email.address, emailActions(email.address))}
                    />
                  ))}
                  {(contact.address ?? []).map((address) => {
                    const formatted = formatAddress(address, suburbs, streets);
                    const label = address.label ? `${address.label} Address` : "Address";
                    const actions = addressActions(address, formatted);
                    if (actions.length === 0) {
                      return (
                        <DetailItem key={`address-${address.id}`} label={label} value={formatted} />
                      );
                    }
                    return (
                      <ActionItem
                        key={`address-${address.id}`}
                        label={label}
                        value={formatted}
                        onSelect={() =>
                          showActions(formatted === "-" ? "Address" : formatted, actions)
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
          {standing && <DetailItem label="Standing" value={standing} />}
          {type && <DetailItem label="Type" value={type} />}
          {gender && <DetailItem label="Gender" value={gender} />}
          {status && <DetailItem label="Status" value={status} />}
          {canEditFamilyHead ? (
            <ActionItem
              label="Family Head"
              value={familyHeadLabel(publisher, publishers)}
              onSelect={() => {
                setIsFamilyHeadModalOpen(true);
              }}
            />
          ) : (
            <DetailItem label="Family Head" value={familyHeadLabel(publisher, publishers)} />
          )}
          {record?.birth_date?.value && (
            <DetailItem label="Date of Birth" value={formatDate(record.birth_date.value)} />
          )}
          {record?.baptism_date?.value && (
            <DetailItem label="Baptism Date" value={formatDate(record.baptism_date.value)} />
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
    </>
  );
}

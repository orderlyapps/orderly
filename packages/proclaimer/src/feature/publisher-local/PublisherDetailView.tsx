import {
  IonAvatar,
  IonButton,
  IonItem,
  IonLabel,
  IonList,
  IonNote,
  IonSpinner,
} from "@ionic/react";

import {
  isArchived,
  isRemoved,
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
import type { PublisherLocalAddress, PublisherLocalEmergencyContact } from "./schema.ts";

export interface PublisherDetailViewProps {
  publisherId?: string;
  congregationId?: string | null;
  collection?: PublisherCollection;
  localCollection?: PublisherLocalCollection;
  suburbCollection?: SuburbCollection;
  streetCollection?: StreetCollection;
}

function SectionHeader({ label }: { label: string }) {
  return (
    <IonItem lines="inset">
      <IonLabel>
        <span style={{ color: "var(--ion-color-primary)", fontSize: "1.125rem" }}>{label}</span>
      </IonLabel>
    </IonItem>
  );
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

function emergencyContactDetails(
  contact: PublisherLocalEmergencyContact,
  suburbs: NameLookup[],
  streets: NameLookup[],
): string {
  const phones = (contact.phone ?? []).map((p) => p.number);
  const emails = (contact.email ?? []).map((e) => e.address);
  const addresses = (contact.address ?? [])
    .map((a) => formatAddress(a, suburbs, streets))
    .filter((v) => v !== "-");
  return [...phones, ...emails, ...addresses].join(" • ");
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

  return (
    <>
      {photo && (
        <div style={{ display: "flex", justifyContent: "center", paddingTop: 24 }}>
          <IonAvatar style={{ width: 96, height: 96 }}>
            <img src={`data:${photo.mime_type};base64,${photo.data}`} alt={photo.label || ""} />
          </IonAvatar>
        </div>
      )}
      <IonList>
        <SectionHeader label="Details" />
        {standing && <DetailItem label="Standing" value={standing} />}
        {type && <DetailItem label="Type" value={type} />}
        {gender && <DetailItem label="Gender" value={gender} />}
        {status && <DetailItem label="Status" value={status} />}
        {record?.birth_date?.value && (
          <DetailItem label="Date of Birth" value={formatDate(record.birth_date.value)} />
        )}
        {record?.baptism_date?.value && (
          <DetailItem label="Baptism Date" value={formatDate(record.baptism_date.value)} />
        )}
      </IonList>
      {!record && (
        <div className="ion-padding" style={{ textAlign: "center" }}>
          <IonNote color="medium">No contact details stored on this device.</IonNote>
        </div>
      )}
      {phones.length + emails.length + addresses.length > 0 && (
        <IonList>
          <SectionHeader label="Contact" />
          {phones.map((phone) => (
            <DetailItem
              key={phone.id}
              label={phone.label ? `${phone.label} Phone` : "Phone"}
              value={phone.number}
            />
          ))}
          {emails.map((email) => (
            <DetailItem
              key={email.id}
              label={email.label ? `${email.label} Email` : "Email"}
              value={email.address}
            />
          ))}
          {addresses.map((address) => (
            <DetailItem
              key={address.id}
              label={address.label ? `${address.label} Address` : "Address"}
              value={formatAddress(address, suburbs, streets)}
            />
          ))}
        </IonList>
      )}
      {emergencyContacts.length > 0 && (
        <IonList>
          <SectionHeader label="Emergency Contacts" />
          {emergencyContacts.map((contact) => {
            const details = emergencyContactDetails(contact, suburbs, streets);
            const name = `${contact.first_name} ${contact.last_name}`.trim() || "Emergency Contact";
            return (
              <IonItem key={contact.id} lines="inset">
                <IonLabel className="ion-text-wrap">
                  <p>Emergency Contact{contact.relationship ? ` — ${contact.relationship}` : ""}</p>
                  <h3>{name}</h3>
                  {details && <p style={{ marginTop: 4 }}>{details}</p>}
                </IonLabel>
              </IonItem>
            );
          })}
        </IonList>
      )}
    </>
  );
}

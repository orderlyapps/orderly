import { useEffect, useRef, useState } from "react";

import {
  IonButton,
  IonButtons,
  IonContent,
  IonHeader,
  IonInput,
  IonItem,
  IonLabel,
  IonList,
  IonListHeader,
  IonModal,
  IonNote,
  IonTitle,
  IonToolbar,
} from "@ionic/react";

import type { ContactDetailInput } from "./edit.ts";
import type { MissingContactField } from "./missing.ts";

export interface AddContactDetailModalProps {
  isOpen: boolean;
  /** The missing field being filled in, or null while no row is selected. */
  field: MissingContactField | null;
  /** Shown in the list header so the editor knows whose detail this is. */
  publisherName?: string;
  /** Persists the detail; the modal stays open and shows the error if it rejects. */
  onSave: (input: ContactDetailInput) => Promise<void>;
  onDismiss: () => void;
}

interface ContactDetailDraft {
  number: string;
  label: string;
  address: string;
  unit_number: string;
  house_number: string;
  street: string;
  suburb: string;
  first_name: string;
  last_name: string;
  relationship: string;
  phone: string;
  email: string;
}

function emptyDraft(): ContactDetailDraft {
  return {
    number: "",
    label: "",
    address: "",
    unit_number: "",
    house_number: "",
    street: "",
    suburb: "",
    first_name: "",
    last_name: "",
    relationship: "",
    phone: "",
    email: "",
  };
}

function isDraftValid(field: MissingContactField, draft: ContactDetailDraft): boolean {
  const filled = (value: string) => value.trim().length > 0;
  const emailish = (value: string) => filled(value) && value.trim().includes("@");
  switch (field.key) {
    case "phone":
      return filled(draft.number);
    case "email":
      return emailish(draft.address);
    case "address":
      return filled(draft.street) && filled(draft.suburb);
    case "emergency_contact":
      return (
        filled(draft.first_name) &&
        filled(draft.last_name) &&
        (filled(draft.phone) || filled(draft.email)) &&
        (!filled(draft.email) || emailish(draft.email))
      );
  }
}

function toInput(field: MissingContactField, draft: ContactDetailDraft): ContactDetailInput {
  switch (field.key) {
    case "phone":
      return { number: draft.number, label: draft.label };
    case "email":
      return { address: draft.address, label: draft.label };
    case "address":
      return {
        label: draft.label,
        unit_number: draft.unit_number,
        house_number: draft.house_number,
        street: draft.street,
        suburb: draft.suburb,
      };
    case "emergency_contact":
      return {
        first_name: draft.first_name,
        last_name: draft.last_name,
        relationship: draft.relationship,
        phone: draft.phone,
        email: draft.email,
      };
  }
}

/** Adds one missing contact detail (address, phone, email, or emergency contact). */
export function AddContactDetailModal({
  isOpen,
  field,
  publisherName,
  onSave,
  onDismiss,
}: AddContactDetailModalProps) {
  const [draft, setDraft] = useState<ContactDetailDraft>(emptyDraft);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  // Render from the last non-null field/name — `field` goes null the moment
  // the parent starts dismissing, which would blank the form mid-animation.
  const lastField = useRef<MissingContactField | null>(null);
  if (field) lastField.current = field;
  const lastPublisherName = useRef<string | undefined>(undefined);
  if (publisherName != null) lastPublisherName.current = publisherName;
  const displayField = field ?? lastField.current;
  const displayPublisherName = publisherName ?? lastPublisherName.current;

  // Seed the draft only when the modal opens so in-progress edits aren't wiped.
  const wasOpen = useRef(false);
  useEffect(() => {
    const opened = isOpen && !wasOpen.current;
    wasOpen.current = isOpen;
    if (opened) {
      setDraft(emptyDraft());
      setSaving(false);
      setSaveError(null);
    }
  }, [isOpen]);

  const update = (patch: Partial<ContactDetailDraft>) =>
    setDraft((current) => ({ ...current, ...patch }));

  const onIonInput =
    (key: keyof ContactDetailDraft) => (event: CustomEvent<{ value?: string | null }>) =>
      update({ [key]: event.detail.value ?? "" });

  async function handleSave() {
    if (!field) return;
    setSaving(true);
    setSaveError(null);
    try {
      await onSave(toInput(field, draft));
      onDismiss();
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : "Couldn't save the contact detail.");
      setSaving(false);
    }
  }

  return (
    <IonModal isOpen={isOpen} onDidDismiss={onDismiss}>
      <IonHeader>
        <IonToolbar>
          <IonTitle>{displayField ? `Add ${displayField.label}` : ""}</IonTitle>
          <IonButtons slot="start">
            <IonButton onClick={onDismiss} disabled={saving}>
              Cancel
            </IonButton>
          </IonButtons>
          <IonButtons slot="end">
            <IonButton
              onClick={() => void handleSave()}
              disabled={saving || !field || !isDraftValid(field, draft)}
            >
              {saving ? "Saving…" : "Save"}
            </IonButton>
          </IonButtons>
        </IonToolbar>
      </IonHeader>
      <IonContent>
        <IonList>
          {displayPublisherName != null && (
            <IonListHeader>
              <IonLabel>
                <IonNote>{displayPublisherName}</IonNote>
              </IonLabel>
            </IonListHeader>
          )}
          {displayField?.key === "phone" && (
            <>
              <IonItem>
                <IonInput
                  label="Number"
                  type="tel"
                  inputmode="tel"
                  value={draft.number}
                  onIonInput={onIonInput("number")}
                />
              </IonItem>
              <IonItem>
                <IonInput
                  label="Label (optional)"
                  placeholder="e.g. Mobile"
                  value={draft.label}
                  onIonInput={onIonInput("label")}
                />
              </IonItem>
            </>
          )}
          {displayField?.key === "email" && (
            <>
              <IonItem>
                <IonInput
                  label="Email address"
                  type="email"
                  inputmode="email"
                  value={draft.address}
                  onIonInput={onIonInput("address")}
                />
              </IonItem>
              <IonItem>
                <IonInput
                  label="Label (optional)"
                  placeholder="e.g. Personal"
                  value={draft.label}
                  onIonInput={onIonInput("label")}
                />
              </IonItem>
            </>
          )}
          {displayField?.key === "address" && (
            <>
              <IonItem>
                <IonInput
                  label="Unit number (optional)"
                  inputmode="numeric"
                  value={draft.unit_number}
                  onIonInput={onIonInput("unit_number")}
                />
              </IonItem>
              <IonItem>
                <IonInput
                  label="House number (optional)"
                  inputmode="numeric"
                  value={draft.house_number}
                  onIonInput={onIonInput("house_number")}
                />
              </IonItem>
              <IonItem>
                <IonInput label="Street" value={draft.street} onIonInput={onIonInput("street")} />
              </IonItem>
              <IonItem>
                <IonInput label="Suburb" value={draft.suburb} onIonInput={onIonInput("suburb")} />
              </IonItem>
              <IonItem>
                <IonInput
                  label="Label (optional)"
                  placeholder="e.g. Home"
                  value={draft.label}
                  onIonInput={onIonInput("label")}
                />
              </IonItem>
            </>
          )}
          {displayField?.key === "emergency_contact" && (
            <>
              <IonItem>
                <IonInput
                  label="First name"
                  value={draft.first_name}
                  onIonInput={onIonInput("first_name")}
                />
              </IonItem>
              <IonItem>
                <IonInput
                  label="Last name"
                  value={draft.last_name}
                  onIonInput={onIonInput("last_name")}
                />
              </IonItem>
              <IonItem>
                <IonInput
                  label="Relationship"
                  placeholder="e.g. Wife"
                  value={draft.relationship}
                  onIonInput={onIonInput("relationship")}
                />
              </IonItem>
              <IonItem>
                <IonInput
                  label="Phone"
                  type="tel"
                  inputmode="tel"
                  value={draft.phone}
                  onIonInput={onIonInput("phone")}
                />
              </IonItem>
              <IonItem>
                <IonInput
                  label="Email"
                  type="email"
                  inputmode="email"
                  value={draft.email}
                  onIonInput={onIonInput("email")}
                />
              </IonItem>
            </>
          )}
          {saveError != null && (
            <IonItem lines="none">
              <IonNote color="danger">{saveError}</IonNote>
            </IonItem>
          )}
        </IonList>
      </IonContent>
    </IonModal>
  );
}

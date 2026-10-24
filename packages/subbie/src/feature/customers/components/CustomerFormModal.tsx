import { Maskito, maskitoTransform, type MaskitoOptions } from "@maskito/core";
import { useCallback, useEffect, useRef, useState, type ComponentRef } from "react";

import {
  IonButton,
  IonButtons,
  IonContent,
  IonHeader,
  IonInput,
  IonItem,
  IonList,
  IonModal,
  IonTextarea,
  IonTitle,
  IonToolbar,
} from "@ionic/react";

import type { CustomerDocument } from "../schema.ts";

export interface CustomerFormValues {
  name: string;
  email: string;
  phone: string;
  notes: string;
}

export interface CustomerFormModalProps {
  isOpen: boolean;
  initial?: CustomerDocument | null;
  onDismiss: () => void;
  onSubmit: (values: CustomerFormValues) => Promise<void> | void;
}

export const CustomerFormModal = ({
  isOpen,
  initial,
  onDismiss,
  onSubmit,
}: CustomerFormModalProps) => {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [notes, setNotes] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const maskOptionsRef = useRef<MaskitoOptions | null>(null);

  // IonModal mounts its children lazily on willPresent, so the mask must be
  // attached from a callback ref rather than an effect keyed on `isOpen`.
  const initPhoneMask = useCallback((el: ComponentRef<typeof IonInput> | null) => {
    if (!el) {
      return;
    }
    let cancelled = false;
    let maskito: Maskito | undefined;

    void (async () => {
      try {
        const [input, { maskitoPhoneOptionsGenerator }, metadata] = await Promise.all([
          el.getInputElement(),
          import("@maskito/phone"),
          import("libphonenumber-js/min/metadata"),
        ]);
        if (!input || cancelled) {
          return;
        }
        const options = maskitoPhoneOptionsGenerator({
          countryIsoCode: "AU",
          metadata: metadata.default,
          strict: true,
        });
        maskOptionsRef.current = options;
        maskito = new Maskito(input, options);
        setPhone((current) => (current ? maskitoTransform(current, options) : current));
      } catch {
        // Ignore mask initialization errors if the input unmounted before resolving
      }
    })();

    return () => {
      cancelled = true;
      maskito?.destroy();
    };
  }, []);

  useEffect(() => {
    if (!isOpen) {
      return;
    }
    setName(initial?.name ?? "");
    setEmail(initial?.email ?? "");
    const rawPhone = initial?.phone ?? "";
    setPhone(
      rawPhone && maskOptionsRef.current
        ? maskitoTransform(rawPhone, maskOptionsRef.current)
        : rawPhone,
    );
    setNotes(initial?.notes ?? "");
    setIsSaving(false);
  }, [isOpen, initial]);

  const isValid = name.trim().length > 0;

  const handleSave = async () => {
    if (!isValid || isSaving) {
      return;
    }
    setIsSaving(true);
    try {
      await onSubmit({
        name: name.trim(),
        email: email.trim(),
        phone: phone.trim(),
        notes,
      });
      onDismiss();
    } catch {
      // The parent reports the failure; keep the modal open so input is not lost
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <IonModal isOpen={isOpen} onDidDismiss={onDismiss}>
      <IonHeader>
        <IonToolbar>
          <IonButtons slot="start">
            <IonButton onClick={onDismiss}>Cancel</IonButton>
          </IonButtons>
          <IonTitle>{initial ? "Edit Customer" : "New Customer"}</IonTitle>
          <IonButtons slot="end">
            <IonButton
              strong
              disabled={!isValid || isSaving}
              onClick={() => {
                void handleSave();
              }}
            >
              {initial ? "Save" : "Create"}
            </IonButton>
          </IonButtons>
        </IonToolbar>
      </IonHeader>
      <IonContent>
        <IonList inset>
          <IonItem>
            <IonInput
              label="Name"
              labelPlacement="stacked"
              placeholder="Acme Corp"
              value={name}
              onIonInput={(event) => setName(event.detail.value ?? "")}
            />
          </IonItem>
          <IonItem>
            <IonInput
              label="Email"
              labelPlacement="stacked"
              type="email"
              placeholder="billing@acme.com"
              value={email}
              onIonInput={(event) => setEmail(event.detail.value ?? "")}
            />
          </IonItem>
          <IonItem>
            <IonInput
              ref={initPhoneMask}
              label="Phone"
              labelPlacement="stacked"
              type="tel"
              placeholder="+61 412 345 678"
              value={phone}
              onIonInput={(event) => setPhone(event.detail.value ?? "")}
            />
          </IonItem>
          <IonItem>
            <IonTextarea
              label="Notes (optional)"
              labelPlacement="stacked"
              autoGrow
              value={notes}
              onIonInput={(event) => setNotes(event.detail.value ?? "")}
            />
          </IonItem>
        </IonList>
      </IonContent>
    </IonModal>
  );
};

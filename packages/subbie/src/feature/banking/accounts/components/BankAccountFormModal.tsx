import { useEffect, useState } from "react";

import {
  IonButton,
  IonButtons,
  IonContent,
  IonHeader,
  IonInput,
  IonItem,
  IonList,
  IonListHeader,
  IonModal,
  IonTextarea,
  IonTitle,
  IonToolbar,
} from "@ionic/react";

import { DEFAULT_INVOICE_CURRENCY, isCurrencyCode } from "../../../invoices/schema.ts";
import { normalizeBankCsvPreset, type BankCsvPreset } from "../../statements/schema.ts";
import type { BankAccountDocument } from "../schema.ts";

export interface BankAccountFormValues {
  name: string;
  institution: string;
  accountNumber: string;
  currency: string;
  csvPreset: BankCsvPreset;
  notes: string;
}

export interface BankAccountFormModalProps {
  isOpen: boolean;
  initial?: BankAccountDocument | null;
  onDismiss: () => void;
  onSubmit: (values: BankAccountFormValues) => Promise<void> | void;
}

export const BankAccountFormModal = ({
  isOpen,
  initial,
  onDismiss,
  onSubmit,
}: BankAccountFormModalProps) => {
  const [name, setName] = useState("");
  const [institution, setInstitution] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [currency, setCurrency] = useState(DEFAULT_INVOICE_CURRENCY);
  const [notes, setNotes] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!isOpen) {
      return;
    }
    setName(initial?.name ?? "");
    setInstitution(initial?.institution ?? "");
    setAccountNumber(initial?.accountNumber ?? "");
    setCurrency(initial?.currency ?? DEFAULT_INVOICE_CURRENCY);
    setNotes(initial?.notes ?? "");
    setIsSaving(false);
  }, [isOpen, initial]);

  const normalizedCurrency = currency.trim().toUpperCase();
  const isValid = name.trim().length > 0 && isCurrencyCode(normalizedCurrency);

  const handleSave = async () => {
    if (!isValid || isSaving) {
      return;
    }
    setIsSaving(true);
    try {
      await onSubmit({
        name: name.trim(),
        institution: institution.trim(),
        accountNumber: accountNumber.trim(),
        currency: normalizedCurrency,
        csvPreset: normalizeBankCsvPreset(initial?.csvPreset),
        notes,
      });
      onDismiss();
    } catch {
      // Parent handles reporting the error; keep modal open
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
          <IonTitle>{initial ? "Edit Bank Account" : "New Bank Account"}</IonTitle>
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
          <IonListHeader>Account Details</IonListHeader>
          <IonItem>
            <IonInput
              label="Account name"
              labelPlacement="stacked"
              placeholder="Business Operating"
              value={name}
              onIonInput={(event) => setName(event.detail.value ?? "")}
            />
          </IonItem>
          <IonItem>
            <IonInput
              label="Bank / Institution (optional)"
              labelPlacement="stacked"
              placeholder="Commonwealth Bank"
              value={institution}
              onIonInput={(event) => setInstitution(event.detail.value ?? "")}
            />
          </IonItem>
          <IonItem>
            <IonInput
              label="Account number (optional)"
              labelPlacement="stacked"
              placeholder="062-000 12345678"
              value={accountNumber}
              onIonInput={(event) => setAccountNumber(event.detail.value ?? "")}
            />
          </IonItem>
          <IonItem>
            <IonInput
              label="Currency (3-letter code)"
              labelPlacement="stacked"
              placeholder="USD"
              maxlength={3}
              value={currency}
              onIonInput={(event) => setCurrency((event.detail.value ?? "").toUpperCase())}
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

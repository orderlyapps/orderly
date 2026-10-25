import { useEffect, useState } from "react";

import {
  IonButton,
  IonButtons,
  IonContent,
  IonHeader,
  IonInput,
  IonItem,
  IonList,
  IonModal,
  IonSelect,
  IonSelectOption,
  IonTextarea,
  IonTitle,
  IonToolbar,
} from "@ionic/react";

import {
  BANK_TRANSACTION_TYPES,
  bankTransactionTypeLabel,
  isBankTransactionType,
  type BankTransactionType,
} from "../../types.ts";
import type { BankCategoryDocument } from "../schema.ts";

export interface BankCategoryFormValues {
  name: string;
  type: BankTransactionType;
  description: string;
}

export interface BankCategoryFormModalProps {
  isOpen: boolean;
  initial?: BankCategoryDocument | null;
  defaultType?: BankTransactionType;
  onDismiss: () => void;
  onSubmit: (values: BankCategoryFormValues) => Promise<void> | void;
}

export const BankCategoryFormModal = ({
  isOpen,
  initial,
  defaultType = "payment",
  onDismiss,
  onSubmit,
}: BankCategoryFormModalProps) => {
  const [name, setName] = useState("");
  const [type, setType] = useState<BankTransactionType>("payment");
  const [description, setDescription] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!isOpen) {
      return;
    }
    setName(initial?.name ?? "");
    setType(initial?.type ?? defaultType);
    setDescription(initial?.description ?? "");
    setIsSaving(false);
  }, [isOpen, initial, defaultType]);

  const isValid = name.trim().length > 0 && isBankTransactionType(type);

  const handleSave = async () => {
    if (!isValid || isSaving) {
      return;
    }
    setIsSaving(true);
    try {
      await onSubmit({
        name: name.trim(),
        type,
        description: description.trim(),
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
          <IonTitle>{initial ? "Edit Category" : "New Category"}</IonTitle>
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
              label="Category name"
              labelPlacement="stacked"
              placeholder="Materials & Supplies"
              value={name}
              onIonInput={(event) => setName(event.detail.value ?? "")}
            />
          </IonItem>
          <IonItem>
            <IonSelect
              label="Transaction type"
              labelPlacement="stacked"
              interface="action-sheet"
              value={type}
              onIonChange={(event) => {
                const value = event.detail.value;
                if (isBankTransactionType(value)) {
                  setType(value);
                }
              }}
            >
              {BANK_TRANSACTION_TYPES.map((entry) => (
                <IonSelectOption key={entry} value={entry}>
                  {bankTransactionTypeLabel(entry)}
                </IonSelectOption>
              ))}
            </IonSelect>
          </IonItem>
          <IonItem>
            <IonTextarea
              label="Description (optional)"
              labelPlacement="stacked"
              autoGrow
              value={description}
              onIonInput={(event) => setDescription(event.detail.value ?? "")}
            />
          </IonItem>
        </IonList>
      </IonContent>
    </IonModal>
  );
};

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
  IonTitle,
  IonToolbar,
} from "@ionic/react";

import type { ItemDocument } from "../schema.ts";

export interface ItemFormValues {
  name: string;
  description: string;
  unitPriceCents: number;
  unit: string;
}

export interface ItemFormModalProps {
  isOpen: boolean;
  initial?: ItemDocument | null;
  onDismiss: () => void;
  onSubmit: (values: ItemFormValues) => Promise<void> | void;
}

export const ItemFormModal = ({ isOpen, initial, onDismiss, onSubmit }: ItemFormModalProps) => {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [unitPrice, setUnitPrice] = useState("");
  const [unit, setUnit] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!isOpen) {
      return;
    }
    setName(initial?.name ?? "");
    setDescription(initial?.description ?? "");
    setUnitPrice(initial ? (initial.unitPriceCents / 100).toString() : "");
    setUnit(initial?.unit ?? "");
    setIsSaving(false);
  }, [isOpen, initial]);

  const unitPriceCents = Math.round(Number(unitPrice) * 100);
  const isValid =
    name.trim().length > 0 &&
    Number.isFinite(unitPriceCents) &&
    unitPriceCents >= 0 &&
    unitPrice.trim().length > 0;

  const handleSave = async () => {
    if (!isValid || isSaving) {
      return;
    }
    setIsSaving(true);
    try {
      await onSubmit({
        name: name.trim(),
        description: description.trim(),
        unitPriceCents,
        unit: unit.trim(),
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
          <IonTitle>{initial ? "Edit Item" : "New Item"}</IonTitle>
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
              placeholder="Consulting"
              value={name}
              onIonInput={(event) => setName(event.detail.value ?? "")}
            />
          </IonItem>
          <IonItem>
            <IonInput
              label="Description"
              labelPlacement="stacked"
              placeholder="Shown on the invoice"
              value={description}
              onIonInput={(event) => setDescription(event.detail.value ?? "")}
            />
          </IonItem>
          <IonItem>
            <IonInput
              label="Unit"
              labelPlacement="stacked"
              placeholder="hour, day, piece"
              value={unit}
              onIonInput={(event) => setUnit(event.detail.value ?? "")}
            />
          </IonItem>
          <IonItem>
            <IonInput
              label="Unit price"
              labelPlacement="stacked"
              type="number"
              inputmode="decimal"
              min="0"
              step="0.01"
              placeholder="0.00"
              value={unitPrice}
              onIonInput={(event) => setUnitPrice(event.detail.value ?? "")}
            />
          </IonItem>
        </IonList>
      </IonContent>
    </IonModal>
  );
};

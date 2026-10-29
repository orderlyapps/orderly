import { IonInput, IonItem, IonTextarea } from "@ionic/react";

import {
  isInvoiceNotes,
  isPaymentTermsDays,
  PAYMENT_TERMS_DAYS_MAX,
  type SettingsPatch,
} from "../schema.ts";
import { SettingsSection } from "./SettingsSection.tsx";

export interface InvoicingSettingsSectionProps {
  paymentTermsDays: number;
  invoiceNotes: string;
  onUpdateSettings: (patch: SettingsPatch) => Promise<unknown> | void;
  statusMessage?: string | null;
  onStatusChange?: (message: string | null) => void;
}

export const InvoicingSettingsSection = ({
  paymentTermsDays,
  invoiceNotes,
  onUpdateSettings,
  statusMessage,
  onStatusChange,
}: InvoicingSettingsSectionProps) => {
  const applyPatch = async (patch: SettingsPatch) => {
    try {
      await onUpdateSettings(patch);
      onStatusChange?.(null);
    } catch (error) {
      onStatusChange?.(error instanceof Error ? error.message : "Failed to update settings");
    }
  };

  const handlePaymentTermsChange = (value: unknown) => {
    const days = typeof value === "string" && value.trim().length > 0 ? Number(value) : Number.NaN;
    if (!isPaymentTermsDays(days)) {
      onStatusChange?.(
        `Payment terms must be a whole number between 0 and ${PAYMENT_TERMS_DAYS_MAX}`,
      );
      return;
    }
    void applyPatch({ defaultPaymentTermsDays: days });
  };

  const handleInvoiceNotesChange = (value: unknown) => {
    const notes = typeof value === "string" ? value : "";
    if (!isInvoiceNotes(notes)) {
      onStatusChange?.("Invoice notes are too long");
      return;
    }
    void applyPatch({ defaultInvoiceNotes: notes });
  };

  return (
    <SettingsSection title="Invoicing" statusMessage={statusMessage}>
      <IonItem>
        <IonInput
          label="Payment terms (days)"
          labelPlacement="stacked"
          type="number"
          inputmode="numeric"
          min="0"
          max={String(PAYMENT_TERMS_DAYS_MAX)}
          step="1"
          value={paymentTermsDays}
          onIonChange={(event) => handlePaymentTermsChange(event.detail.value)}
        />
      </IonItem>
      <IonItem>
        <IonTextarea
          label="Default invoice notes"
          labelPlacement="stacked"
          autoGrow
          placeholder="Payment terms, bank details, ..."
          value={invoiceNotes}
          onIonChange={(event) => handleInvoiceNotesChange(event.detail.value)}
        />
      </IonItem>
    </SettingsSection>
  );
};

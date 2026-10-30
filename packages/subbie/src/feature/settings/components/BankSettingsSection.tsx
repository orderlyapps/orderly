import { IonInput, IonItem } from "@ionic/react";

import {
  BANK_ACCOUNT_NAME_MAX_LENGTH,
  BANK_ACCOUNT_NUMBER_MAX_LENGTH,
  BANK_BSB_MAX_LENGTH,
  isBankAccountName,
  isBankAccountNumber,
  isBankBsb,
  type SettingsPatch,
} from "../schema.ts";
import { SettingsSection } from "./SettingsSection.tsx";

export interface BankSettingsSectionProps {
  bankAccountName: string;
  bankBsb: string;
  bankAccountNumber: string;
  onUpdateSettings: (patch: SettingsPatch) => Promise<unknown> | void;
  statusMessage?: string | null;
  onStatusChange?: (message: string | null) => void;
}

export const BankSettingsSection = ({
  bankAccountName,
  bankBsb,
  bankAccountNumber,
  onUpdateSettings,
  statusMessage,
  onStatusChange,
}: BankSettingsSectionProps) => {
  const applyPatch = async (patch: SettingsPatch) => {
    try {
      await onUpdateSettings(patch);
      onStatusChange?.(null);
    } catch (error) {
      onStatusChange?.(error instanceof Error ? error.message : "Failed to update settings");
    }
  };

  const applyTextField = (
    value: unknown,
    isValid: (value: unknown) => value is string,
    maxLength: number,
    toPatch: (text: string) => SettingsPatch,
  ) => {
    const text = typeof value === "string" ? value : "";
    if (!isValid(text)) {
      onStatusChange?.(`Must be at most ${maxLength} characters`);
      return;
    }
    void applyPatch(toPatch(text));
  };

  return (
    <SettingsSection title="Bank" statusMessage={statusMessage}>
      <IonItem>
        <IonInput
          label="Bank account name"
          labelPlacement="stacked"
          autocapitalize="words"
          maxlength={BANK_ACCOUNT_NAME_MAX_LENGTH}
          value={bankAccountName}
          onIonChange={(event) =>
            applyTextField(
              event.detail.value,
              isBankAccountName,
              BANK_ACCOUNT_NAME_MAX_LENGTH,
              (text) => ({ bankAccountName: text }),
            )
          }
        />
      </IonItem>
      <IonItem>
        <IonInput
          label="BSB"
          labelPlacement="stacked"
          inputmode="numeric"
          placeholder="062-001"
          maxlength={BANK_BSB_MAX_LENGTH}
          value={bankBsb}
          onIonChange={(event) =>
            applyTextField(event.detail.value, isBankBsb, BANK_BSB_MAX_LENGTH, (text) => ({
              bankBsb: text,
            }))
          }
        />
      </IonItem>
      <IonItem>
        <IonInput
          label="Account number"
          labelPlacement="stacked"
          inputmode="numeric"
          maxlength={BANK_ACCOUNT_NUMBER_MAX_LENGTH}
          value={bankAccountNumber}
          onIonChange={(event) =>
            applyTextField(
              event.detail.value,
              isBankAccountNumber,
              BANK_ACCOUNT_NUMBER_MAX_LENGTH,
              (text) => ({ bankAccountNumber: text }),
            )
          }
        />
      </IonItem>
    </SettingsSection>
  );
};

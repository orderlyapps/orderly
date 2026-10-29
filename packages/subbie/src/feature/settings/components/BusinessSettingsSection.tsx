import { IonInput, IonItem } from "@ionic/react";

import {
  ABN_MAX_LENGTH,
  BANK_ACCOUNT_NAME_MAX_LENGTH,
  BANK_ACCOUNT_NUMBER_MAX_LENGTH,
  BANK_BSB_MAX_LENGTH,
  BUSINESS_NAME_MAX_LENGTH,
  isAbn,
  isBankAccountName,
  isBankAccountNumber,
  isBankBsb,
  isBusinessName,
  type SettingsPatch,
} from "../schema.ts";
import { SettingsSection } from "./SettingsSection.tsx";

export interface BusinessSettingsSectionProps {
  businessName: string;
  abn: string;
  bankAccountName: string;
  bankBsb: string;
  bankAccountNumber: string;
  onUpdateSettings: (patch: SettingsPatch) => Promise<unknown> | void;
  statusMessage?: string | null;
  onStatusChange?: (message: string | null) => void;
}

export const BusinessSettingsSection = ({
  businessName,
  abn,
  bankAccountName,
  bankBsb,
  bankAccountNumber,
  onUpdateSettings,
  statusMessage,
  onStatusChange,
}: BusinessSettingsSectionProps) => {
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
    <SettingsSection title="Business" statusMessage={statusMessage}>
      <IonItem>
        <IonInput
          label="Business name"
          labelPlacement="stacked"
          autocapitalize="words"
          maxlength={BUSINESS_NAME_MAX_LENGTH}
          value={businessName}
          onIonChange={(event) =>
            applyTextField(
              event.detail.value,
              isBusinessName,
              BUSINESS_NAME_MAX_LENGTH,
              (text) => ({ businessName: text }),
            )
          }
        />
      </IonItem>
      <IonItem>
        <IonInput
          label="ABN"
          labelPlacement="stacked"
          inputmode="numeric"
          placeholder="51 824 753 556"
          maxlength={ABN_MAX_LENGTH}
          value={abn}
          onIonChange={(event) =>
            applyTextField(event.detail.value, isAbn, ABN_MAX_LENGTH, (text) => ({ abn: text }))
          }
        />
      </IonItem>
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

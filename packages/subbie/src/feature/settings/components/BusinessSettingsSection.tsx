import { IonInput, IonItem } from "@ionic/react";

import {
  ABN_MAX_LENGTH,
  BUSINESS_NAME_MAX_LENGTH,
  isAbn,
  isBusinessName,
  type SettingsPatch,
} from "../schema.ts";
import { SettingsSection } from "./SettingsSection.tsx";

export interface BusinessSettingsSectionProps {
  businessName: string;
  abn: string;
  onUpdateSettings: (patch: SettingsPatch) => Promise<unknown> | void;
  statusMessage?: string | null;
  onStatusChange?: (message: string | null) => void;
}

export const BusinessSettingsSection = ({
  businessName,
  abn,
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
    </SettingsSection>
  );
};

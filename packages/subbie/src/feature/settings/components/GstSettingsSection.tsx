import { IonInput, IonItem, IonSelect, IonSelectOption, IonToggle } from "@ionic/react";

import {
  BANK_GST_TYPES,
  bankGstTypeLabel,
  isBankGstType,
  type BankGstType,
} from "../../banking/lines/gst.ts";
import { GST_RATE_MAX, isGstRate, type SettingsPatch } from "../schema.ts";
import { SettingsSection } from "./SettingsSection.tsx";

export interface GstSettingsSectionProps {
  gstRegistered: boolean;
  gstRate: number;
  defaultGstType: BankGstType;
  onUpdateSettings: (patch: SettingsPatch) => Promise<unknown> | void;
  statusMessage?: string | null;
  onStatusChange?: (message: string | null) => void;
}

export const GstSettingsSection = ({
  gstRegistered,
  gstRate,
  defaultGstType,
  onUpdateSettings,
  statusMessage,
  onStatusChange,
}: GstSettingsSectionProps) => {
  const gstRatePercent = Math.round(gstRate * 10000) / 100;

  const applyPatch = async (patch: SettingsPatch) => {
    try {
      await onUpdateSettings(patch);
      onStatusChange?.(null);
    } catch (error) {
      onStatusChange?.(error instanceof Error ? error.message : "Failed to update settings");
    }
  };

  const handleGstRegisteredChange = (checked: boolean) => {
    void applyPatch({ gstRegistered: checked });
  };

  const handleGstRateChange = (value: unknown) => {
    const percent =
      typeof value === "string" && value.trim().length > 0 ? Number(value) : Number.NaN;
    const rate = percent / 100;
    if (!isGstRate(rate)) {
      onStatusChange?.(
        `GST rate must be a percentage greater than 0 and at most ${GST_RATE_MAX * 100}`,
      );
      return;
    }
    void applyPatch({ gstRate: rate });
  };

  const handleDefaultGstTypeChange = (value: unknown) => {
    if (!isBankGstType(value)) {
      return;
    }
    void applyPatch({ defaultGstType: value });
  };

  return (
    <SettingsSection title="GST" statusMessage={statusMessage}>
      <IonItem>
        <IonToggle
          checked={gstRegistered}
          onIonChange={(event) => handleGstRegisteredChange(event.detail.checked)}
        >
          Registered for GST
        </IonToggle>
      </IonItem>
      <IonItem>
        <IonInput
          label="GST rate (%)"
          labelPlacement="stacked"
          type="number"
          inputmode="decimal"
          min="0"
          max={String(GST_RATE_MAX * 100)}
          step="any"
          disabled={!gstRegistered}
          value={gstRatePercent}
          onIonChange={(event) => handleGstRateChange(event.detail.value)}
        />
      </IonItem>
      <IonItem>
        <IonSelect
          label="Default GST treatment"
          labelPlacement="stacked"
          interface="popover"
          disabled={!gstRegistered}
          value={defaultGstType}
          onIonChange={(event) => handleDefaultGstTypeChange(event.detail.value)}
        >
          {BANK_GST_TYPES.map((type) => (
            <IonSelectOption key={type} value={type}>
              {bankGstTypeLabel(type)}
            </IonSelectOption>
          ))}
        </IonSelect>
      </IonItem>
    </SettingsSection>
  );
};

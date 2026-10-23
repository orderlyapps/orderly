import { IonItem, IonSelect, IonSelectOption } from "@ionic/react";

import { isThemeMode, type ThemeMode } from "../schema.ts";
import { THEME_OPTIONS } from "../theme.ts";
import { SettingsSection } from "./SettingsSection.tsx";

export interface AppearanceSettingsSectionProps {
  theme: ThemeMode;
  onThemeChange: (theme: ThemeMode) => Promise<unknown> | void;
  statusMessage?: string | null;
  onStatusChange?: (message: string | null) => void;
}

export const AppearanceSettingsSection = ({
  theme,
  onThemeChange,
  statusMessage,
  onStatusChange,
}: AppearanceSettingsSectionProps) => {
  const handleThemeChange = async (value: unknown) => {
    if (!isThemeMode(value)) {
      return;
    }
    try {
      await onThemeChange(value);
      onStatusChange?.(null);
    } catch (error) {
      onStatusChange?.(error instanceof Error ? error.message : "Failed to update theme");
    }
  };

  return (
    <SettingsSection title="Appearance" statusMessage={statusMessage}>
      <IonItem>
        <IonSelect
          label="Theme"
          value={theme}
          interface="popover"
          onIonChange={(event) => {
            void handleThemeChange(event.detail.value);
          }}
        >
          {THEME_OPTIONS.map((option) => (
            <IonSelectOption key={option.value} value={option.value}>
              {option.label}
            </IonSelectOption>
          ))}
        </IonSelect>
      </IonItem>
    </SettingsSection>
  );
};

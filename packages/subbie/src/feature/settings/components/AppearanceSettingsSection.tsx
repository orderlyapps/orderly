import { IonItem, IonSelect, IonSelectOption } from "@ionic/react";

import { FONT_SIZE_OPTIONS } from "../fontSize.ts";
import { isFontSize, isThemeMode, type FontSize, type ThemeMode } from "../schema.ts";
import { THEME_OPTIONS } from "../theme.ts";
import { SettingsSection } from "./SettingsSection.tsx";

export interface AppearanceSettingsSectionProps {
  theme: ThemeMode;
  fontSize: FontSize;
  onThemeChange: (theme: ThemeMode) => Promise<unknown> | void;
  onFontSizeChange: (fontSize: FontSize) => Promise<unknown> | void;
  statusMessage?: string | null;
  onStatusChange?: (message: string | null) => void;
}

export const AppearanceSettingsSection = ({
  theme,
  fontSize,
  onThemeChange,
  onFontSizeChange,
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

  const handleFontSizeChange = async (value: unknown) => {
    if (!isFontSize(value)) {
      return;
    }
    try {
      await onFontSizeChange(value);
      onStatusChange?.(null);
    } catch (error) {
      onStatusChange?.(error instanceof Error ? error.message : "Failed to update font size");
    }
  };

  return (
    <SettingsSection statusMessage={statusMessage}>
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
      <IonItem>
        <IonSelect
          label="Font Size"
          value={fontSize}
          interface="popover"
          onIonChange={(event) => {
            void handleFontSizeChange(event.detail.value);
          }}
        >
          {FONT_SIZE_OPTIONS.map((option) => (
            <IonSelectOption key={option.value} value={option.value}>
              {option.label}
            </IonSelectOption>
          ))}
        </IonSelect>
      </IonItem>
    </SettingsSection>
  );
};

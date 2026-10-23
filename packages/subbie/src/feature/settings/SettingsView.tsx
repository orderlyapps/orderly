import { type ChangeEvent, useRef, useState } from "react";

import {
  IonItem,
  IonItemGroup,
  IonLabel,
  IonList,
  IonListHeader,
  IonNote,
  IonSelect,
  IonSelectOption,
} from "@ionic/react";

import { downloadSettingsBinary, importSettingsBinaryFile } from "./binary.ts";
import type { SettingsStore } from "./db.ts";
import { useSettings } from "./hooks.ts";
import { isThemeMode, type ThemeMode } from "./schema.ts";

export interface SettingsViewProps {
  store?: SettingsStore;
}

const THEME_LABELS: Record<ThemeMode, string> = {
  light: "Light",
  dark: "Dark",
  system: "System",
};

export const SettingsView = ({ store: customStore }: SettingsViewProps) => {
  const { theme, setTheme, store } = useSettings(customStore);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const handleThemeChange = async (value: unknown) => {
    if (!isThemeMode(value)) {
      return;
    }
    try {
      await setTheme(value);
      setStatusMessage(null);
    } catch (error) {
      setStatusMessage(error instanceof Error ? error.message : "Failed to update theme");
    }
  };

  const handleExport = async () => {
    try {
      await downloadSettingsBinary(store ?? customStore);
      setStatusMessage("Settings exported");
    } catch (error) {
      setStatusMessage(error instanceof Error ? error.message : "Export failed");
    }
  };

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileSelected = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) {
      return;
    }
    try {
      const imported = await importSettingsBinaryFile(file, store ?? customStore);
      setStatusMessage(`Imported theme: ${THEME_LABELS[imported.theme]}`);
    } catch (error) {
      setStatusMessage(error instanceof Error ? error.message : "Import failed");
    }
  };

  return (
    <IonList inset>
      <IonItemGroup>
        <IonListHeader>
          <IonLabel>Appearance</IonLabel>
        </IonListHeader>
        <IonItem>
          <IonSelect
            label="Theme"
            value={theme}
            interface="popover"
            onIonChange={(event) => {
              void handleThemeChange(event.detail.value);
            }}
          >
            <IonSelectOption value="light">Light</IonSelectOption>
            <IonSelectOption value="dark">Dark</IonSelectOption>
            <IonSelectOption value="system">System</IonSelectOption>
          </IonSelect>
        </IonItem>
      </IonItemGroup>

      <IonItemGroup>
        <IonListHeader>
          <IonLabel>Data</IonLabel>
        </IonListHeader>
        <IonItem
          button
          detail={false}
          onClick={() => {
            void handleExport();
          }}
        >
          <IonLabel color="primary">Export Settings</IonLabel>
        </IonItem>
        <IonItem button detail={false} onClick={handleImportClick}>
          <IonLabel color="primary">Import Settings</IonLabel>
        </IonItem>
        {statusMessage ? (
          <IonItem lines="none">
            <IonNote>{statusMessage}</IonNote>
          </IonItem>
        ) : null}
      </IonItemGroup>

      <input
        ref={fileInputRef}
        type="file"
        accept=".sub,.SUB,application/octet-stream"
        style={{ display: "none" }}
        onChange={(event) => {
          void handleFileSelected(event);
        }}
      />
    </IonList>
  );
};

import { type ChangeEvent, useRef } from "react";

import { IonItem, IonLabel } from "@ionic/react";

import { downloadSettingsBinary, importSettingsBinaryFile } from "../binary.ts";
import type { SettingsStore } from "../db.ts";
import { THEME_LABELS } from "../theme.ts";
import { SettingsSection } from "./SettingsSection.tsx";

export interface DataSettingsSectionProps {
  store?: SettingsStore;
  statusMessage?: string | null;
  onStatusChange?: (message: string | null) => void;
}

export const DataSettingsSection = ({
  store,
  statusMessage,
  onStatusChange,
}: DataSettingsSectionProps) => {
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const handleExport = async () => {
    try {
      await downloadSettingsBinary(store);
      onStatusChange?.("Settings exported");
    } catch (error) {
      onStatusChange?.(error instanceof Error ? error.message : "Export failed");
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
      const imported = await importSettingsBinaryFile(file, store);
      onStatusChange?.(`Imported theme: ${THEME_LABELS[imported.theme]}`);
    } catch (error) {
      onStatusChange?.(error instanceof Error ? error.message : "Import failed");
    }
  };

  return (
    <>
      <SettingsSection title="Data" statusMessage={statusMessage}>
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
      </SettingsSection>

      <input
        ref={fileInputRef}
        type="file"
        accept=".ion,.ION,application/octet-stream"
        style={{ display: "none" }}
        onChange={(event) => {
          void handleFileSelected(event);
        }}
      />
    </>
  );
};

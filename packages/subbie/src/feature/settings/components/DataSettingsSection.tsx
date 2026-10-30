import { type ChangeEvent, useRef } from "react";

import { IonItem, IonLabel, useIonAlert } from "@ionic/react";

import {
  downloadDataBackup,
  importDataBackup,
  isDataBackupEncrypted,
  type DataBackupStores,
} from "../backup.ts";
import { downloadSettingsBinary, importSettingsBinaryFile } from "../binary.ts";
import type { SettingsStore } from "../db.ts";
import { THEME_LABELS } from "../theme.ts";
import { SettingsSection } from "./SettingsSection.tsx";

export interface DataSettingsSectionProps {
  store?: SettingsStore;
  stores?: DataBackupStores;
  statusMessage?: string | null;
  onStatusChange?: (message: string | null) => void;
}

export const DataSettingsSection = ({
  store,
  stores,
  statusMessage,
  onStatusChange,
}: DataSettingsSectionProps) => {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const backupInputRef = useRef<HTMLInputElement | null>(null);
  const [presentAlert] = useIonAlert();

  const runBackup = async (password: string) => {
    try {
      const bytes = await downloadDataBackup(password, stores);
      onStatusChange?.(`Encrypted backup saved (${formatByteSize(bytes.byteLength)})`);
    } catch (error) {
      onStatusChange?.(error instanceof Error ? error.message : "Backup failed");
    }
  };

  const runRestore = async (bytes: Uint8Array, password?: string) => {
    try {
      const summary = await importDataBackup(bytes, password, stores);
      const statementsPart = `${pluralize(summary.bankStatements, "statement")} (${pluralize(summary.bankStatementLines, "line")})`;
      onStatusChange?.(
        `Restored ${pluralize(summary.bankAccounts, "account")}, ${statementsPart}, ${pluralize(summary.customers, "customer")}, ${pluralize(summary.items, "item")}`,
      );
    } catch (error) {
      onStatusChange?.(error instanceof Error ? error.message : "Restore failed");
    }
  };

  const handleBackupClick = () => {
    void presentAlert({
      header: "Backup Data",
      message: "Choose a password to encrypt this backup (at least 8 characters)",
      inputs: [
        { name: "password", type: "password", placeholder: "Password" },
        { name: "confirm", type: "password", placeholder: "Confirm password" },
      ],
      buttons: [
        { text: "Cancel", role: "cancel" },
        {
          text: "Back Up",
          handler: (data: Record<string, string>) => {
            const password = data.password ?? "";
            if (password.length < 8) {
              onStatusChange?.("Password must be at least 8 characters");
              return false;
            }
            if (password !== (data.confirm ?? "")) {
              onStatusChange?.("Passwords do not match");
              return false;
            }
            void runBackup(password);
            return true;
          },
        },
      ],
    });
  };

  const promptForRestorePassword = (bytes: Uint8Array) => {
    void presentAlert({
      header: "Restore Data",
      message: "Enter the password for this backup",
      inputs: [{ name: "password", type: "password", placeholder: "Password" }],
      buttons: [
        { text: "Cancel", role: "cancel" },
        {
          text: "Restore",
          handler: (data: Record<string, string>) => {
            const password = data.password ?? "";
            if (password.length === 0) {
              return false;
            }
            void runRestore(bytes, password);
            return true;
          },
        },
      ],
    });
  };

  const handleRestoreClick = () => {
    backupInputRef.current?.click();
  };

  const handleBackupFileSelected = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) {
      return;
    }
    try {
      const bytes = new Uint8Array(await file.arrayBuffer());
      if (isDataBackupEncrypted(bytes)) {
        promptForRestorePassword(bytes);
        return;
      }
      await runRestore(bytes);
    } catch (error) {
      onStatusChange?.(error instanceof Error ? error.message : "Restore failed");
    }
  };

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
        <IonItem button detail={false} onClick={handleBackupClick}>
          <IonLabel color="primary">Backup Data</IonLabel>
        </IonItem>
        <IonItem button detail={false} onClick={handleRestoreClick}>
          <IonLabel color="primary">Restore Data</IonLabel>
        </IonItem>
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
        ref={backupInputRef}
        type="file"
        accept=".sub,.SUB,application/octet-stream"
        style={{ display: "none" }}
        onChange={(event) => {
          void handleBackupFileSelected(event);
        }}
      />
      <input
        ref={fileInputRef}
        type="file"
        accept=".sub,.SUB,application/octet-stream"
        style={{ display: "none" }}
        onChange={(event) => {
          void handleFileSelected(event);
        }}
      />
    </>
  );
};

function pluralize(count: number, singular: string, plural = `${singular}s`): string {
  return `${count} ${count === 1 ? singular : plural}`;
}

function formatByteSize(bytes: number): string {
  if (bytes < 1024) {
    return `${bytes} B`;
  }
  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  }
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

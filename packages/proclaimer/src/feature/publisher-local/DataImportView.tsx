import { useRef, useState } from "react";

import {
  IonButton,
  IonItem,
  IonLabel,
  IonList,
  IonNote,
  IonSpinner,
  useIonAlert,
} from "@ionic/react";

import { usePublishers, type PublisherCollection } from "../publisher/index.ts";
import {
  getPublisherLocalCollection,
  type PublisherLocalCollection,
  type StreetCollection,
  type SuburbCollection,
} from "./collection.ts";
import { usePublisherLocalRecords, useTerritoryNames } from "./hooks.ts";
import { ImportPreviewList } from "./ImportPreviewList.tsx";
import type { PublisherLocal } from "./schema.ts";
import {
  importPublisherLocalRecords,
  parsePublisherLocalRecords,
  PUBLISHER_LOCAL_FILE_ACCEPT,
} from "./transfer.ts";

export interface DataImportViewProps {
  congregationId?: string | null;
  collection?: PublisherLocalCollection;
  publisherCollection?: PublisherCollection;
  suburbCollection?: SuburbCollection;
  streetCollection?: StreetCollection;
}

export function DataImportView({
  congregationId,
  collection,
  publisherCollection,
  suburbCollection,
  streetCollection,
}: DataImportViewProps) {
  const [presentAlert] = useIonAlert();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const selectedFileRef = useRef<File | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [parsedRecords, setParsedRecords] = useState<PublisherLocal[] | null>(null);
  const [importing, setImporting] = useState(false);
  const [imported, setImported] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const localCollection = collection ?? getPublisherLocalCollection();
  const {
    records: existingRecords,
    isLoading: recordsLoading,
    isError: recordsError,
  } = usePublisherLocalRecords(localCollection);
  const { publishers } = usePublishers(congregationId, publisherCollection);
  const { suburbs, streets } = useTerritoryNames(
    congregationId,
    suburbCollection,
    streetCollection,
  );

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    // Clearing the input lets the user re-select the same file (e.g. to retry
    // after a failed import), which would otherwise not fire a change event.
    e.target.value = "";
    if (!file) return;
    selectedFileRef.current = file;
    setFileName(file.name);
    setError(null);
    setImported(false);
    setParsedRecords(null);

    const reader = new FileReader();
    reader.onload = () => {
      // Ignore a stale read if a different file has since been selected.
      if (selectedFileRef.current !== file) return;
      try {
        const records = parsePublisherLocalRecords(reader.result as string);
        setParsedRecords(records);
      } catch {
        setError("Could not parse file. Make sure it is a valid export file.");
      }
    };
    reader.onerror = () => {
      if (selectedFileRef.current !== file) return;
      setError("Failed to read file");
    };
    reader.readAsText(file);
  }

  function handleImport() {
    if (!parsedRecords || parsedRecords.length === 0) return;
    void presentAlert({
      header: "Import Data",
      message:
        "Imported records will be merged with existing data. Where values conflict, the most recently updated value is kept. Continue?",
      buttons: [
        { text: "Cancel", role: "cancel" },
        { text: "Import", role: "confirm", handler: () => void doImport() },
      ],
    });
  }

  async function doImport() {
    if (!parsedRecords || parsedRecords.length === 0) return;
    setImporting(true);
    setError(null);
    try {
      await importPublisherLocalRecords(localCollection, parsedRecords);
      setImported(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Import failed");
    } finally {
      setImporting(false);
    }
  }

  return (
    <div className="ion-padding">
      <IonNote color="medium" style={{ display: "block", marginBottom: "0.75rem" }}>
        Import confidential publisher data from a file exported by another device. Imported records
        are merged with existing data — where values conflict, the most recently updated value is
        kept.
      </IonNote>
      <input
        ref={fileInputRef}
        type="file"
        accept={PUBLISHER_LOCAL_FILE_ACCEPT}
        onChange={handleFileChange}
        style={{ display: "none" }}
      />
      <IonList>
        <IonItem button onClick={() => fileInputRef.current?.click()}>
          <IonLabel>
            {fileName ? (
              <>{fileName}</>
            ) : (
              <IonNote color="medium">Select a file to import…</IonNote>
            )}
          </IonLabel>
        </IonItem>
      </IonList>
      {error && (
        <IonNote style={{ color: "var(--ion-color-danger)", display: "block" }}>{error}</IonNote>
      )}
      {recordsError && (
        <IonNote style={{ color: "var(--ion-color-danger)", display: "block" }}>
          Existing publisher data on this device could not be loaded, so the import preview is
          unavailable. Reload the app and try again.
        </IonNote>
      )}
      {parsedRecords && !imported && !recordsLoading && !recordsError && (
        <ImportPreviewList
          records={parsedRecords}
          existing={existingRecords}
          publishers={publishers}
          suburbs={suburbs}
          streets={streets}
        />
      )}
      {imported && (
        <IonNote style={{ color: "var(--ion-color-success)", display: "block" }}>
          Import complete. Records were merged with existing data.
        </IonNote>
      )}
      <IonButton
        expand="block"
        onClick={handleImport}
        disabled={
          importing || !parsedRecords || parsedRecords.length === 0 || imported || recordsError
        }
        style={{ marginTop: 16 }}
      >
        {importing ? (
          <>
            <IonSpinner name="crescent" style={{ marginRight: 8 }} />
            Importing…
          </>
        ) : (
          "Import from file"
        )}
      </IonButton>
    </div>
  );
}

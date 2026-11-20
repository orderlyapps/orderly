import { useRef, useState } from "react";

import { IonButton, IonNote, IonSpinner, useIonAlert } from "@ionic/react";

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
  const [readingFile, setReadingFile] = useState(false);
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
    setReadingFile(true);
    setError(null);
    setImported(false);
    setParsedRecords(null);

    const reader = new FileReader();
    reader.onload = () => {
      // Ignore a stale read if a different file has since been selected.
      if (selectedFileRef.current !== file) return;
      setReadingFile(false);
      try {
        const records = parsePublisherLocalRecords(reader.result as string);
        setParsedRecords(records);
      } catch {
        setError("Could not parse file. Make sure it is a valid export file.");
      }
    };
    reader.onerror = () => {
      if (selectedFileRef.current !== file) return;
      setReadingFile(false);
      setError("Failed to read file");
    };
    try {
      reader.readAsText(file);
    } catch {
      // A synchronous throw (e.g. a detached File) never fires onerror — reset
      // state so the loading indicator doesn't spin forever.
      setReadingFile(false);
      setError("Failed to read file");
    }
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
    <div
      className="ion-padding"
      style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}
    >
      <IonNote color="medium" style={{ display: "block" }}>
        Import publisher data exported from Secretary.
      </IonNote>
      <input
        ref={fileInputRef}
        type="file"
        accept={PUBLISHER_LOCAL_FILE_ACCEPT}
        onChange={handleFileChange}
        style={{ display: "none" }}
      />
      <IonButton expand="block" fill="outline" onClick={() => fileInputRef.current?.click()}>
        {fileName ?? "Select file"}
      </IonButton>
      {readingFile && (
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <IonSpinner name="crescent" />
          <IonNote color="medium">Reading file…</IonNote>
        </div>
      )}
      {!readingFile && fileName && recordsLoading && !recordsError && (
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <IonSpinner name="crescent" />
          <IonNote color="medium">Loading existing publisher data…</IonNote>
        </div>
      )}
      {error && (
        <IonNote style={{ color: "var(--ion-color-danger)", display: "block" }}>{error}</IonNote>
      )}
      {recordsError && (
        <IonNote style={{ color: "var(--ion-color-danger)", display: "block" }}>
          Existing publisher data on this device could not be loaded, so the import preview is
          unavailable. Reload the app and try again.
        </IonNote>
      )}
      {fileName && (
        <IonButton
          expand="block"
          onClick={handleImport}
          disabled={
            importing || !parsedRecords || parsedRecords.length === 0 || imported || recordsError
          }
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
    </div>
  );
}

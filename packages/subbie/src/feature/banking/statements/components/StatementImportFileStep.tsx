import { IonItem, IonLabel, IonList, IonListHeader, IonNote, IonTextarea } from "@ionic/react";

export interface StatementImportFileStepProps {
  filename: string;
  csvText: string;
  onChooseFile: () => void;
  onCsvTextChange: (text: string) => void;
}

export const StatementImportFileStep = ({
  filename,
  csvText,
  onChooseFile,
  onCsvTextChange,
}: StatementImportFileStepProps) => (
  <IonList inset>
    <IonListHeader>Step 2 — Statement File</IonListHeader>
    <IonItem button detail={false} onClick={onChooseFile}>
      <IonLabel color="primary">Choose CSV File…</IonLabel>
      <IonNote slot="end">{filename}</IonNote>
    </IonItem>

    <IonItem>
      <IonTextarea
        label="CSV Content"
        labelPlacement="stacked"
        rows={8}
        placeholder="Date,Description,Amount,Balance&#10;2026-10-24,Client Payment,1250.00,5250.00"
        value={csvText}
        onIonInput={(event) => onCsvTextChange(event.detail.value ?? "")}
      />
    </IonItem>
  </IonList>
);

import {
  IonBadge,
  IonItem,
  IonLabel,
  IonList,
  IonListHeader,
  IonNote,
  IonToggle,
} from "@ionic/react";

import { formatCurrency } from "../../../invoices/schema.ts";
import { bankTransactionTypeColor, bankTransactionTypeLabel } from "../../types.ts";
import type { ParsedBankStatementRow } from "../csv.ts";
import type { BankCsvColumnRole, BankCsvPreset } from "../schema.ts";
import { CsvPresetFields, type CsvPresetFieldsProps } from "./CsvPresetFields.tsx";

export interface StatementImportMappingStepProps {
  preset: BankCsvPreset;
  columnRoles: readonly BankCsvColumnRole[];
  sampleRow: readonly string[];
  savePresetToAccount: boolean;
  previewRows: readonly ParsedBankStatementRow[];
  previewError: string | null;
  currency: string;
  onHasHeaderChange: (hasHeader: boolean) => void;
  onHeaderColumnChange: CsvPresetFieldsProps["onHeaderColumnChange"];
  onColumnRoleChange: (columnIndex: number, role: BankCsvColumnRole) => void;
  onAddColumn: () => void;
  onSavePresetToAccountChange: (save: boolean) => void;
}

export const StatementImportMappingStep = ({
  preset,
  columnRoles,
  sampleRow,
  savePresetToAccount,
  previewRows,
  previewError,
  currency,
  onHasHeaderChange,
  onHeaderColumnChange,
  onColumnRoleChange,
  onAddColumn,
  onSavePresetToAccountChange,
}: StatementImportMappingStepProps) => (
  <>
    <IonList inset>
      <IonListHeader>Step 3 — Column Mapping Preset</IonListHeader>
      <CsvPresetFields
        hasHeader={preset.hasHeader}
        onHasHeaderChange={onHasHeaderChange}
        hasHeaderLabel="First row is header"
        preset={preset}
        onHeaderColumnChange={onHeaderColumnChange}
        columnRoles={columnRoles}
        onColumnRoleChange={onColumnRoleChange}
        onAddColumn={onAddColumn}
        sampleRow={sampleRow}
      />

      <IonItem>
        <IonToggle
          checked={savePresetToAccount}
          onIonChange={(event) => onSavePresetToAccountChange(event.detail.checked)}
        >
          Save preset to bank account
        </IonToggle>
      </IonItem>
    </IonList>

    <IonList inset>
      <IonListHeader>
        Preview ({previewRows.length} {previewRows.length === 1 ? "line" : "lines"})
      </IonListHeader>
      {previewError ? (
        <IonItem lines="none">
          <IonNote color="danger">{previewError}</IonNote>
        </IonItem>
      ) : previewRows.length === 0 ? (
        <IonItem lines="none">
          <IonNote>Select or paste a CSV file to preview statement lines</IonNote>
        </IonItem>
      ) : (
        previewRows.slice(0, 10).map((row, index) => (
          <IonItem key={`${row.date}-${row.description}-${index}`}>
            <IonLabel>
              <h3>{row.description}</h3>
              <IonNote>{row.date}</IonNote>
            </IonLabel>
            <div slot="end" className="ion-text-end">
              <div>
                <strong>
                  {row.type === "payment" ? "-" : "+"}
                  {formatCurrency(row.amountCents, currency)}
                </strong>
              </div>
              <IonBadge color={bankTransactionTypeColor(row.type)}>
                {bankTransactionTypeLabel(row.type)}
              </IonBadge>
            </div>
          </IonItem>
        ))
      )}
    </IonList>
  </>
);

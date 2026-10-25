import { IonInput, IonItem, IonLabel, IonSelect, IonSelectOption, IonToggle } from "@ionic/react";

import {
  BANK_CSV_COLUMN_ROLES,
  bankCsvColumnRoleLabel,
  isBankCsvColumnRole,
  type BankCsvColumnRole,
  type BankCsvPreset,
} from "../schema.ts";

export interface CsvPresetFieldsProps {
  hasHeader: boolean;
  onHasHeaderChange: (hasHeader: boolean) => void;
  hasHeaderLabel?: string;
  preset: Pick<
    BankCsvPreset,
    | "dateColumn"
    | "descriptionColumn"
    | "amountColumn"
    | "debitColumn"
    | "creditColumn"
    | "balanceColumn"
  >;
  onHeaderColumnChange: (
    field:
      | "dateColumn"
      | "descriptionColumn"
      | "amountColumn"
      | "debitColumn"
      | "creditColumn"
      | "balanceColumn",
    value: string,
  ) => void;
  columnRoles: readonly BankCsvColumnRole[];
  onColumnRoleChange: (columnIndex: number, role: BankCsvColumnRole) => void;
  onAddColumn: () => void;
  onRemoveLastColumn?: () => void;
  sampleRow?: readonly string[];
  showHeaderPlaceholders?: boolean;
}

export const CsvPresetFields = ({
  hasHeader,
  onHasHeaderChange,
  hasHeaderLabel = "CSV includes header row",
  preset,
  onHeaderColumnChange,
  columnRoles,
  onColumnRoleChange,
  onAddColumn,
  onRemoveLastColumn,
  sampleRow,
  showHeaderPlaceholders = false,
}: CsvPresetFieldsProps) => (
  <>
    <IonItem>
      <IonToggle
        checked={hasHeader}
        onIonChange={(event) => onHasHeaderChange(event.detail.checked)}
      >
        {hasHeaderLabel}
      </IonToggle>
    </IonItem>

    {hasHeader ? (
      <>
        <IonItem>
          <IonInput
            label={showHeaderPlaceholders ? "Date column header" : "Date column"}
            labelPlacement="stacked"
            placeholder={showHeaderPlaceholders ? "Date" : undefined}
            value={preset.dateColumn}
            onIonInput={(event) => onHeaderColumnChange("dateColumn", event.detail.value ?? "")}
          />
        </IonItem>
        <IonItem>
          <IonInput
            label={showHeaderPlaceholders ? "Description column header" : "Description column"}
            labelPlacement="stacked"
            placeholder={showHeaderPlaceholders ? "Description" : undefined}
            value={preset.descriptionColumn}
            onIonInput={(event) =>
              onHeaderColumnChange("descriptionColumn", event.detail.value ?? "")
            }
          />
        </IonItem>
        <IonItem>
          <IonInput
            label={
              showHeaderPlaceholders ? "Amount column header (signed)" : "Amount column (signed)"
            }
            labelPlacement="stacked"
            placeholder={showHeaderPlaceholders ? "Amount" : undefined}
            value={preset.amountColumn}
            onIonInput={(event) => onHeaderColumnChange("amountColumn", event.detail.value ?? "")}
          />
        </IonItem>
        <IonItem>
          <IonInput
            label={
              showHeaderPlaceholders ? "Debit column header (optional)" : "Debit column (optional)"
            }
            labelPlacement="stacked"
            placeholder={showHeaderPlaceholders ? "Debit" : undefined}
            value={preset.debitColumn}
            onIonInput={(event) => onHeaderColumnChange("debitColumn", event.detail.value ?? "")}
          />
        </IonItem>
        <IonItem>
          <IonInput
            label={
              showHeaderPlaceholders
                ? "Credit column header (optional)"
                : "Credit column (optional)"
            }
            labelPlacement="stacked"
            placeholder={showHeaderPlaceholders ? "Credit" : undefined}
            value={preset.creditColumn}
            onIonInput={(event) => onHeaderColumnChange("creditColumn", event.detail.value ?? "")}
          />
        </IonItem>
        <IonItem>
          <IonInput
            label={
              showHeaderPlaceholders
                ? "Balance column header (optional)"
                : "Balance column (optional)"
            }
            labelPlacement="stacked"
            placeholder={showHeaderPlaceholders ? "Balance" : undefined}
            value={preset.balanceColumn}
            onIonInput={(event) => onHeaderColumnChange("balanceColumn", event.detail.value ?? "")}
          />
        </IonItem>
      </>
    ) : (
      <>
        {columnRoles.map((role, colIndex) => {
          const sampleValue = sampleRow?.[colIndex];
          const label =
            sampleValue !== undefined && sampleValue.length > 0
              ? `Column ${colIndex + 1} (e.g. "${sampleValue}")`
              : `Column ${colIndex + 1}`;
          return (
            <IonItem key={`csv-col-role-${colIndex}`}>
              <IonSelect
                label={label}
                labelPlacement="stacked"
                interface="action-sheet"
                value={role}
                onIonChange={(event) => {
                  const value = event.detail.value;
                  if (isBankCsvColumnRole(value)) {
                    onColumnRoleChange(colIndex, value);
                  }
                }}
              >
                {BANK_CSV_COLUMN_ROLES.map((option) => (
                  <IonSelectOption key={option} value={option}>
                    {bankCsvColumnRoleLabel(option)}
                  </IonSelectOption>
                ))}
              </IonSelect>
            </IonItem>
          );
        })}
        <IonItem button detail={false} onClick={onAddColumn}>
          <IonLabel color="primary">Add Column</IonLabel>
        </IonItem>
        {onRemoveLastColumn && columnRoles.length > 2 ? (
          <IonItem button detail={false} onClick={onRemoveLastColumn}>
            <IonLabel color="medium">Remove Last Column</IonLabel>
          </IonItem>
        ) : null}
      </>
    )}
  </>
);

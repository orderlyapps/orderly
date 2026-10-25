import { useEffect, useState } from "react";

import {
  IonButton,
  IonButtons,
  IonContent,
  IonHeader,
  IonInput,
  IonItem,
  IonList,
  IonListHeader,
  IonModal,
  IonTextarea,
  IonTitle,
  IonToolbar,
} from "@ionic/react";

import { DEFAULT_INVOICE_CURRENCY, isCurrencyCode } from "../../../invoices/schema.ts";
import { CsvPresetFields } from "../../statements/components/CsvPresetFields.tsx";
import {
  assignColumnRole,
  columnRolesFromPreset,
  DEFAULT_BANK_CSV_PRESET,
  normalizeBankCsvPreset,
  presetFromColumnRoles,
  type BankCsvColumnRole,
  type BankCsvPreset,
} from "../../statements/schema.ts";
import type { BankAccountDocument } from "../schema.ts";

export interface BankAccountFormValues {
  name: string;
  institution: string;
  accountNumber: string;
  currency: string;
  csvPreset: BankCsvPreset;
  notes: string;
}

export interface BankAccountFormModalProps {
  isOpen: boolean;
  initial?: BankAccountDocument | null;
  onDismiss: () => void;
  onSubmit: (values: BankAccountFormValues) => Promise<void> | void;
}

export const BankAccountFormModal = ({
  isOpen,
  initial,
  onDismiss,
  onSubmit,
}: BankAccountFormModalProps) => {
  const [name, setName] = useState("");
  const [institution, setInstitution] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [currency, setCurrency] = useState(DEFAULT_INVOICE_CURRENCY);
  const [hasHeader, setHasHeader] = useState<boolean>(DEFAULT_BANK_CSV_PRESET.hasHeader);
  const [headerColumns, setHeaderColumns] = useState({
    dateColumn: DEFAULT_BANK_CSV_PRESET.dateColumn,
    descriptionColumn: DEFAULT_BANK_CSV_PRESET.descriptionColumn,
    amountColumn: DEFAULT_BANK_CSV_PRESET.amountColumn,
    debitColumn: DEFAULT_BANK_CSV_PRESET.debitColumn,
    creditColumn: DEFAULT_BANK_CSV_PRESET.creditColumn,
    balanceColumn: DEFAULT_BANK_CSV_PRESET.balanceColumn,
  });
  const [columnRoles, setColumnRoles] = useState<BankCsvColumnRole[]>(() =>
    columnRolesFromPreset(DEFAULT_BANK_CSV_PRESET, 4),
  );
  const [notes, setNotes] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!isOpen) {
      return;
    }
    const preset = normalizeBankCsvPreset(initial?.csvPreset);
    setName(initial?.name ?? "");
    setInstitution(initial?.institution ?? "");
    setAccountNumber(initial?.accountNumber ?? "");
    setCurrency(initial?.currency ?? DEFAULT_INVOICE_CURRENCY);
    setHasHeader(preset.hasHeader);
    setHeaderColumns({
      dateColumn: preset.hasHeader ? preset.dateColumn : DEFAULT_BANK_CSV_PRESET.dateColumn,
      descriptionColumn: preset.hasHeader
        ? preset.descriptionColumn
        : DEFAULT_BANK_CSV_PRESET.descriptionColumn,
      amountColumn: preset.hasHeader ? preset.amountColumn : DEFAULT_BANK_CSV_PRESET.amountColumn,
      debitColumn: preset.hasHeader ? preset.debitColumn : DEFAULT_BANK_CSV_PRESET.debitColumn,
      creditColumn: preset.hasHeader ? preset.creditColumn : DEFAULT_BANK_CSV_PRESET.creditColumn,
      balanceColumn: preset.hasHeader
        ? preset.balanceColumn
        : DEFAULT_BANK_CSV_PRESET.balanceColumn,
    });
    setColumnRoles(columnRolesFromPreset(preset, 4));
    setNotes(initial?.notes ?? "");
    setIsSaving(false);
  }, [isOpen, initial]);

  const effectivePreset: BankCsvPreset = hasHeader
    ? {
        hasHeader: true,
        dateColumn: headerColumns.dateColumn.trim(),
        descriptionColumn: headerColumns.descriptionColumn.trim(),
        amountColumn: headerColumns.amountColumn.trim(),
        debitColumn: headerColumns.debitColumn.trim(),
        creditColumn: headerColumns.creditColumn.trim(),
        balanceColumn: headerColumns.balanceColumn.trim(),
      }
    : presetFromColumnRoles(columnRoles);

  const normalizedCurrency = currency.trim().toUpperCase();
  const isValid =
    name.trim().length > 0 &&
    isCurrencyCode(normalizedCurrency) &&
    effectivePreset.dateColumn.trim().length > 0 &&
    effectivePreset.descriptionColumn.trim().length > 0 &&
    (effectivePreset.amountColumn.trim().length > 0 ||
      effectivePreset.debitColumn.trim().length > 0 ||
      effectivePreset.creditColumn.trim().length > 0);

  const handleSave = async () => {
    if (!isValid || isSaving) {
      return;
    }
    setIsSaving(true);
    try {
      await onSubmit({
        name: name.trim(),
        institution: institution.trim(),
        accountNumber: accountNumber.trim(),
        currency: normalizedCurrency,
        csvPreset: normalizeBankCsvPreset(effectivePreset),
        notes,
      });
      onDismiss();
    } catch {
      // Parent handles reporting the error; keep modal open
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <IonModal isOpen={isOpen} onDidDismiss={onDismiss}>
      <IonHeader>
        <IonToolbar>
          <IonButtons slot="start">
            <IonButton onClick={onDismiss}>Cancel</IonButton>
          </IonButtons>
          <IonTitle>{initial ? "Edit Bank Account" : "New Bank Account"}</IonTitle>
          <IonButtons slot="end">
            <IonButton
              strong
              disabled={!isValid || isSaving}
              onClick={() => {
                void handleSave();
              }}
            >
              {initial ? "Save" : "Create"}
            </IonButton>
          </IonButtons>
        </IonToolbar>
      </IonHeader>
      <IonContent>
        <IonList inset>
          <IonListHeader>Account Details</IonListHeader>
          <IonItem>
            <IonInput
              label="Account name"
              labelPlacement="stacked"
              placeholder="Business Operating"
              value={name}
              onIonInput={(event) => setName(event.detail.value ?? "")}
            />
          </IonItem>
          <IonItem>
            <IonInput
              label="Bank / Institution (optional)"
              labelPlacement="stacked"
              placeholder="Commonwealth Bank"
              value={institution}
              onIonInput={(event) => setInstitution(event.detail.value ?? "")}
            />
          </IonItem>
          <IonItem>
            <IonInput
              label="Account number (optional)"
              labelPlacement="stacked"
              placeholder="062-000 12345678"
              value={accountNumber}
              onIonInput={(event) => setAccountNumber(event.detail.value ?? "")}
            />
          </IonItem>
          <IonItem>
            <IonInput
              label="Currency (3-letter code)"
              labelPlacement="stacked"
              placeholder="USD"
              maxlength={3}
              value={currency}
              onIonInput={(event) => setCurrency((event.detail.value ?? "").toUpperCase())}
            />
          </IonItem>
          <IonItem>
            <IonTextarea
              label="Notes (optional)"
              labelPlacement="stacked"
              autoGrow
              value={notes}
              onIonInput={(event) => setNotes(event.detail.value ?? "")}
            />
          </IonItem>
        </IonList>

        <IonList inset>
          <IonListHeader>CSV Column Preset</IonListHeader>
          <CsvPresetFields
            hasHeader={hasHeader}
            onHasHeaderChange={setHasHeader}
            hasHeaderLabel="CSV includes header row"
            preset={headerColumns}
            onHeaderColumnChange={(field, value) =>
              setHeaderColumns((current) => ({ ...current, [field]: value }))
            }
            columnRoles={columnRoles}
            onColumnRoleChange={(colIndex, role) =>
              setColumnRoles((current) => assignColumnRole(current, colIndex, role))
            }
            onAddColumn={() => setColumnRoles((current) => [...current, "ignore"])}
            onRemoveLastColumn={() => setColumnRoles((current) => current.slice(0, -1))}
            showHeaderPlaceholders
          />
        </IonList>
      </IonContent>
    </IonModal>
  );
};

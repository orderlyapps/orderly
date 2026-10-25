import { useEffect, useState } from "react";

import {
  IonButton,
  IonButtons,
  IonContent,
  IonHeader,
  IonInput,
  IonItem,
  IonLabel,
  IonList,
  IonListHeader,
  IonModal,
  IonSelect,
  IonSelectOption,
  IonTextarea,
  IonTitle,
  IonToggle,
  IonToolbar,
} from "@ionic/react";

import { DEFAULT_INVOICE_CURRENCY, isCurrencyCode } from "../../invoices/schema.ts";
import {
  assignColumnRole,
  BANK_CSV_COLUMN_ROLES,
  bankCsvColumnRoleLabel,
  columnRolesFromPreset,
  DEFAULT_BANK_CSV_PRESET,
  isBankCsvColumnRole,
  normalizeBankCsvPreset,
  presetFromColumnRoles,
  type BankAccountDocument,
  type BankCsvColumnRole,
  type BankCsvPreset,
} from "../schema.ts";

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
  const [dateColumn, setDateColumn] = useState<string>(DEFAULT_BANK_CSV_PRESET.dateColumn);
  const [descriptionColumn, setDescriptionColumn] = useState<string>(
    DEFAULT_BANK_CSV_PRESET.descriptionColumn,
  );
  const [amountColumn, setAmountColumn] = useState<string>(DEFAULT_BANK_CSV_PRESET.amountColumn);
  const [debitColumn, setDebitColumn] = useState<string>(DEFAULT_BANK_CSV_PRESET.debitColumn);
  const [creditColumn, setCreditColumn] = useState<string>(DEFAULT_BANK_CSV_PRESET.creditColumn);
  const [balanceColumn, setBalanceColumn] = useState<string>(DEFAULT_BANK_CSV_PRESET.balanceColumn);
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
    setDateColumn(preset.hasHeader ? preset.dateColumn : DEFAULT_BANK_CSV_PRESET.dateColumn);
    setDescriptionColumn(
      preset.hasHeader ? preset.descriptionColumn : DEFAULT_BANK_CSV_PRESET.descriptionColumn,
    );
    setAmountColumn(preset.hasHeader ? preset.amountColumn : DEFAULT_BANK_CSV_PRESET.amountColumn);
    setDebitColumn(preset.hasHeader ? preset.debitColumn : DEFAULT_BANK_CSV_PRESET.debitColumn);
    setCreditColumn(preset.hasHeader ? preset.creditColumn : DEFAULT_BANK_CSV_PRESET.creditColumn);
    setBalanceColumn(
      preset.hasHeader ? preset.balanceColumn : DEFAULT_BANK_CSV_PRESET.balanceColumn,
    );
    setColumnRoles(columnRolesFromPreset(preset, 4));
    setNotes(initial?.notes ?? "");
    setIsSaving(false);
  }, [isOpen, initial]);

  const effectivePreset: BankCsvPreset = hasHeader
    ? {
        hasHeader: true,
        dateColumn: dateColumn.trim(),
        descriptionColumn: descriptionColumn.trim(),
        amountColumn: amountColumn.trim(),
        debitColumn: debitColumn.trim(),
        creditColumn: creditColumn.trim(),
        balanceColumn: balanceColumn.trim(),
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
          <IonItem>
            <IonToggle
              checked={hasHeader}
              onIonChange={(event) => setHasHeader(event.detail.checked)}
            >
              CSV includes header row
            </IonToggle>
          </IonItem>

          {hasHeader ? (
            <>
              <IonItem>
                <IonInput
                  label="Date column header"
                  labelPlacement="stacked"
                  placeholder="Date"
                  value={dateColumn}
                  onIonInput={(event) => setDateColumn(event.detail.value ?? "")}
                />
              </IonItem>
              <IonItem>
                <IonInput
                  label="Description column header"
                  labelPlacement="stacked"
                  placeholder="Description"
                  value={descriptionColumn}
                  onIonInput={(event) => setDescriptionColumn(event.detail.value ?? "")}
                />
              </IonItem>
              <IonItem>
                <IonInput
                  label="Amount column header (signed)"
                  labelPlacement="stacked"
                  placeholder="Amount"
                  value={amountColumn}
                  onIonInput={(event) => setAmountColumn(event.detail.value ?? "")}
                />
              </IonItem>
              <IonItem>
                <IonInput
                  label="Debit column header (optional)"
                  labelPlacement="stacked"
                  placeholder="Debit"
                  value={debitColumn}
                  onIonInput={(event) => setDebitColumn(event.detail.value ?? "")}
                />
              </IonItem>
              <IonItem>
                <IonInput
                  label="Credit column header (optional)"
                  labelPlacement="stacked"
                  placeholder="Credit"
                  value={creditColumn}
                  onIonInput={(event) => setCreditColumn(event.detail.value ?? "")}
                />
              </IonItem>
              <IonItem>
                <IonInput
                  label="Balance column header (optional)"
                  labelPlacement="stacked"
                  placeholder="Balance"
                  value={balanceColumn}
                  onIonInput={(event) => setBalanceColumn(event.detail.value ?? "")}
                />
              </IonItem>
            </>
          ) : (
            <>
              {columnRoles.map((role, colIndex) => (
                <IonItem key={`account-col-role-${colIndex}`}>
                  <IonSelect
                    label={`Column ${colIndex + 1}`}
                    labelPlacement="stacked"
                    interface="action-sheet"
                    value={role}
                    onIonChange={(event) => {
                      const value = event.detail.value;
                      if (isBankCsvColumnRole(value)) {
                        setColumnRoles((current) => assignColumnRole(current, colIndex, value));
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
              ))}
              <IonItem
                button
                detail={false}
                onClick={() => setColumnRoles((current) => [...current, "ignore"])}
              >
                <IonLabel color="primary">Add Column</IonLabel>
              </IonItem>
              {columnRoles.length > 2 ? (
                <IonItem
                  button
                  detail={false}
                  onClick={() => setColumnRoles((current) => current.slice(0, -1))}
                >
                  <IonLabel color="medium">Remove Last Column</IonLabel>
                </IonItem>
              ) : null}
            </>
          )}
        </IonList>
      </IonContent>
    </IonModal>
  );
};

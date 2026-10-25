import { type ChangeEvent, useEffect, useMemo, useRef, useState } from "react";

import {
  IonBadge,
  IonButton,
  IonButtons,
  IonContent,
  IonHeader,
  IonItem,
  IonLabel,
  IonList,
  IonListHeader,
  IonModal,
  IonNote,
  IonSelect,
  IonSelectOption,
  IonTextarea,
  IonTitle,
  IonToggle,
  IonToolbar,
} from "@ionic/react";

import { DEFAULT_INVOICE_CURRENCY, formatCurrency } from "../../../invoices/schema.ts";
import type { BankAccountDocument } from "../../accounts/schema.ts";
import { bankTransactionTypeColor, bankTransactionTypeLabel } from "../../types.ts";
import { detectBankCsvPresetFromHeaders, parseBankStatementCsv, parseCsvMatrix } from "../csv.ts";
import {
  assignColumnRole,
  columnRolesFromPreset,
  DEFAULT_BANK_CSV_PRESET,
  normalizeBankCsvPreset,
  presetFromColumnRoles,
  type BankCsvColumnRole,
  type BankCsvPreset,
} from "../schema.ts";
import { CsvPresetFields } from "./CsvPresetFields.tsx";

export interface StatementImportValues {
  accountId: string;
  csvText: string;
  filename: string;
  presetOverride: BankCsvPreset;
  savePresetToAccount: boolean;
}

export interface StatementImportModalProps {
  isOpen: boolean;
  accounts: BankAccountDocument[];
  defaultAccountId?: string;
  onDismiss: () => void;
  onSubmit: (values: StatementImportValues) => Promise<void> | void;
}

export const StatementImportModal = ({
  isOpen,
  accounts,
  defaultAccountId,
  onDismiss,
  onSubmit,
}: StatementImportModalProps) => {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const wasOpenRef = useRef(false);
  const [accountId, setAccountId] = useState("");
  const [filename, setFilename] = useState("statement.csv");
  const [csvText, setCsvText] = useState("");
  const [preset, setPreset] = useState<BankCsvPreset>(DEFAULT_BANK_CSV_PRESET);
  const [extraColumnCount, setExtraColumnCount] = useState(4);
  const [savePresetToAccount, setSavePresetToAccount] = useState(true);
  const [isImporting, setIsImporting] = useState(false);

  useEffect(() => {
    if (!isOpen) {
      wasOpenRef.current = false;
      return;
    }
    if (wasOpenRef.current) {
      return;
    }
    wasOpenRef.current = true;
    const initialAccount =
      accounts.find((entry) => entry.id === defaultAccountId) ?? accounts[0] ?? null;
    const initialPreset = normalizeBankCsvPreset(initialAccount?.csvPreset);
    setAccountId(initialAccount?.id ?? "");
    setPreset(initialPreset);
    setExtraColumnCount(columnRolesFromPreset(initialPreset, 4).length);
    setFilename("statement.csv");
    setCsvText("");
    setSavePresetToAccount(true);
    setIsImporting(false);
  }, [isOpen, accounts, defaultAccountId]);

  const selectedAccount = accounts.find((entry) => entry.id === accountId);
  const currency = selectedAccount?.currency ?? DEFAULT_INVOICE_CURRENCY;

  const sampleRow = useMemo(() => {
    if (csvText.trim().length === 0) {
      return [] as string[];
    }
    try {
      const matrix = parseCsvMatrix(csvText);
      return matrix[0] ?? [];
    } catch {
      return [] as string[];
    }
  }, [csvText]);

  const columnRoles = useMemo(
    () => columnRolesFromPreset(preset, Math.max(sampleRow.length, extraColumnCount, 4)),
    [preset, sampleRow.length, extraColumnCount],
  );

  const handleToggleHasHeader = (nextHasHeader: boolean) => {
    if (nextHasHeader) {
      const base = normalizeBankCsvPreset({
        ...(preset.hasHeader ? preset : DEFAULT_BANK_CSV_PRESET),
        hasHeader: true,
      });
      if (sampleRow.length > 0) {
        setPreset(detectBankCsvPresetFromHeaders(sampleRow, base));
      } else {
        setPreset(base);
      }
    } else {
      const nextPreset = normalizeBankCsvPreset({ ...preset, hasHeader: false });
      setPreset(nextPreset);
      setExtraColumnCount(
        Math.max(sampleRow.length, columnRolesFromPreset(nextPreset, 4).length, 4),
      );
    }
  };

  const handleRoleChange = (colIndex: number, role: BankCsvColumnRole) => {
    const nextRoles = assignColumnRole(columnRoles, colIndex, role);
    setExtraColumnCount(nextRoles.length);
    setPreset(presetFromColumnRoles(nextRoles));
  };

  const handleAccountChange = (nextAccountId: string) => {
    setAccountId(nextAccountId);
    const nextAccount = accounts.find((entry) => entry.id === nextAccountId);
    if (nextAccount) {
      const basePreset = normalizeBankCsvPreset(nextAccount.csvPreset);
      if (csvText.trim().length > 0 && basePreset.hasHeader) {
        try {
          const matrix = parseCsvMatrix(csvText);
          if (matrix.length > 0) {
            setPreset(detectBankCsvPresetFromHeaders(matrix[0], basePreset));
            return;
          }
        } catch {
          // Fall back to account preset
        }
      }
      setPreset(basePreset);
      setExtraColumnCount(
        Math.max(sampleRow.length, columnRolesFromPreset(basePreset, 4).length, 4),
      );
    }
  };

  const applyCsvContent = (text: string, nextFilename?: string) => {
    setCsvText(text);
    if (nextFilename) {
      setFilename(nextFilename);
    }
    if (text.trim().length > 0 && preset.hasHeader) {
      try {
        const matrix = parseCsvMatrix(text);
        if (matrix.length > 0) {
          setPreset((current) => detectBankCsvPresetFromHeaders(matrix[0], current));
        }
      } catch {
        // Keep current preset when CSV is incomplete
      }
    }
  };

  const handleFileChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) {
      return;
    }
    const text = await file.text();
    applyCsvContent(text, file.name || "statement.csv");
  };

  const preview = useMemo(() => {
    if (csvText.trim().length === 0) {
      return { rows: [], headers: [], error: null as string | null };
    }
    try {
      const parsed = parseBankStatementCsv(csvText, preset);
      return { rows: parsed.rows, headers: parsed.headers, error: null as string | null };
    } catch (err) {
      return {
        rows: [],
        headers: [],
        error: err instanceof Error ? err.message : "Unable to parse CSV",
      };
    }
  }, [csvText, preset]);

  const isValid =
    accountId.trim().length > 0 &&
    csvText.trim().length > 0 &&
    preview.rows.length > 0 &&
    preview.error === null;

  const handleImport = async () => {
    if (!isValid || isImporting) {
      return;
    }
    setIsImporting(true);
    try {
      await onSubmit({
        accountId,
        csvText,
        filename: filename.trim() || "statement.csv",
        presetOverride: preset,
        savePresetToAccount,
      });
      onDismiss();
    } catch {
      // Parent handles reporting the error; keep modal open
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <IonModal isOpen={isOpen} onDidDismiss={onDismiss}>
      <IonHeader>
        <IonToolbar>
          <IonButtons slot="start">
            <IonButton onClick={onDismiss}>Cancel</IonButton>
          </IonButtons>
          <IonTitle>Import Statement CSV</IonTitle>
          <IonButtons slot="end">
            <IonButton
              strong
              disabled={!isValid || isImporting}
              onClick={() => {
                void handleImport();
              }}
            >
              Import
            </IonButton>
          </IonButtons>
        </IonToolbar>
      </IonHeader>
      <IonContent>
        <IonList inset>
          <IonListHeader>Account & File</IonListHeader>
          {accounts.length > 0 ? (
            <IonItem>
              <IonSelect
                label="Bank Account"
                labelPlacement="stacked"
                interface="action-sheet"
                value={accountId}
                onIonChange={(event) => {
                  const value = event.detail.value;
                  if (typeof value === "string") {
                    handleAccountChange(value);
                  }
                }}
              >
                {accounts.map((account) => (
                  <IonSelectOption key={account.id} value={account.id}>
                    {account.name} ({account.currency})
                  </IonSelectOption>
                ))}
              </IonSelect>
            </IonItem>
          ) : (
            <IonItem lines="none">
              <IonNote color="medium">Add a bank account first to import statements</IonNote>
            </IonItem>
          )}

          <IonItem
            button
            detail={false}
            onClick={() => {
              fileInputRef.current?.click();
            }}
          >
            <IonLabel color="primary">Choose CSV File…</IonLabel>
            <IonNote slot="end">{filename}</IonNote>
          </IonItem>

          <IonItem>
            <IonTextarea
              label="CSV Content"
              labelPlacement="stacked"
              rows={5}
              placeholder="Date,Description,Amount,Balance&#10;2026-10-24,Client Payment,1250.00,5250.00"
              value={csvText}
              onIonInput={(event) => applyCsvContent(event.detail.value ?? "")}
            />
          </IonItem>
        </IonList>

        <IonList inset>
          <IonListHeader>Column Mapping Preset</IonListHeader>
          <CsvPresetFields
            hasHeader={preset.hasHeader}
            onHasHeaderChange={handleToggleHasHeader}
            hasHeaderLabel="First row is header"
            preset={preset}
            onHeaderColumnChange={(field, value) =>
              setPreset((current) => ({ ...current, [field]: value }))
            }
            columnRoles={columnRoles}
            onColumnRoleChange={handleRoleChange}
            onAddColumn={() =>
              setExtraColumnCount((count) => Math.max(count, columnRoles.length) + 1)
            }
            sampleRow={sampleRow}
          />

          <IonItem>
            <IonToggle
              checked={savePresetToAccount}
              onIonChange={(event) => setSavePresetToAccount(event.detail.checked)}
            >
              Save preset to bank account
            </IonToggle>
          </IonItem>
        </IonList>

        <IonList inset>
          <IonListHeader>
            Preview ({preview.rows.length} {preview.rows.length === 1 ? "line" : "lines"})
          </IonListHeader>
          {preview.error ? (
            <IonItem lines="none">
              <IonNote color="danger">{preview.error}</IonNote>
            </IonItem>
          ) : preview.rows.length === 0 ? (
            <IonItem lines="none">
              <IonNote>Select or paste a CSV file to preview statement lines</IonNote>
            </IonItem>
          ) : (
            preview.rows.slice(0, 10).map((row, index) => (
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

        <input
          ref={fileInputRef}
          type="file"
          accept=".csv,text/csv,text/plain"
          style={{ display: "none" }}
          onChange={(event) => {
            void handleFileChange(event);
          }}
        />
      </IonContent>
    </IonModal>
  );
};

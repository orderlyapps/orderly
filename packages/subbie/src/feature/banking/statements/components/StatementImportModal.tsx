import { type ChangeEvent, useEffect, useMemo, useRef, useState } from "react";

import {
  IonButton,
  IonButtons,
  IonContent,
  IonHeader,
  IonModal,
  IonTitle,
  IonToolbar,
} from "@ionic/react";

import type { BankAccountDocument } from "../../accounts/schema.ts";
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
import { StatementImportAccountStep } from "./StatementImportAccountStep.tsx";
import { StatementImportFileStep } from "./StatementImportFileStep.tsx";
import { StatementImportMappingStep } from "./StatementImportMappingStep.tsx";

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
  const [step, setStep] = useState<1 | 2 | 3>(1);
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
    setStep(1);
    setAccountId(initialAccount?.id ?? "");
    setPreset(initialPreset);
    setExtraColumnCount(columnRolesFromPreset(initialPreset, 4).length);
    setFilename("statement.csv");
    setCsvText("");
    setSavePresetToAccount(true);
    setIsImporting(false);
  }, [isOpen, accounts, defaultAccountId]);

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

  const canAdvance = step === 1 ? accountId.trim().length > 0 : csvText.trim().length > 0;

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
            {step === 1 ? (
              <IonButton onClick={onDismiss}>Cancel</IonButton>
            ) : (
              <IonButton
                onClick={() => {
                  setStep((step - 1) as 1 | 2);
                }}
              >
                Back
              </IonButton>
            )}
          </IonButtons>
          <IonTitle>Import Statement CSV</IonTitle>
          <IonButtons slot="end">
            {step < 3 ? (
              <IonButton
                strong
                disabled={!canAdvance}
                onClick={() => {
                  setStep((step + 1) as 2 | 3);
                }}
              >
                Next
              </IonButton>
            ) : (
              <IonButton
                strong
                disabled={!isValid || isImporting}
                onClick={() => {
                  void handleImport();
                }}
              >
                Import
              </IonButton>
            )}
          </IonButtons>
        </IonToolbar>
      </IonHeader>
      <IonContent>
        {step === 1 ? (
          <StatementImportAccountStep
            accounts={accounts}
            accountId={accountId}
            onAccountChange={handleAccountChange}
          />
        ) : null}

        {step === 2 ? (
          <StatementImportFileStep
            filename={filename}
            csvText={csvText}
            onChooseFile={() => {
              fileInputRef.current?.click();
            }}
            onCsvTextChange={(text) => applyCsvContent(text)}
          />
        ) : null}

        {step === 3 ? (
          <StatementImportMappingStep
            preset={preset}
            columnRoles={columnRoles}
            sampleRow={sampleRow}
            savePresetToAccount={savePresetToAccount}
            previewRows={preview.rows}
            previewError={preview.error}
            onHasHeaderChange={handleToggleHasHeader}
            onHeaderColumnChange={(field, value) =>
              setPreset((current) => ({ ...current, [field]: value }))
            }
            onColumnRoleChange={handleRoleChange}
            onAddColumn={() =>
              setExtraColumnCount((count) => Math.max(count, columnRoles.length) + 1)
            }
            onSavePresetToAccountChange={setSavePresetToAccount}
          />
        ) : null}

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

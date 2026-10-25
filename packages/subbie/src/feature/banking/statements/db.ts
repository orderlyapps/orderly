import type { Collection } from "@tanstack/react-db";
import type { RxJsonSchema } from "rxdb/plugins/core";

import { generateDocumentId } from "../../invoices/schema.ts";
import type { BankAccountDocument, BankAccountPatch } from "../accounts/schema.ts";
import {
  normalizeBankStatementLineDocument,
  type BankStatementLineDocument,
} from "../lines/schema.ts";
import { parseBankStatementCsv } from "./csv.ts";
import {
  mergeBankCsvPreset,
  normalizeBankStatementDocument,
  type BankCsvPreset,
  type BankStatementDocument,
} from "./schema.ts";

export const BANK_STATEMENTS_COLLECTION_NAME = "bank_statements";

export const bankStatementJsonSchema: RxJsonSchema<BankStatementDocument> = {
  version: 0,
  primaryKey: "id",
  type: "object",
  properties: {
    id: { type: "string", maxLength: 128 },
    accountId: { type: "string", maxLength: 128 },
    filename: { type: "string" },
    importedAt: { type: "string" },
    lineCount: { type: "number" },
    startDate: { type: "string", maxLength: 10 },
    endDate: { type: "string", maxLength: 10 },
    createdAt: { type: "string" },
    updatedAt: { type: "string" },
  },
  required: ["id", "accountId", "filename", "importedAt", "lineCount", "createdAt", "updatedAt"],
};

export type BankStatementsCollection = Collection<BankStatementDocument, string>;

export interface ImportBankStatementCsvInput {
  accountId: string;
  csvText: string;
  filename?: string;
  presetOverride?: Partial<BankCsvPreset>;
  savePresetToAccount?: boolean;
}

export interface ImportBankStatementCsvResult {
  statement: BankStatementDocument;
  lines: BankStatementLineDocument[];
  account: BankAccountDocument;
}

export interface CreateBankStatementsActionsDeps {
  statementsCollection: BankStatementsCollection;
  linesCollection: Collection<BankStatementLineDocument, string>;
  getAccount: (id: string) => BankAccountDocument | undefined;
  updateAccount: (id: string, patch: BankAccountPatch) => Promise<BankAccountDocument>;
  allocateLineTimestampMs: (count?: number) => number;
}

export function createBankStatementsActions({
  statementsCollection,
  linesCollection,
  getAccount,
  updateAccount,
  allocateLineTimestampMs,
}: CreateBankStatementsActionsDeps) {
  function listStatements(accountId?: string): BankStatementDocument[] {
    return [...statementsCollection.values()]
      .map((doc) => normalizeBankStatementDocument(doc))
      .filter((doc) => (accountId ? doc.accountId === accountId : true))
      .sort((a, b) => (a.importedAt < b.importedAt ? 1 : a.importedAt > b.importedAt ? -1 : 0));
  }

  function getStatement(id: string): BankStatementDocument | undefined {
    const doc = statementsCollection.get(id);
    return doc ? normalizeBankStatementDocument(doc) : undefined;
  }

  async function deleteStatement(id: string): Promise<void> {
    if (!statementsCollection.has(id)) {
      throw new Error(`Bank statement not found: ${id}`);
    }
    const statementLines = [...linesCollection.values()].filter((line) => line.statementId === id);
    for (const line of statementLines) {
      const tx = linesCollection.delete(line.id);
      await tx.isPersisted.promise;
    }
    const tx = statementsCollection.delete(id);
    await tx.isPersisted.promise;
  }

  async function syncStatementMetadata(statementId: string): Promise<void> {
    if (!statementId || !statementsCollection.has(statementId)) {
      return;
    }
    const remainingLines = [...linesCollection.values()]
      .map((doc) => normalizeBankStatementLineDocument(doc))
      .filter((line) => line.statementId === statementId);

    if (remainingLines.length === 0) {
      const tx = statementsCollection.delete(statementId);
      await tx.isPersisted.promise;
      return;
    }

    const dates = remainingLines
      .map((line) => line.date)
      .filter((d) => d.length > 0)
      .sort();
    const startDate = dates[0] ?? "";
    const endDate = dates[dates.length - 1] ?? "";
    const tx = statementsCollection.update(statementId, (draft) => {
      draft.lineCount = remainingLines.length;
      draft.startDate = startDate;
      draft.endDate = endDate;
      draft.updatedAt = new Date().toISOString();
    });
    await tx.isPersisted.promise;
  }

  async function importStatementCsv(
    input: ImportBankStatementCsvInput,
  ): Promise<ImportBankStatementCsvResult> {
    let account = getAccount(input.accountId);
    if (!account) {
      throw new Error(`Bank account not found: ${input.accountId}`);
    }

    const effectivePreset = input.presetOverride
      ? mergeBankCsvPreset(account.csvPreset, input.presetOverride)
      : account.csvPreset;

    const parsed = parseBankStatementCsv(input.csvText, effectivePreset);

    if (input.savePresetToAccount) {
      account = await updateAccount(account.id, {
        csvPreset: parsed.detectedPreset,
      });
    }

    const dates = parsed.rows.map((row) => row.date).sort();
    const startDate = dates[0] ?? "";
    const endDate = dates[dates.length - 1] ?? "";
    const startMs = allocateLineTimestampMs(parsed.rows.length);
    const now = new Date(startMs).toISOString();

    const statement = normalizeBankStatementDocument({
      id: generateDocumentId(),
      accountId: account.id,
      filename: input.filename?.trim() || "statement.csv",
      importedAt: now,
      lineCount: parsed.rows.length,
      startDate,
      endDate,
      createdAt: now,
      updatedAt: now,
    });
    const stmtTx = statementsCollection.insert(statement);
    await stmtTx.isPersisted.promise;

    const createdLines: BankStatementLineDocument[] = [];
    for (let rowIndex = 0; rowIndex < parsed.rows.length; rowIndex++) {
      const row = parsed.rows[rowIndex];
      const lineTimestamp = new Date(startMs - rowIndex).toISOString();
      const lineDoc = normalizeBankStatementLineDocument({
        id: generateDocumentId(),
        statementId: statement.id,
        accountId: account.id,
        date: row.date,
        description: row.description,
        type: row.type,
        amountCents: row.amountCents,
        balanceCents: row.balanceCents,
        invoiceIds: [],
        allocations: [],
        notes: "",
        createdAt: lineTimestamp,
        updatedAt: lineTimestamp,
      });
      const lineTx = linesCollection.insert(lineDoc);
      await lineTx.isPersisted.promise;
      createdLines.push(lineDoc);
    }

    return {
      statement,
      lines: createdLines,
      account,
    };
  }

  async function importStatementCsvFile(
    file: Blob & { name?: string },
    accountId: string,
    fileOptions?: {
      presetOverride?: Partial<BankCsvPreset>;
      savePresetToAccount?: boolean;
    },
  ): Promise<ImportBankStatementCsvResult> {
    const csvText = await file.text();
    return importStatementCsv({
      accountId,
      csvText,
      filename:
        typeof file.name === "string" && file.name.trim() ? file.name.trim() : "statement.csv",
      presetOverride: fileOptions?.presetOverride,
      savePresetToAccount: fileOptions?.savePresetToAccount,
    });
  }

  return {
    listStatements,
    getStatement,
    deleteStatement,
    syncStatementMetadata,
    importStatementCsv,
    importStatementCsvFile,
  };
}

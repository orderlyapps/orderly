import type { Collection } from "@tanstack/react-db";
import type { RxJsonSchema } from "rxdb/plugins/core";

import { generateDocumentId } from "../../invoices/schema.ts";
import type { BankStatementLineDocument } from "../lines/schema.ts";
import {
  mergeBankCsvPreset,
  normalizeBankCsvPreset,
  type BankStatementDocument,
} from "../statements/schema.ts";
import {
  isBankAccountDocument,
  normalizeBankAccountDocument,
  validateBankAccountInput,
  type BankAccountDocument,
  type BankAccountPatch,
  type CreateBankAccountInput,
} from "./schema.ts";

export const BANK_ACCOUNTS_COLLECTION_NAME = "bank_accounts";

export const bankAccountJsonSchema: RxJsonSchema<BankAccountDocument> = {
  version: 1,
  primaryKey: "id",
  type: "object",
  properties: {
    id: { type: "string", maxLength: 128 },
    name: { type: "string" },
    institution: { type: "string" },
    accountNumber: { type: "string" },
    csvPreset: {
      type: "object",
      properties: {
        hasHeader: { type: "boolean" },
        dateColumn: { type: "string" },
        descriptionColumn: { type: "string" },
        amountColumn: { type: "string" },
        debitColumn: { type: "string" },
        creditColumn: { type: "string" },
        balanceColumn: { type: "string" },
      },
      required: [
        "hasHeader",
        "dateColumn",
        "descriptionColumn",
        "amountColumn",
        "debitColumn",
        "creditColumn",
        "balanceColumn",
      ],
    },
    notes: { type: "string" },
    createdAt: { type: "string" },
    updatedAt: { type: "string" },
  },
  required: ["id", "name", "csvPreset", "createdAt", "updatedAt"],
};

export type BankAccountsCollection = Collection<BankAccountDocument, string>;

export interface CreateBankAccountsActionsDeps {
  accountsCollection: BankAccountsCollection;
  statementsCollection: Collection<BankStatementDocument, string>;
  linesCollection: Collection<BankStatementLineDocument, string>;
}

const byName = (a: { name: string }, b: { name: string }) => a.name.localeCompare(b.name);

export function createBankAccountsActions({
  accountsCollection,
  statementsCollection,
  linesCollection,
}: CreateBankAccountsActionsDeps) {
  function listAccounts(): BankAccountDocument[] {
    return [...accountsCollection.values()]
      .map((doc) => normalizeBankAccountDocument(doc))
      .sort(byName);
  }

  function getAccount(id: string): BankAccountDocument | undefined {
    const doc = accountsCollection.get(id);
    return doc ? normalizeBankAccountDocument(doc) : undefined;
  }

  async function createAccount(input: CreateBankAccountInput): Promise<BankAccountDocument> {
    const validated = validateBankAccountInput(input);
    const now = new Date().toISOString();
    const doc = normalizeBankAccountDocument({
      id: generateDocumentId(),
      name: validated.name.trim(),
      institution: validated.institution?.trim() ?? "",
      accountNumber: validated.accountNumber?.trim() ?? "",
      csvPreset: normalizeBankCsvPreset(validated.csvPreset),
      notes: validated.notes ?? "",
      createdAt: now,
      updatedAt: now,
    });
    const tx = accountsCollection.insert(doc);
    await tx.isPersisted.promise;
    return doc;
  }

  async function updateAccount(id: string, patch: BankAccountPatch): Promise<BankAccountDocument> {
    const current = getAccount(id);
    if (!current) {
      throw new Error(`Bank account not found: ${id}`);
    }
    const mergedPreset =
      patch.csvPreset !== undefined
        ? mergeBankCsvPreset(current.csvPreset, patch.csvPreset)
        : current.csvPreset;
    const candidate = {
      ...current,
      ...patch,
      id,
      csvPreset: mergedPreset,
    };
    if (!isBankAccountDocument(candidate)) {
      throw new Error("Invalid bank account update");
    }
    const next = normalizeBankAccountDocument(candidate);
    const tx = accountsCollection.update(id, (draft) => {
      Object.assign(draft, next, { updatedAt: new Date().toISOString() });
    });
    await tx.isPersisted.promise;
    return getAccount(id) ?? next;
  }

  async function deleteAccount(id: string): Promise<void> {
    if (!accountsCollection.has(id)) {
      throw new Error(`Bank account not found: ${id}`);
    }
    const accountLines = [...linesCollection.values()].filter((line) => line.accountId === id);
    for (const line of accountLines) {
      const tx = linesCollection.delete(line.id);
      await tx.isPersisted.promise;
    }
    const accountStatements = [...statementsCollection.values()].filter(
      (stmt) => stmt.accountId === id,
    );
    for (const stmt of accountStatements) {
      const tx = statementsCollection.delete(stmt.id);
      await tx.isPersisted.promise;
    }
    const tx = accountsCollection.delete(id);
    await tx.isPersisted.promise;
  }

  return {
    listAccounts,
    getAccount,
    createAccount,
    updateAccount,
    deleteAccount,
  };
}

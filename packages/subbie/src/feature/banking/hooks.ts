import { useEffect, useState } from "react";

import {
  getBankingStore,
  type BankingStore,
  type ImportBankStatementCsvInput,
  type ImportBankStatementCsvResult,
  type LinkInvoicesOptions,
} from "./db.ts";
import type {
  BankAccountDocument,
  BankAccountPatch,
  BankCategoryDocument,
  BankCategoryPatch,
  BankCsvPreset,
  BankLineAllocationInput,
  BankStatementDocument,
  BankStatementLineDocument,
  BankStatementLinePatch,
  CreateBankAccountInput,
  CreateBankCategoryInput,
  CreateBankStatementLineInput,
} from "./schema.ts";

export interface UseBankingResult {
  accounts: BankAccountDocument[];
  categories: BankCategoryDocument[];
  statements: BankStatementDocument[];
  statementLines: BankStatementLineDocument[];
  isLoading: boolean;
  error: Error | null;
  createAccount: (input: CreateBankAccountInput) => Promise<BankAccountDocument>;
  updateAccount: (id: string, patch: BankAccountPatch) => Promise<BankAccountDocument>;
  deleteAccount: (id: string) => Promise<void>;
  createCategory: (input: CreateBankCategoryInput) => Promise<BankCategoryDocument>;
  updateCategory: (id: string, patch: BankCategoryPatch) => Promise<BankCategoryDocument>;
  deleteCategory: (id: string) => Promise<void>;
  deleteStatement: (id: string) => Promise<void>;
  createStatementLine: (input: CreateBankStatementLineInput) => Promise<BankStatementLineDocument>;
  updateStatementLine: (
    id: string,
    patch: BankStatementLinePatch,
  ) => Promise<BankStatementLineDocument>;
  deleteStatementLine: (id: string) => Promise<void>;
  linkInvoicesToLine: (
    lineId: string,
    invoiceIds: readonly string[],
    options?: LinkInvoicesOptions,
  ) => Promise<BankStatementLineDocument>;
  linkInvoiceToLine: (
    lineId: string,
    invoiceId: string,
    options?: LinkInvoicesOptions,
  ) => Promise<BankStatementLineDocument>;
  unlinkInvoiceFromLine: (lineId: string, invoiceId: string) => Promise<BankStatementLineDocument>;
  allocateLineToCategory: (
    lineId: string,
    categoryId: string,
    notes?: string,
  ) => Promise<BankStatementLineDocument>;
  setLineAllocations: (
    lineId: string,
    allocations: readonly BankLineAllocationInput[],
  ) => Promise<BankStatementLineDocument>;
  clearLineAllocations: (lineId: string) => Promise<BankStatementLineDocument>;
  importStatementCsv: (input: ImportBankStatementCsvInput) => Promise<ImportBankStatementCsvResult>;
  importStatementCsvFile: (
    file: Blob & { name?: string },
    accountId: string,
    options?: {
      presetOverride?: Partial<BankCsvPreset>;
      savePresetToAccount?: boolean;
    },
  ) => Promise<ImportBankStatementCsvResult>;
  store: BankingStore | null;
}

export function useBanking(customStore?: BankingStore): UseBankingResult {
  const [store, setStore] = useState<BankingStore | null>(customStore ?? null);
  const [accounts, setAccounts] = useState<BankAccountDocument[]>(() =>
    customStore ? customStore.listAccounts() : [],
  );
  const [categories, setCategories] = useState<BankCategoryDocument[]>(() =>
    customStore ? customStore.listCategories() : [],
  );
  const [statements, setStatements] = useState<BankStatementDocument[]>(() =>
    customStore ? customStore.listStatements() : [],
  );
  const [statementLines, setStatementLines] = useState<BankStatementLineDocument[]>(() =>
    customStore ? customStore.listStatementLines() : [],
  );
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    let active = true;
    const unsubscribes: Array<() => void> = [];
    setIsLoading(true);
    setError(null);

    const init = async () => {
      const resolvedStore = customStore ?? (await getBankingStore());
      if (!active) {
        return;
      }
      setStore(resolvedStore);

      const accountsSub = resolvedStore.accountsCollection.subscribeChanges(() => {
        if (active) {
          setAccounts(resolvedStore.listAccounts());
        }
      });
      const categoriesSub = resolvedStore.categoriesCollection.subscribeChanges(() => {
        if (active) {
          setCategories(resolvedStore.listCategories());
        }
      });
      const statementsSub = resolvedStore.statementsCollection.subscribeChanges(() => {
        if (active) {
          setStatements(resolvedStore.listStatements());
        }
      });
      const linesSub = resolvedStore.linesCollection.subscribeChanges(() => {
        if (active) {
          setStatementLines(resolvedStore.listStatementLines());
        }
      });

      unsubscribes.push(
        () => accountsSub.unsubscribe(),
        () => categoriesSub.unsubscribe(),
        () => statementsSub.unsubscribe(),
        () => linesSub.unsubscribe(),
      );

      if (!active) {
        return;
      }
      setAccounts(resolvedStore.listAccounts());
      setCategories(resolvedStore.listCategories());
      setStatements(resolvedStore.listStatements());
      setStatementLines(resolvedStore.listStatementLines());
      setIsLoading(false);
    };

    init().catch((err: unknown) => {
      if (!active) {
        return;
      }
      setError(err instanceof Error ? err : new Error(String(err)));
      setIsLoading(false);
    });

    return () => {
      active = false;
      for (const unsub of unsubscribes) {
        unsub();
      }
    };
  }, [customStore]);

  const resolveStore = async (): Promise<BankingStore> =>
    customStore ?? store ?? (await getBankingStore());

  return {
    accounts,
    categories,
    statements,
    statementLines,
    isLoading,
    error,
    createAccount: async (input) => (await resolveStore()).createAccount(input),
    updateAccount: async (id, patch) => (await resolveStore()).updateAccount(id, patch),
    deleteAccount: async (id) => (await resolveStore()).deleteAccount(id),
    createCategory: async (input) => (await resolveStore()).createCategory(input),
    updateCategory: async (id, patch) => (await resolveStore()).updateCategory(id, patch),
    deleteCategory: async (id) => (await resolveStore()).deleteCategory(id),
    deleteStatement: async (id) => (await resolveStore()).deleteStatement(id),
    createStatementLine: async (input) => (await resolveStore()).createStatementLine(input),
    updateStatementLine: async (id, patch) => (await resolveStore()).updateStatementLine(id, patch),
    deleteStatementLine: async (id) => (await resolveStore()).deleteStatementLine(id),
    linkInvoicesToLine: async (lineId, invoiceIds, options) =>
      (await resolveStore()).linkInvoicesToLine(lineId, invoiceIds, options),
    linkInvoiceToLine: async (lineId, invoiceId, options) =>
      (await resolveStore()).linkInvoiceToLine(lineId, invoiceId, options),
    unlinkInvoiceFromLine: async (lineId, invoiceId) =>
      (await resolveStore()).unlinkInvoiceFromLine(lineId, invoiceId),
    allocateLineToCategory: async (lineId, categoryId, notes) =>
      (await resolveStore()).allocateLineToCategory(lineId, categoryId, notes),
    setLineAllocations: async (lineId, allocations) =>
      (await resolveStore()).setLineAllocations(lineId, allocations),
    clearLineAllocations: async (lineId) => (await resolveStore()).clearLineAllocations(lineId),
    importStatementCsv: async (input) => (await resolveStore()).importStatementCsv(input),
    importStatementCsvFile: async (file, accountId, options) =>
      (await resolveStore()).importStatementCsvFile(file, accountId, options),
    store,
  };
}

import { useEffect, useState } from "react";

import type {
  BankAccountDocument,
  BankAccountPatch,
  CreateBankAccountInput,
} from "./accounts/schema.ts";
import type {
  BankCategoryDocument,
  BankCategoryPatch,
  CreateBankCategoryInput,
} from "./categories/schema.ts";
import {
  getBankingStore,
  type AllocateLineToCategoryOptions,
  type BankingStore,
  type ImportBankStatementCsvInput,
  type ImportBankStatementCsvResult,
  type LinkInvoicesOptions,
} from "./db.ts";
import type { BankLineAllocationInput } from "./lines/gst.ts";
import type {
  BankStatementLineDocument,
  BankStatementLinePatch,
  CreateBankStatementLineInput,
} from "./lines/schema.ts";
import type { BankCsvPreset, BankStatementDocument } from "./statements/schema.ts";

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
    notesOrOptions?: string | AllocateLineToCategoryOptions,
  ) => Promise<BankStatementLineDocument>;
  allocateLinesToCategory: (
    lineIds: readonly string[],
    categoryId: string,
    notesOrOptions?: string | AllocateLineToCategoryOptions,
  ) => Promise<BankStatementLineDocument[]>;
  setLineAllocations: (
    lineId: string,
    allocations: readonly BankLineAllocationInput[],
  ) => Promise<BankStatementLineDocument>;
  clearLineAllocations: (lineId: string) => Promise<BankStatementLineDocument>;
  clearLinesAllocations: (lineIds: readonly string[]) => Promise<BankStatementLineDocument[]>;
  setLinePrivate: (lineId: string, isPrivate: boolean) => Promise<BankStatementLineDocument>;
  setLinesPrivate: (
    lineIds: readonly string[],
    isPrivate: boolean,
  ) => Promise<BankStatementLineDocument[]>;
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

      const accountsSub = resolvedStore.accountsCollection.subscribeChanges(
        () => {
          if (active) {
            setAccounts(resolvedStore.listAccounts());
          }
        },
        { includeInitialState: true },
      );
      const categoriesSub = resolvedStore.categoriesCollection.subscribeChanges(
        () => {
          if (active) {
            setCategories(resolvedStore.listCategories());
          }
        },
        { includeInitialState: true },
      );
      const statementsSub = resolvedStore.statementsCollection.subscribeChanges(
        () => {
          if (active) {
            setStatements(resolvedStore.listStatements());
          }
        },
        { includeInitialState: true },
      );
      const linesSub = resolvedStore.linesCollection.subscribeChanges(
        () => {
          if (active) {
            setStatementLines(resolvedStore.listStatementLines());
          }
        },
        { includeInitialState: true },
      );

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
    allocateLineToCategory: async (lineId, categoryId, notesOrOptions) =>
      (await resolveStore()).allocateLineToCategory(lineId, categoryId, notesOrOptions),
    allocateLinesToCategory: async (lineIds, categoryId, notesOrOptions) =>
      (await resolveStore()).allocateLinesToCategory(lineIds, categoryId, notesOrOptions),
    setLineAllocations: async (lineId, allocations) =>
      (await resolveStore()).setLineAllocations(lineId, allocations),
    clearLineAllocations: async (lineId) => (await resolveStore()).clearLineAllocations(lineId),
    clearLinesAllocations: async (lineIds) => (await resolveStore()).clearLinesAllocations(lineIds),
    setLinePrivate: async (lineId, isPrivate) =>
      (await resolveStore()).setLinePrivate(lineId, isPrivate),
    setLinesPrivate: async (lineIds, isPrivate) =>
      (await resolveStore()).setLinesPrivate(lineIds, isPrivate),
    importStatementCsv: async (input) => (await resolveStore()).importStatementCsv(input),
    importStatementCsvFile: async (file, accountId, options) =>
      (await resolveStore()).importStatementCsvFile(file, accountId, options),
    store,
  };
}

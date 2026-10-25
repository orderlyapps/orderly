import { createCollection, type Collection } from "@tanstack/react-db";
import { rxdbCollectionOptions } from "@tanstack/rxdb-db-collection";
import {
  createRxDatabase,
  type RxCollection,
  type RxDatabase,
  type RxJsonSchema,
  type RxStorage,
} from "rxdb/plugins/core";

import { getDefaultInvoicesStorage, getInvoicesStore, type InvoicesStore } from "../invoices/db.ts";
import { generateDocumentId } from "../invoices/schema.ts";
import { parseBankStatementCsv } from "./csv.ts";
import {
  DEFAULT_BANK_CATEGORIES,
  isBankAccountDocument,
  isBankCategoryDocument,
  isBankStatementLineDocument,
  mergeBankCsvPreset,
  normalizeBankAccountDocument,
  normalizeBankCategoryDocument,
  normalizeBankCsvPreset,
  normalizeBankLineAllocation,
  normalizeBankStatementDocument,
  normalizeBankStatementLineDocument,
  validateBankAccountInput,
  validateBankCategoryInput,
  validateBankStatementLineInput,
  type BankAccountDocument,
  type BankAccountPatch,
  type BankCategoryDocument,
  type BankCategoryPatch,
  type BankCsvPreset,
  type BankLineAllocationInput,
  type BankStatementDocument,
  type BankStatementLineDocument,
  type BankStatementLinePatch,
  type BankTransactionType,
  type CreateBankAccountInput,
  type CreateBankCategoryInput,
  type CreateBankStatementLineInput,
} from "./schema.ts";

export const BANKING_DATABASE_NAME = "subbie-banking";

export const BANK_ACCOUNTS_COLLECTION_NAME = "bank_accounts";
export const BANK_CATEGORIES_COLLECTION_NAME = "bank_categories";
export const BANK_STATEMENTS_COLLECTION_NAME = "bank_statements";
export const BANK_STATEMENT_LINES_COLLECTION_NAME = "bank_statement_lines";

export const bankAccountJsonSchema: RxJsonSchema<BankAccountDocument> = {
  version: 0,
  primaryKey: "id",
  type: "object",
  properties: {
    id: { type: "string", maxLength: 128 },
    name: { type: "string" },
    institution: { type: "string" },
    accountNumber: { type: "string" },
    currency: { type: "string", maxLength: 3 },
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
  required: ["id", "name", "currency", "csvPreset", "createdAt", "updatedAt"],
};

export const bankCategoryJsonSchema: RxJsonSchema<BankCategoryDocument> = {
  version: 0,
  primaryKey: "id",
  type: "object",
  properties: {
    id: { type: "string", maxLength: 128 },
    name: { type: "string" },
    type: { type: "string", maxLength: 16 },
    description: { type: "string" },
    isDefault: { type: "boolean" },
    createdAt: { type: "string" },
    updatedAt: { type: "string" },
  },
  required: ["id", "name", "type", "isDefault", "createdAt", "updatedAt"],
};

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

export const bankStatementLineJsonSchema: RxJsonSchema<BankStatementLineDocument> = {
  version: 0,
  primaryKey: "id",
  type: "object",
  properties: {
    id: { type: "string", maxLength: 128 },
    statementId: { type: "string", maxLength: 128 },
    accountId: { type: "string", maxLength: 128 },
    date: { type: "string", maxLength: 10 },
    description: { type: "string" },
    type: { type: "string", maxLength: 16 },
    amountCents: { type: "number" },
    balanceCents: { type: "number" },
    invoiceIds: {
      type: "array",
      items: { type: "string", maxLength: 128 },
    },
    allocations: {
      type: "array",
      items: {
        type: "object",
        properties: {
          id: { type: "string", maxLength: 128 },
          categoryId: { type: "string", maxLength: 128 },
          amountCents: { type: "number" },
          notes: { type: "string" },
        },
        required: ["id", "categoryId", "amountCents"],
      },
    },
    notes: { type: "string" },
    createdAt: { type: "string" },
    updatedAt: { type: "string" },
  },
  required: [
    "id",
    "statementId",
    "accountId",
    "date",
    "description",
    "type",
    "amountCents",
    "invoiceIds",
    "allocations",
    "createdAt",
    "updatedAt",
  ],
};

export type BankAccountsCollection = Collection<BankAccountDocument, string>;
export type BankCategoriesCollection = Collection<BankCategoryDocument, string>;
export type BankStatementsCollection = Collection<BankStatementDocument, string>;
export type BankStatementLinesCollection = Collection<BankStatementLineDocument, string>;

export interface CreateBankingStoreOptions {
  name?: string;
  storage?: RxStorage<unknown, unknown>;
  multiInstance?: boolean;
  seedDefaultCategories?: boolean;
  invoicesStore?: InvoicesStore;
}

export interface ListStatementLinesFilter {
  accountId?: string;
  statementId?: string;
  type?: BankTransactionType;
}

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

export interface LinkInvoicesOptions {
  invoicesStore?: InvoicesStore;
}

function sanitizeDatabaseName(name: string): string {
  const sanitized = name.toLowerCase().replace(/[^a-z0-9_$-]/g, "");
  return sanitized.length > 0 ? sanitized : BANKING_DATABASE_NAME;
}

export const getDefaultBankingStorage = getDefaultInvoicesStorage;

export async function createBankingStore(options: CreateBankingStoreOptions = {}) {
  const databaseName = sanitizeDatabaseName(options.name ?? BANKING_DATABASE_NAME);
  const storage = options.storage ?? getDefaultBankingStorage();
  const seedDefaultCategories = options.seedDefaultCategories ?? true;

  const database: RxDatabase = await createRxDatabase({
    name: databaseName,
    storage,
    multiInstance: options.multiInstance ?? false,
  });

  try {
    await database.addCollections({
      [BANK_ACCOUNTS_COLLECTION_NAME]: { schema: bankAccountJsonSchema },
      [BANK_CATEGORIES_COLLECTION_NAME]: { schema: bankCategoryJsonSchema },
      [BANK_STATEMENTS_COLLECTION_NAME]: { schema: bankStatementJsonSchema },
      [BANK_STATEMENT_LINES_COLLECTION_NAME]: { schema: bankStatementLineJsonSchema },
    });
  } catch (error) {
    await database.close().catch(() => {});
    throw error;
  }

  const accountsRxCollection = database.collections[
    BANK_ACCOUNTS_COLLECTION_NAME
  ] as RxCollection<BankAccountDocument>;
  const categoriesRxCollection = database.collections[
    BANK_CATEGORIES_COLLECTION_NAME
  ] as RxCollection<BankCategoryDocument>;
  const statementsRxCollection = database.collections[
    BANK_STATEMENTS_COLLECTION_NAME
  ] as RxCollection<BankStatementDocument>;
  const linesRxCollection = database.collections[
    BANK_STATEMENT_LINES_COLLECTION_NAME
  ] as RxCollection<BankStatementLineDocument>;

  const accountsCollection = createCollection(
    rxdbCollectionOptions<BankAccountDocument>({
      id: `${databaseName}-${BANK_ACCOUNTS_COLLECTION_NAME}`,
      rxCollection: accountsRxCollection,
      startSync: true,
    }),
  );
  const categoriesCollection = createCollection(
    rxdbCollectionOptions<BankCategoryDocument>({
      id: `${databaseName}-${BANK_CATEGORIES_COLLECTION_NAME}`,
      rxCollection: categoriesRxCollection,
      startSync: true,
    }),
  );
  const statementsCollection = createCollection(
    rxdbCollectionOptions<BankStatementDocument>({
      id: `${databaseName}-${BANK_STATEMENTS_COLLECTION_NAME}`,
      rxCollection: statementsRxCollection,
      startSync: true,
    }),
  );
  const linesCollection = createCollection(
    rxdbCollectionOptions<BankStatementLineDocument>({
      id: `${databaseName}-${BANK_STATEMENT_LINES_COLLECTION_NAME}`,
      rxCollection: linesRxCollection,
      startSync: true,
    }),
  );

  await Promise.all([
    accountsCollection.preload(),
    categoriesCollection.preload(),
    statementsCollection.preload(),
    linesCollection.preload(),
  ]);

  if (seedDefaultCategories && categoriesCollection.size === 0) {
    const now = new Date().toISOString();
    for (const seed of DEFAULT_BANK_CATEGORIES) {
      const doc = normalizeBankCategoryDocument({
        id: seed.id,
        name: seed.name,
        type: seed.type,
        description: seed.description,
        isDefault: true,
        createdAt: now,
        updatedAt: now,
      });
      const tx = categoriesCollection.insert(doc);
      await tx.isPersisted.promise;
    }
  }

  const byName = (a: { name: string }, b: { name: string }) => a.name.localeCompare(b.name);

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
      currency: validated.currency,
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

  function listCategories(type?: BankTransactionType): BankCategoryDocument[] {
    return [...categoriesCollection.values()]
      .map((doc) => normalizeBankCategoryDocument(doc))
      .filter((doc) => (type ? doc.type === type : true))
      .sort(byName);
  }

  function getCategory(id: string): BankCategoryDocument | undefined {
    const doc = categoriesCollection.get(id);
    return doc ? normalizeBankCategoryDocument(doc) : undefined;
  }

  async function createCategory(input: CreateBankCategoryInput): Promise<BankCategoryDocument> {
    const validated = validateBankCategoryInput(input);
    const now = new Date().toISOString();
    const doc = normalizeBankCategoryDocument({
      id: generateDocumentId(),
      name: validated.name.trim(),
      type: validated.type,
      description: validated.description?.trim() ?? "",
      isDefault: validated.isDefault ?? false,
      createdAt: now,
      updatedAt: now,
    });
    const tx = categoriesCollection.insert(doc);
    await tx.isPersisted.promise;
    return doc;
  }

  async function updateCategory(
    id: string,
    patch: BankCategoryPatch,
  ): Promise<BankCategoryDocument> {
    const current = getCategory(id);
    if (!current) {
      throw new Error(`Bank category not found: ${id}`);
    }
    const candidate = { ...current, ...patch, id };
    if (!isBankCategoryDocument(candidate)) {
      throw new Error("Invalid bank category update");
    }
    const next = normalizeBankCategoryDocument(candidate);
    if (next.type !== current.type) {
      const incompatibleLines = [...linesCollection.values()].filter(
        (line) =>
          line.type !== next.type &&
          line.allocations.some((allocation) => allocation.categoryId === id),
      );
      for (const line of incompatibleLines) {
        const remaining = line.allocations.filter((allocation) => allocation.categoryId !== id);
        const lineTx = linesCollection.update(line.id, (draft) => {
          draft.allocations = remaining;
          draft.updatedAt = new Date().toISOString();
        });
        await lineTx.isPersisted.promise;
      }
    }
    const tx = categoriesCollection.update(id, (draft) => {
      Object.assign(draft, next, { updatedAt: new Date().toISOString() });
    });
    await tx.isPersisted.promise;
    return getCategory(id) ?? next;
  }

  async function deleteCategory(id: string): Promise<void> {
    if (!categoriesCollection.has(id)) {
      throw new Error(`Bank category not found: ${id}`);
    }
    const affectedLines = [...linesCollection.values()].filter((line) =>
      line.allocations.some((allocation) => allocation.categoryId === id),
    );
    for (const line of affectedLines) {
      const remaining = line.allocations.filter((allocation) => allocation.categoryId !== id);
      const tx = linesCollection.update(line.id, (draft) => {
        draft.allocations = remaining;
        draft.updatedAt = new Date().toISOString();
      });
      await tx.isPersisted.promise;
    }
    const tx = categoriesCollection.delete(id);
    await tx.isPersisted.promise;
  }

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

  let lastLineTimestampMs = 0;

  function allocateLineTimestampMs(count = 1): number {
    const startMs = Math.max(Date.now(), lastLineTimestampMs + count);
    lastLineTimestampMs = startMs;
    return startMs;
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

  function listStatementLines(filter?: ListStatementLinesFilter): BankStatementLineDocument[] {
    return [...linesCollection.values()]
      .map((doc) => normalizeBankStatementLineDocument(doc))
      .filter((doc) => {
        if (filter?.accountId && doc.accountId !== filter.accountId) {
          return false;
        }
        if (filter?.statementId && doc.statementId !== filter.statementId) {
          return false;
        }
        if (filter?.type && doc.type !== filter.type) {
          return false;
        }
        return true;
      })
      .sort((a, b) => {
        if (a.date !== b.date) {
          return a.date < b.date ? 1 : -1;
        }
        if (a.createdAt !== b.createdAt) {
          return a.createdAt < b.createdAt ? 1 : -1;
        }
        return a.id.localeCompare(b.id);
      });
  }

  function getStatementLine(id: string): BankStatementLineDocument | undefined {
    const doc = linesCollection.get(id);
    return doc ? normalizeBankStatementLineDocument(doc) : undefined;
  }

  function validateAllocationsAgainstCategories(
    lineType: BankTransactionType,
    lineAmountCents: number,
    allocations: readonly BankLineAllocationInput[],
  ) {
    let total = 0;
    for (const entry of allocations) {
      if (!Number.isInteger(entry.amountCents) || entry.amountCents < 0) {
        throw new Error("Invalid allocation: amount must be a non-negative integer");
      }
      const category = getCategory(entry.categoryId);
      if (!category) {
        throw new Error(`Bank category not found: ${entry.categoryId}`);
      }
      if (category.type !== lineType) {
        throw new Error(
          `Category "${category.name}" is for ${category.type}s and cannot be allocated to a ${lineType} line`,
        );
      }
      total += entry.amountCents;
    }
    if (total > lineAmountCents) {
      throw new Error("Invalid allocation: allocated total exceeds statement line amount");
    }
  }

  async function createStatementLine(
    input: CreateBankStatementLineInput,
  ): Promise<BankStatementLineDocument> {
    const validated = validateBankStatementLineInput(input);
    if (!accountsCollection.has(validated.accountId)) {
      throw new Error(`Bank account not found: ${validated.accountId}`);
    }
    if (validated.allocations && validated.allocations.length > 0) {
      validateAllocationsAgainstCategories(
        validated.type,
        validated.amountCents,
        validated.allocations,
      );
    }
    const now = new Date(allocateLineTimestampMs(1)).toISOString();
    const doc = normalizeBankStatementLineDocument({
      id: generateDocumentId(),
      statementId: validated.statementId ?? "",
      accountId: validated.accountId,
      date: validated.date,
      description: validated.description.trim(),
      type: validated.type,
      amountCents: validated.amountCents,
      balanceCents: validated.balanceCents,
      invoiceIds: validated.invoiceIds ?? [],
      allocations: (validated.allocations ?? []).map((entry) => normalizeBankLineAllocation(entry)),
      notes: validated.notes ?? "",
      createdAt: now,
      updatedAt: now,
    });
    const tx = linesCollection.insert(doc);
    await tx.isPersisted.promise;
    if (doc.statementId) {
      await syncStatementMetadata(doc.statementId);
    }
    return doc;
  }

  async function updateStatementLine(
    id: string,
    patch: BankStatementLinePatch,
  ): Promise<BankStatementLineDocument> {
    const current = getStatementLine(id);
    if (!current) {
      throw new Error(`Bank statement line not found: ${id}`);
    }
    if (patch.accountId !== undefined && !accountsCollection.has(patch.accountId)) {
      throw new Error(`Bank account not found: ${patch.accountId}`);
    }
    const nextType = patch.type ?? current.type;
    const nextAmountCents = patch.amountCents ?? current.amountCents;
    const nextAllocationsInput = patch.allocations ?? current.allocations;

    validateAllocationsAgainstCategories(nextType, nextAmountCents, nextAllocationsInput);

    const normalizedAllocations = nextAllocationsInput.map((entry) =>
      normalizeBankLineAllocation(entry),
    );
    const candidate: BankStatementLineDocument = {
      ...current,
      ...patch,
      id,
      allocations: normalizedAllocations,
    };
    if (!isBankStatementLineDocument(candidate)) {
      throw new Error("Invalid bank statement line update");
    }
    const next = normalizeBankStatementLineDocument(candidate);
    const tx = linesCollection.update(id, (draft) => {
      Object.assign(draft, next, { updatedAt: new Date().toISOString() });
      if (next.balanceCents === undefined) {
        delete draft.balanceCents;
      }
    });
    await tx.isPersisted.promise;
    if (patch.date !== undefined || patch.statementId !== undefined) {
      if (current.statementId) {
        await syncStatementMetadata(current.statementId);
      }
      if (next.statementId && next.statementId !== current.statementId) {
        await syncStatementMetadata(next.statementId);
      }
    }
    return getStatementLine(id) ?? next;
  }

  async function deleteStatementLine(id: string): Promise<void> {
    const existing = getStatementLine(id);
    if (!existing) {
      throw new Error(`Bank statement line not found: ${id}`);
    }
    const tx = linesCollection.delete(id);
    await tx.isPersisted.promise;
    if (existing.statementId) {
      await syncStatementMetadata(existing.statementId);
    }
  }

  async function markInvoicesAsPaid(
    invoiceIds: readonly string[],
    linkOptions?: LinkInvoicesOptions,
  ): Promise<void> {
    if (invoiceIds.length === 0) {
      return;
    }
    const resolvedInvoicesStore =
      linkOptions?.invoicesStore ?? options.invoicesStore ?? (await getInvoicesStore());
    for (const invoiceId of invoiceIds) {
      const invoice = resolvedInvoicesStore.getInvoice(invoiceId);
      if (invoice && invoice.status !== "paid") {
        await resolvedInvoicesStore.setInvoiceStatus(invoiceId, "paid");
      }
    }
  }

  async function linkInvoicesToLine(
    lineId: string,
    invoiceIds: readonly string[],
    linkOptions?: LinkInvoicesOptions,
  ): Promise<BankStatementLineDocument> {
    const current = getStatementLine(lineId);
    if (!current) {
      throw new Error(`Bank statement line not found: ${lineId}`);
    }
    const deduplicated = Array.from(
      new Set(invoiceIds.map((id) => id.trim()).filter((id) => id.length > 0)),
    );
    const newlyLinkedIds = deduplicated.filter((id) => !current.invoiceIds.includes(id));
    const updated = await updateStatementLine(lineId, { invoiceIds: deduplicated });
    await markInvoicesAsPaid(newlyLinkedIds, linkOptions);
    return updated;
  }

  async function linkInvoiceToLine(
    lineId: string,
    invoiceId: string,
    linkOptions?: LinkInvoicesOptions,
  ): Promise<BankStatementLineDocument> {
    const current = getStatementLine(lineId);
    if (!current) {
      throw new Error(`Bank statement line not found: ${lineId}`);
    }
    const nextIds = Array.from(new Set([...current.invoiceIds, invoiceId.trim()]));
    return linkInvoicesToLine(lineId, nextIds, linkOptions);
  }

  async function unlinkInvoiceFromLine(
    lineId: string,
    invoiceId: string,
  ): Promise<BankStatementLineDocument> {
    const current = getStatementLine(lineId);
    if (!current) {
      throw new Error(`Bank statement line not found: ${lineId}`);
    }
    const nextIds = current.invoiceIds.filter((id) => id !== invoiceId);
    return updateStatementLine(lineId, { invoiceIds: nextIds });
  }

  async function allocateLineToCategory(
    lineId: string,
    categoryId: string,
    notes?: string,
  ): Promise<BankStatementLineDocument> {
    const current = getStatementLine(lineId);
    if (!current) {
      throw new Error(`Bank statement line not found: ${lineId}`);
    }
    return updateStatementLine(lineId, {
      allocations: [
        {
          categoryId,
          amountCents: current.amountCents,
          ...(notes && notes.trim().length > 0 ? { notes: notes.trim() } : {}),
        },
      ],
    });
  }

  async function setLineAllocations(
    lineId: string,
    allocations: readonly BankLineAllocationInput[],
  ): Promise<BankStatementLineDocument> {
    return updateStatementLine(lineId, {
      allocations: [...allocations],
    });
  }

  async function clearLineAllocations(lineId: string): Promise<BankStatementLineDocument> {
    return updateStatementLine(lineId, { allocations: [] });
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

  let isClosed = false;

  async function close(): Promise<void> {
    if (isClosed) {
      return;
    }
    isClosed = true;
    if (defaultStoreInstance === store) {
      defaultStoreInstance = null;
      defaultStorePromise = null;
    }
    await Promise.all([
      accountsCollection.cleanup().catch(() => {}),
      categoriesCollection.cleanup().catch(() => {}),
      statementsCollection.cleanup().catch(() => {}),
      linesCollection.cleanup().catch(() => {}),
    ]);
    await database.close();
  }

  const store = {
    database,
    accountsRxCollection,
    categoriesRxCollection,
    statementsRxCollection,
    linesRxCollection,
    accountsCollection,
    categoriesCollection,
    statementsCollection,
    linesCollection,
    listAccounts,
    getAccount,
    createAccount,
    updateAccount,
    deleteAccount,
    listCategories,
    getCategory,
    createCategory,
    updateCategory,
    deleteCategory,
    listStatements,
    getStatement,
    deleteStatement,
    listStatementLines,
    getStatementLine,
    createStatementLine,
    updateStatementLine,
    deleteStatementLine,
    linkInvoicesToLine,
    linkInvoiceToLine,
    unlinkInvoiceFromLine,
    allocateLineToCategory,
    setLineAllocations,
    clearLineAllocations,
    importStatementCsv,
    importStatementCsvFile,
    close,
  };

  return store;
}

export type BankingStore = Awaited<ReturnType<typeof createBankingStore>>;

let defaultStorePromise: Promise<BankingStore> | null = null;
let defaultStoreInstance: BankingStore | null = null;

export function getBankingStore(): Promise<BankingStore> {
  if (!defaultStorePromise) {
    defaultStorePromise = createBankingStore()
      .then((store) => {
        defaultStoreInstance = store;
        return store;
      })
      .catch((error) => {
        defaultStorePromise = null;
        defaultStoreInstance = null;
        throw error;
      });
  }
  return defaultStorePromise;
}

export async function resetDefaultBankingStoreForTesting(): Promise<void> {
  const pending = defaultStorePromise;
  defaultStorePromise = null;
  defaultStoreInstance = null;
  if (pending) {
    try {
      const store = await pending;
      await store.close();
    } catch {
      // Ignore errors from a failed initialization during test reset
    }
  }
}

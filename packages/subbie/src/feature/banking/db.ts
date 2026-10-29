import { createCollection } from "@tanstack/react-db";
import { rxdbCollectionOptions } from "@tanstack/rxdb-db-collection";
import {
  addRxPlugin,
  createRxDatabase,
  type RxCollection,
  type RxDatabase,
  type RxStorage,
} from "rxdb/plugins/core";
import { RxDBMigrationSchemaPlugin } from "rxdb/plugins/migration-schema";

import { getDefaultInvoicesStorage, type InvoicesStore } from "../invoices/db.ts";
import {
  BANK_ACCOUNTS_COLLECTION_NAME,
  bankAccountJsonSchema,
  createBankAccountsActions,
  type BankAccountsCollection,
} from "./accounts/db.ts";
import type { BankAccountDocument } from "./accounts/schema.ts";
import {
  BANK_CATEGORIES_COLLECTION_NAME,
  bankCategoryJsonSchema,
  createBankCategoriesActions,
  seedDefaultBankCategories,
  type BankCategoriesCollection,
} from "./categories/db.ts";
import type { BankCategoryDocument } from "./categories/schema.ts";
import {
  BANK_STATEMENT_LINES_COLLECTION_NAME,
  bankStatementLineJsonSchema,
  createBankStatementLinesActions,
  type AllocateLineToCategoryOptions,
  type BankStatementLinesCollection,
  type LinkInvoicesOptions,
  type ListStatementLinesFilter,
} from "./lines/db.ts";
import {
  normalizeBankStatementLineDocument,
  type BankStatementLineDocument,
} from "./lines/schema.ts";
import {
  BANK_STATEMENTS_COLLECTION_NAME,
  bankStatementJsonSchema,
  createBankStatementsActions,
  type BankStatementsCollection,
  type ImportBankStatementCsvInput,
  type ImportBankStatementCsvResult,
} from "./statements/db.ts";
import type { BankStatementDocument } from "./statements/schema.ts";

addRxPlugin(RxDBMigrationSchemaPlugin);

export const BANKING_DATABASE_NAME = "subbie-banking";

export {
  BANK_ACCOUNTS_COLLECTION_NAME,
  BANK_CATEGORIES_COLLECTION_NAME,
  BANK_STATEMENT_LINES_COLLECTION_NAME,
  BANK_STATEMENTS_COLLECTION_NAME,
  bankAccountJsonSchema,
  bankCategoryJsonSchema,
  bankStatementJsonSchema,
  bankStatementLineJsonSchema,
  type AllocateLineToCategoryOptions,
  type BankAccountsCollection,
  type BankCategoriesCollection,
  type BankStatementLinesCollection,
  type BankStatementsCollection,
  type ImportBankStatementCsvInput,
  type ImportBankStatementCsvResult,
  type LinkInvoicesOptions,
  type ListStatementLinesFilter,
};

export interface CreateBankingStoreOptions {
  name?: string;
  storage?: RxStorage<unknown, unknown>;
  multiInstance?: boolean;
  seedDefaultCategories?: boolean;
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
      [BANK_ACCOUNTS_COLLECTION_NAME]: {
        schema: bankAccountJsonSchema,
        migrationStrategies: {
          1: (oldDoc: BankAccountDocument & { currency?: string }) => {
            const { currency: _currency, ...doc } = oldDoc;
            return doc;
          },
        },
      },
      [BANK_CATEGORIES_COLLECTION_NAME]: { schema: bankCategoryJsonSchema },
      [BANK_STATEMENTS_COLLECTION_NAME]: { schema: bankStatementJsonSchema },
      [BANK_STATEMENT_LINES_COLLECTION_NAME]: {
        schema: bankStatementLineJsonSchema,
        migrationStrategies: {
          1: (oldDoc: BankStatementLineDocument) => normalizeBankStatementLineDocument(oldDoc),
          2: (oldDoc: BankStatementLineDocument) => normalizeBankStatementLineDocument(oldDoc),
        },
      },
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

  if (seedDefaultCategories) {
    await seedDefaultBankCategories(categoriesCollection);
  }

  let lastLineTimestampMs = 0;

  function allocateLineTimestampMs(count = 1): number {
    const startMs = Math.max(Date.now(), lastLineTimestampMs + count);
    lastLineTimestampMs = startMs;
    return startMs;
  }

  const accountActions = createBankAccountsActions({
    accountsCollection,
    statementsCollection,
    linesCollection,
  });

  const categoryActions = createBankCategoriesActions({
    categoriesCollection,
    linesCollection,
  });

  const statementActions = createBankStatementsActions({
    statementsCollection,
    linesCollection,
    getAccount: accountActions.getAccount,
    updateAccount: accountActions.updateAccount,
    allocateLineTimestampMs,
  });

  const lineActions = createBankStatementLinesActions({
    accountsCollection,
    linesCollection,
    getCategory: categoryActions.getCategory,
    syncStatementMetadata: statementActions.syncStatementMetadata,
    allocateLineTimestampMs,
    defaultInvoicesStore: options.invoicesStore,
  });

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
    ...accountActions,
    ...categoryActions,
    listStatements: statementActions.listStatements,
    getStatement: statementActions.getStatement,
    deleteStatement: statementActions.deleteStatement,
    ...lineActions,
    importStatementCsv: statementActions.importStatementCsv,
    importStatementCsvFile: statementActions.importStatementCsvFile,
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

import { createCollection, type Collection } from "@tanstack/react-db";
import { rxdbCollectionOptions } from "@tanstack/rxdb-db-collection";
import {
  addRxPlugin,
  createRxDatabase,
  type RxCollection,
  type RxDatabase,
  type RxJsonSchema,
  type RxStorage,
} from "rxdb/plugins/core";
import { RxDBMigrationSchemaPlugin } from "rxdb/plugins/migration-schema";
import { getRxStorageDexie } from "rxdb/plugins/storage-dexie";
import { getRxStorageMemory } from "rxdb/plugins/storage-memory";

import {
  addDaysToDateString,
  DEFAULT_INVOICE_CURRENCY,
  generateDocumentId,
  isInvoiceValue,
  INVOICE_KEYS,
  nextInvoiceNumber,
  normalizeInvoiceDocument,
  normalizeInvoiceLineItem,
  toDateString,
  validateInvoiceInput,
  type CreateInvoiceInput,
  type InvoiceDocument,
  type InvoicePatch,
  type InvoiceStatus,
} from "./schema.ts";

addRxPlugin(RxDBMigrationSchemaPlugin);

export const INVOICES_DATABASE_NAME = "subbie";

export const INVOICES_COLLECTION_NAME = "invoices";

export const invoiceJsonSchema: RxJsonSchema<InvoiceDocument> = {
  version: 1,
  primaryKey: "id",
  type: "object",
  properties: {
    id: { type: "string", maxLength: 128 },
    number: { type: "string", maxLength: 64 },
    clientName: { type: "string" },
    clientEmail: { type: "string" },
    currency: { type: "string", maxLength: 3 },
    status: { type: "string", maxLength: 16 },
    issueDate: { type: "string", maxLength: 10 },
    dueDate: { type: "string", maxLength: 10 },
    items: {
      type: "array",
      items: {
        type: "object",
        properties: {
          id: { type: "string" },
          description: { type: "string" },
          quantity: { type: "number" },
          unitPriceCents: { type: "number" },
          date: { type: "string", maxLength: 10 },
          notes: { type: "string" },
        },
      },
    },
    notes: { type: "string" },
    createdAt: { type: "string" },
    updatedAt: { type: "string" },
  },
  required: ["id", "number", "clientName", "currency", "status", "items", "createdAt", "updatedAt"],
};

export type InvoicesCollection = Collection<InvoiceDocument, string>;

export interface CreateInvoicesStoreOptions {
  name?: string;
  collectionName?: string;
  storage?: RxStorage<unknown, unknown>;
  multiInstance?: boolean;
}

function sanitizeDatabaseName(name: string): string {
  const sanitized = name.toLowerCase().replace(/[^a-z0-9_$-]/g, "");
  return sanitized.length > 0 ? sanitized : INVOICES_DATABASE_NAME;
}

export function getDefaultInvoicesStorage(): RxStorage<unknown, unknown> {
  if (typeof indexedDB !== "undefined") {
    return getRxStorageDexie();
  }
  return getRxStorageMemory();
}

export async function createInvoicesStore(options: CreateInvoicesStoreOptions = {}) {
  const databaseName = sanitizeDatabaseName(options.name ?? INVOICES_DATABASE_NAME);
  const collectionName = options.collectionName ?? INVOICES_COLLECTION_NAME;
  const storage = options.storage ?? getDefaultInvoicesStorage();

  const database: RxDatabase = await createRxDatabase({
    name: databaseName,
    storage,
    multiInstance: options.multiInstance ?? false,
  });

  try {
    await database.addCollections({
      [collectionName]: {
        schema: invoiceJsonSchema,
        migrationStrategies: {
          1: (oldDoc: InvoiceDocument) => oldDoc,
        },
      },
    });
  } catch (error) {
    await database.close().catch(() => {});
    throw error;
  }

  const rxCollection = database.collections[collectionName] as RxCollection<InvoiceDocument>;

  const collection = createCollection(
    rxdbCollectionOptions<InvoiceDocument>({
      id: `${databaseName}-${collectionName}`,
      rxCollection,
      startSync: true,
    }),
  );
  await collection.preload();

  function listInvoices(): InvoiceDocument[] {
    return [...collection.values()]
      .map((doc) => normalizeInvoiceDocument(doc))
      .sort((a, b) => (a.createdAt < b.createdAt ? 1 : a.createdAt > b.createdAt ? -1 : 0));
  }

  function listInvoiceNumbers(): string[] {
    return [...collection.values()]
      .map((doc) => doc.number)
      .filter((number): number is string => typeof number === "string");
  }

  function getInvoice(id: string): InvoiceDocument | undefined {
    const doc = collection.get(id);
    return doc ? normalizeInvoiceDocument(doc) : undefined;
  }

  async function createInvoice(input: CreateInvoiceInput): Promise<InvoiceDocument> {
    const validated = validateInvoiceInput(input);
    const now = new Date().toISOString();
    const issueDate = validated.issueDate ?? toDateString();
    const doc = normalizeInvoiceDocument({
      id: generateDocumentId(),
      number: nextInvoiceNumber(listInvoiceNumbers()),
      clientName: validated.clientName.trim(),
      clientEmail: validated.clientEmail?.trim() ?? "",
      currency: validated.currency ?? DEFAULT_INVOICE_CURRENCY,
      status: "draft",
      issueDate,
      dueDate: validated.dueDate ?? addDaysToDateString(issueDate, 30),
      items: validated.items.map((item) => normalizeInvoiceLineItem(item)),
      notes: validated.notes ?? "",
      createdAt: now,
      updatedAt: now,
    });
    const tx = collection.insert(doc);
    await tx.isPersisted.promise;
    return doc;
  }

  async function updateInvoice(id: string, patch: InvoicePatch): Promise<InvoiceDocument> {
    if (!collection.has(id)) {
      throw new Error(`Invoice not found: ${id}`);
    }
    for (const key of INVOICE_KEYS) {
      if (patch[key] !== undefined && !isInvoiceValue(key, patch[key])) {
        throw new Error(`Invalid invoice value for "${key}"`);
      }
    }
    const normalizedPatch: InvoicePatch = {
      ...patch,
      ...(patch.number !== undefined ? { number: patch.number.trim() } : {}),
      ...(patch.clientName !== undefined ? { clientName: patch.clientName.trim() } : {}),
      ...(patch.clientEmail !== undefined ? { clientEmail: patch.clientEmail.trim() } : {}),
      ...(patch.items !== undefined
        ? { items: patch.items.map((item) => normalizeInvoiceLineItem(item)) }
        : {}),
    };
    const tx = collection.update(id, (draft) => {
      for (const key of INVOICE_KEYS) {
        const value = normalizedPatch[key];
        if (value !== undefined) {
          (draft as Record<string, unknown>)[key] = value;
        }
      }
      draft.updatedAt = new Date().toISOString();
    });
    await tx.isPersisted.promise;
    const updated = getInvoice(id);
    if (!updated) {
      throw new Error(`Invoice not found: ${id}`);
    }
    return updated;
  }

  async function setInvoiceStatus(id: string, status: InvoiceStatus): Promise<InvoiceDocument> {
    return updateInvoice(id, { status });
  }

  async function deleteInvoice(id: string): Promise<void> {
    if (!collection.has(id)) {
      throw new Error(`Invoice not found: ${id}`);
    }
    const tx = collection.delete(id);
    await tx.isPersisted.promise;
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
    await collection.cleanup().catch(() => {});
    await database.close();
  }

  const store = {
    database,
    rxCollection,
    collection,
    listInvoices,
    getInvoice,
    createInvoice,
    updateInvoice,
    setInvoiceStatus,
    deleteInvoice,
    close,
  };

  return store;
}

export type InvoicesStore = Awaited<ReturnType<typeof createInvoicesStore>>;

let defaultStorePromise: Promise<InvoicesStore> | null = null;
let defaultStoreInstance: InvoicesStore | null = null;

export function getInvoicesStore(): Promise<InvoicesStore> {
  if (!defaultStorePromise) {
    defaultStorePromise = createInvoicesStore()
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

export async function resetDefaultInvoicesStoreForTesting(): Promise<void> {
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

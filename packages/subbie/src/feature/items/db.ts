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
import { getDefaultInvoicesStorage } from "../invoices/db.ts";
import { generateDocumentId } from "../invoices/schema.ts";
import {
  isItemDocument,
  normalizeItemDocument,
  validateItemInput,
  type CreateItemInput,
  type ItemDocument,
  type ItemPatch,
} from "./schema.ts";

addRxPlugin(RxDBMigrationSchemaPlugin);

export const ITEMS_DATABASE_NAME = "subbie-items";

export const ITEMS_COLLECTION_NAME = "items";

export const itemJsonSchema: RxJsonSchema<ItemDocument> = {
  version: 1,
  primaryKey: "id",
  type: "object",
  properties: {
    id: { type: "string", maxLength: 128 },
    name: { type: "string" },
    description: { type: "string" },
    unitPriceCents: { type: "number" },
    unit: { type: "string" },
    createdAt: { type: "string" },
    updatedAt: { type: "string" },
  },
  required: ["id", "name", "unitPriceCents", "createdAt", "updatedAt"],
};

export type ItemsCollection = Collection<ItemDocument, string>;

export interface CreateItemsStoreOptions {
  name?: string;
  storage?: RxStorage<unknown, unknown>;
  multiInstance?: boolean;
}

function sanitizeDatabaseName(name: string): string {
  const sanitized = name.toLowerCase().replace(/[^a-z0-9_$-]/g, "");
  return sanitized.length > 0 ? sanitized : ITEMS_DATABASE_NAME;
}

export const getDefaultItemsStorage = getDefaultInvoicesStorage;

export async function createItemsStore(options: CreateItemsStoreOptions = {}) {
  const databaseName = sanitizeDatabaseName(options.name ?? ITEMS_DATABASE_NAME);
  const storage = options.storage ?? getDefaultItemsStorage();

  const database: RxDatabase = await createRxDatabase({
    name: databaseName,
    storage,
    multiInstance: options.multiInstance ?? false,
  });

  try {
    await database.addCollections({
      [ITEMS_COLLECTION_NAME]: {
        schema: itemJsonSchema,
        migrationStrategies: {
          1: (oldDoc: ItemDocument & { currency?: string }) => {
            const { currency: _currency, ...doc } = oldDoc;
            return doc;
          },
        },
      },
    });
  } catch (error) {
    await database.close().catch(() => {});
    throw error;
  }

  const itemsRxCollection = database.collections[
    ITEMS_COLLECTION_NAME
  ] as RxCollection<ItemDocument>;

  const itemsCollection = createCollection(
    rxdbCollectionOptions<ItemDocument>({
      id: `${databaseName}-${ITEMS_COLLECTION_NAME}`,
      rxCollection: itemsRxCollection,
      startSync: true,
    }),
  );
  await itemsCollection.preload();

  const byName = (a: { name: string }, b: { name: string }) => a.name.localeCompare(b.name);

  function listItems(): ItemDocument[] {
    return [...itemsCollection.values()].map((doc) => normalizeItemDocument(doc)).sort(byName);
  }

  function getItem(id: string): ItemDocument | undefined {
    const doc = itemsCollection.get(id);
    return doc ? normalizeItemDocument(doc) : undefined;
  }

  async function createItem(input: CreateItemInput): Promise<ItemDocument> {
    const validated = validateItemInput(input);
    const now = new Date().toISOString();
    const doc = normalizeItemDocument({
      id: generateDocumentId(),
      name: validated.name.trim(),
      description: validated.description ?? "",
      unitPriceCents: validated.unitPriceCents,
      unit: validated.unit ?? "",
      createdAt: now,
      updatedAt: now,
    });
    const tx = itemsCollection.insert(doc);
    await tx.isPersisted.promise;
    return doc;
  }

  async function updateItem(id: string, patch: ItemPatch): Promise<ItemDocument> {
    const current = getItem(id);
    if (!current) {
      throw new Error(`Item not found: ${id}`);
    }
    const candidate = { ...current, ...patch, id };
    if (!isItemDocument(candidate)) {
      throw new Error("Invalid item update");
    }
    const next = normalizeItemDocument(candidate);
    const tx = itemsCollection.update(id, (draft) => {
      Object.assign(draft, next, { updatedAt: new Date().toISOString() });
    });
    await tx.isPersisted.promise;
    return getItem(id) ?? next;
  }

  async function deleteItem(id: string): Promise<void> {
    if (!itemsCollection.has(id)) {
      throw new Error(`Item not found: ${id}`);
    }
    const tx = itemsCollection.delete(id);
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
    await itemsCollection.cleanup().catch(() => {});
    await database.close();
  }

  const store = {
    database,
    itemsRxCollection,
    itemsCollection,
    listItems,
    getItem,
    createItem,
    updateItem,
    deleteItem,
    close,
  };

  return store;
}

export type ItemsStore = Awaited<ReturnType<typeof createItemsStore>>;

let defaultStorePromise: Promise<ItemsStore> | null = null;
let defaultStoreInstance: ItemsStore | null = null;

export function getItemsStore(): Promise<ItemsStore> {
  if (!defaultStorePromise) {
    defaultStorePromise = createItemsStore()
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

export async function resetDefaultItemsStoreForTesting(): Promise<void> {
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

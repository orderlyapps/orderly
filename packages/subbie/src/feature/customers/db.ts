import { createCollection, type Collection } from "@tanstack/react-db";
import { rxdbCollectionOptions } from "@tanstack/rxdb-db-collection";
import {
  createRxDatabase,
  type RxCollection,
  type RxDatabase,
  type RxJsonSchema,
  type RxStorage,
} from "rxdb/plugins/core";
import { getDefaultInvoicesStorage } from "../invoices/db.ts";
import { generateDocumentId } from "../invoices/schema.ts";
import {
  isCustomerDocument,
  normalizeCustomerDocument,
  validateCustomerInput,
  type CreateCustomerInput,
  type CustomerDocument,
  type CustomerPatch,
} from "./schema.ts";

export const CUSTOMERS_DATABASE_NAME = "subbie-customers";

export const CUSTOMERS_COLLECTION_NAME = "customers";

export const customerJsonSchema: RxJsonSchema<CustomerDocument> = {
  version: 0,
  primaryKey: "id",
  type: "object",
  properties: {
    id: { type: "string", maxLength: 128 },
    name: { type: "string" },
    email: { type: "string" },
    phone: { type: "string" },
    notes: { type: "string" },
    createdAt: { type: "string" },
    updatedAt: { type: "string" },
  },
  required: ["id", "name", "createdAt", "updatedAt"],
};

export type CustomersCollection = Collection<CustomerDocument, string>;

export interface CreateCustomersStoreOptions {
  name?: string;
  storage?: RxStorage<unknown, unknown>;
  multiInstance?: boolean;
}

function sanitizeDatabaseName(name: string): string {
  const sanitized = name.toLowerCase().replace(/[^a-z0-9_$-]/g, "");
  return sanitized.length > 0 ? sanitized : CUSTOMERS_DATABASE_NAME;
}

export const getDefaultCustomersStorage = getDefaultInvoicesStorage;

export async function createCustomersStore(options: CreateCustomersStoreOptions = {}) {
  const databaseName = sanitizeDatabaseName(options.name ?? CUSTOMERS_DATABASE_NAME);
  const storage = options.storage ?? getDefaultCustomersStorage();

  const database: RxDatabase = await createRxDatabase({
    name: databaseName,
    storage,
    multiInstance: options.multiInstance ?? false,
  });

  try {
    await database.addCollections({
      [CUSTOMERS_COLLECTION_NAME]: { schema: customerJsonSchema },
    });
  } catch (error) {
    await database.close().catch(() => {});
    throw error;
  }

  const customersRxCollection = database.collections[
    CUSTOMERS_COLLECTION_NAME
  ] as RxCollection<CustomerDocument>;

  const customersCollection = createCollection(
    rxdbCollectionOptions<CustomerDocument>({
      id: `${databaseName}-${CUSTOMERS_COLLECTION_NAME}`,
      rxCollection: customersRxCollection,
      startSync: true,
    }),
  );
  await customersCollection.preload();

  const byName = (a: { name: string }, b: { name: string }) => a.name.localeCompare(b.name);

  function listCustomers(): CustomerDocument[] {
    return [...customersCollection.values()]
      .map((doc) => normalizeCustomerDocument(doc))
      .sort(byName);
  }

  function getCustomer(id: string): CustomerDocument | undefined {
    const doc = customersCollection.get(id);
    return doc ? normalizeCustomerDocument(doc) : undefined;
  }

  async function createCustomer(input: CreateCustomerInput): Promise<CustomerDocument> {
    const validated = validateCustomerInput(input);
    const now = new Date().toISOString();
    const doc = normalizeCustomerDocument({
      id: generateDocumentId(),
      name: validated.name.trim(),
      email: validated.email?.trim() ?? "",
      phone: validated.phone?.trim() ?? "",
      notes: validated.notes ?? "",
      createdAt: now,
      updatedAt: now,
    });
    const tx = customersCollection.insert(doc);
    await tx.isPersisted.promise;
    return doc;
  }

  async function updateCustomer(id: string, patch: CustomerPatch): Promise<CustomerDocument> {
    const current = getCustomer(id);
    if (!current) {
      throw new Error(`Customer not found: ${id}`);
    }
    const candidate = { ...current, ...patch, id };
    if (!isCustomerDocument(candidate)) {
      throw new Error("Invalid customer update");
    }
    const next = normalizeCustomerDocument(candidate);
    const tx = customersCollection.update(id, (draft) => {
      Object.assign(draft, next, { updatedAt: new Date().toISOString() });
    });
    await tx.isPersisted.promise;
    return getCustomer(id) ?? next;
  }

  async function deleteCustomer(id: string): Promise<void> {
    if (!customersCollection.has(id)) {
      throw new Error(`Customer not found: ${id}`);
    }
    const tx = customersCollection.delete(id);
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
    await customersCollection.cleanup().catch(() => {});
    await database.close();
  }

  const store = {
    database,
    customersRxCollection,
    customersCollection,
    listCustomers,
    getCustomer,
    createCustomer,
    updateCustomer,
    deleteCustomer,
    close,
  };

  return store;
}

export type CustomersStore = Awaited<ReturnType<typeof createCustomersStore>>;

let defaultStorePromise: Promise<CustomersStore> | null = null;
let defaultStoreInstance: CustomersStore | null = null;

export function getCustomersStore(): Promise<CustomersStore> {
  if (!defaultStorePromise) {
    defaultStorePromise = createCustomersStore()
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

export async function resetDefaultCustomersStoreForTesting(): Promise<void> {
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

import { createCollection } from "@tanstack/react-db";
import { rxdbCollectionOptions } from "@tanstack/rxdb-db-collection";
import {
  createRxDatabase,
  type RxCollection,
  type RxDatabase,
  type RxStorage,
} from "rxdb/plugins/core";
import { getRxStorageDexie } from "rxdb/plugins/storage-dexie";
import { getRxStorageMemory } from "rxdb/plugins/storage-memory";

import {
  DEFAULT_SETTINGS,
  DEFAULT_SETTINGS_ID,
  isSettingValue,
  normalizeSettingsDocument,
  SETTINGS_KEYS,
  settingsRxSchema,
  toSettingsPatch,
  type SettingsDocument,
  type SettingsKey,
  type SettingsPatch,
  type ThemeMode,
} from "./schema.ts";
import { setCachedTheme } from "./theme.ts";

export type SettingsRxCollection = RxCollection<SettingsDocument>;

export type SettingsDatabaseCollections = {
  settings: SettingsRxCollection;
};

export type SubbieDatabase = RxDatabase<SettingsDatabaseCollections>;

export interface CreateSettingsStoreOptions {
  name?: string;
  storage?: RxStorage<unknown, unknown>;
  initialSettings?: SettingsPatch;
}

function getDefaultStorage(): RxStorage<unknown, unknown> {
  if (typeof indexedDB !== "undefined") {
    return getRxStorageDexie();
  }
  return getRxStorageMemory();
}

export async function createSettingsStore(options: CreateSettingsStoreOptions = {}) {
  const dbName = options.name ?? "subbie";
  const storage = options.storage ?? getDefaultStorage();

  const db = await createRxDatabase<SettingsDatabaseCollections>({
    name: dbName,
    storage,
    multiInstance: typeof BroadcastChannel !== "undefined" && typeof indexedDB !== "undefined",
  });

  await db.addCollections({
    settings: {
      schema: settingsRxSchema,
    },
  });

  const existing = await db.settings.findOne(DEFAULT_SETTINGS_ID).exec();
  if (!existing) {
    try {
      await db.settings.insert(
        normalizeSettingsDocument({
          ...DEFAULT_SETTINGS,
          ...options.initialSettings,
          id: DEFAULT_SETTINGS_ID,
        }),
      );
    } catch (error) {
      const afterConflict = await db.settings.findOne(DEFAULT_SETTINGS_ID).exec();
      if (!afterConflict) {
        throw error;
      }
    }
  }

  const collection = createCollection(
    rxdbCollectionOptions<SettingsDocument>({
      id: `${dbName}-settings`,
      rxCollection: db.settings,
      startSync: true,
    }),
  );

  await collection.preload();

  async function getSettings(): Promise<SettingsDocument> {
    const cached = collection.get(DEFAULT_SETTINGS_ID);
    if (cached) {
      return normalizeSettingsDocument(cached);
    }
    const doc = await db.settings.findOne(DEFAULT_SETTINGS_ID).exec();
    if (doc) {
      return normalizeSettingsDocument(doc);
    }
    return { ...DEFAULT_SETTINGS };
  }

  async function applyCollectionUpdate(sanitized: SettingsPatch): Promise<void> {
    const tx = collection.update(DEFAULT_SETTINGS_ID, (draft) => {
      Object.assign(draft, sanitized);
    });
    await tx.isPersisted.promise;
  }

  async function updateSettings(patch: SettingsPatch): Promise<SettingsDocument> {
    for (const key of SETTINGS_KEYS) {
      if (patch[key] !== undefined && !isSettingValue(key, patch[key])) {
        throw new Error(`Invalid settings value for "${key}"`);
      }
    }
    const sanitized = toSettingsPatch(patch);
    if (Object.keys(sanitized).length === 0) {
      throw new Error("Invalid settings patch: at least one valid setting is required");
    }
    if (collection.has(DEFAULT_SETTINGS_ID)) {
      await applyCollectionUpdate(sanitized);
    } else {
      const next = normalizeSettingsDocument({
        ...DEFAULT_SETTINGS,
        ...sanitized,
        id: DEFAULT_SETTINGS_ID,
      });
      try {
        const tx = collection.insert(next);
        await tx.isPersisted.promise;
      } catch (error) {
        await collection.preload();
        if (collection.has(DEFAULT_SETTINGS_ID)) {
          await applyCollectionUpdate(sanitized);
        } else {
          const existingDoc = await db.settings.findOne(DEFAULT_SETTINGS_ID).exec();
          if (!existingDoc) {
            throw error;
          }
          await existingDoc.patch(sanitized);
        }
      }
    }
    const updated = await getSettings();
    setCachedTheme(updated.theme);
    return updated;
  }

  async function setSetting<K extends SettingsKey>(
    key: K,
    value: SettingsDocument[K],
  ): Promise<SettingsDocument> {
    return updateSettings({ [key]: value } as SettingsPatch);
  }

  async function setTheme(theme: ThemeMode): Promise<SettingsDocument> {
    return setSetting("theme", theme);
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
    await collection.cleanup();
    await db.close();
  }

  const store = {
    db,
    rxCollection: db.settings,
    collection,
    getSettings,
    updateSettings,
    setSetting,
    setTheme,
    close,
  };

  return store;
}

export type SettingsStore = Awaited<ReturnType<typeof createSettingsStore>>;

let defaultStorePromise: Promise<SettingsStore> | null = null;
let defaultStoreInstance: SettingsStore | null = null;

export function getSettingsStore(): Promise<SettingsStore> {
  if (!defaultStorePromise) {
    defaultStorePromise = createSettingsStore()
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

export async function resetDefaultSettingsStoreForTesting(): Promise<void> {
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

import {
  createCollection,
  InvalidStorageDataFormatError,
  InvalidStorageObjectFormatError,
  localStorageCollectionOptions,
  SerializationError,
  type Collection,
  type LocalStorageCollectionUtils,
  type StorageApi,
  type StorageEventApi,
} from "@tanstack/react-db";

import {
  DEFAULT_SETTINGS,
  DEFAULT_SETTINGS_ID,
  isSettingsDocument,
  isSettingValue,
  isValidSettingsId,
  normalizeSettingsDocument,
  SETTINGS_KEYS,
  toSettingsPatch,
  type SettingsDocument,
  type SettingsKey,
  type SettingsPatch,
  type ThemeMode,
} from "./schema.ts";

export const SETTINGS_STORAGE_KEY = "ionic:settings";

export type { StorageApi, StorageEventApi };

export type SettingsCollection = Collection<
  SettingsDocument,
  string,
  LocalStorageCollectionUtils,
  never,
  SettingsDocument
>;

export interface CreateSettingsStoreOptions {
  name?: string;
  storageKey?: string;
  storage?: StorageApi;
  storageEventApi?: StorageEventApi;
  initialSettings?: SettingsPatch;
}

function createMemoryStorage(): StorageApi {
  const map = new Map<string, string>();
  return {
    getItem(key: string): string | null {
      return map.get(key) ?? null;
    },
    setItem(key: string, value: string): void {
      map.set(key, value);
    },
    removeItem(key: string): void {
      map.delete(key);
    },
  };
}

const fallbackMemoryStorage = createMemoryStorage();

function resolveStorageApi(candidate: unknown): StorageApi | null {
  if (typeof candidate !== "object" || candidate === null) {
    return null;
  }
  const storageLike = candidate as Partial<StorageApi>;
  if (
    typeof storageLike.getItem !== "function" ||
    typeof storageLike.setItem !== "function" ||
    typeof storageLike.removeItem !== "function"
  ) {
    return null;
  }
  return storageLike as StorageApi;
}

export function getDefaultStorage(): StorageApi {
  try {
    if (typeof localStorage !== "undefined") {
      const resolved = resolveStorageApi(localStorage);
      if (resolved) {
        return resolved;
      }
    }
  } catch {
    // Fall back to in-memory storage when localStorage is unavailable or restricted
  }
  return fallbackMemoryStorage;
}

const SETTINGS_SNAPSHOT_SUFFIX = ":snapshot";

export function settingsSnapshotStorageKey(storageKey: string): string {
  return `${storageKey}${SETTINGS_SNAPSHOT_SUFFIX}`;
}

function writeSettingsSnapshot(
  storage: StorageApi,
  storageKey: string,
  settings: SettingsDocument,
): void {
  try {
    storage.setItem(settingsSnapshotStorageKey(storageKey), JSON.stringify(settings));
  } catch {
    // Snapshot persistence is best-effort; storage write failures are non-fatal
  }
}

export function readSettingsSnapshot(
  storage: StorageApi,
  storageKey: string,
): SettingsDocument | null {
  try {
    const raw = storage.getItem(settingsSnapshotStorageKey(storageKey));
    if (!raw) {
      return null;
    }
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
      return null;
    }
    return normalizeSettingsDocument(parsed as Partial<SettingsDocument>);
  } catch {
    return null;
  }
}

function isStorageFormatError(error: unknown): boolean {
  return (
    error instanceof SyntaxError ||
    error instanceof InvalidStorageDataFormatError ||
    error instanceof InvalidStorageObjectFormatError ||
    error instanceof SerializationError
  );
}

export async function createSettingsStore(options: CreateSettingsStoreOptions = {}) {
  const storeName = options.name ?? "ionic";
  const storageKey =
    options.storageKey ?? (options.name ? `${options.name}:settings` : SETTINGS_STORAGE_KEY);
  const storage = options.storage ?? getDefaultStorage();

  const initCollection = async (): Promise<SettingsCollection> => {
    const instance = createCollection(
      localStorageCollectionOptions<SettingsDocument, string>({
        id: `${storeName}-settings`,
        storageKey,
        storage,
        storageEventApi: options.storageEventApi,
        getKey: (item) => {
          if (
            typeof item !== "object" ||
            item === null ||
            !isValidSettingsId((item as Partial<SettingsDocument>).id)
          ) {
            throw new InvalidStorageDataFormatError(
              storageKey,
              String((item as Partial<SettingsDocument> | null)?.id ?? ""),
            );
          }
          return item.id;
        },
        startSync: true,
      }),
    );
    try {
      await instance.preload();
      return instance;
    } catch (error) {
      await instance.cleanup().catch(() => {});
      throw error;
    }
  };

  let collection: SettingsCollection;
  try {
    collection = await initCollection();
  } catch (error) {
    if (!isStorageFormatError(error)) {
      throw error;
    }
    try {
      storage.removeItem(storageKey);
    } catch {
      // Ignore storage removal errors and allow retry to surface any persistent failure
    }
    collection = await initCollection();
  }

  const existing = collection.get(DEFAULT_SETTINGS_ID);
  if (!existing) {
    const initialDoc = normalizeSettingsDocument({
      ...DEFAULT_SETTINGS,
      ...options.initialSettings,
      id: DEFAULT_SETTINGS_ID,
    });
    const tx = collection.insert(initialDoc);
    await tx.isPersisted.promise;
  } else if (!isSettingsDocument(existing)) {
    const normalized = normalizeSettingsDocument({
      ...options.initialSettings,
      ...toSettingsPatch(existing),
      id: DEFAULT_SETTINGS_ID,
    });
    const tx = collection.update(DEFAULT_SETTINGS_ID, (draft) => {
      Object.assign(draft, normalized);
    });
    await tx.isPersisted.promise;
  }

  const syncSettingsSnapshot = () => {
    const current = collection.get(DEFAULT_SETTINGS_ID);
    writeSettingsSnapshot(
      storage,
      storageKey,
      current ? normalizeSettingsDocument(current) : { ...DEFAULT_SETTINGS },
    );
  };
  syncSettingsSnapshot();
  const snapshotSubscription = collection.subscribeChanges(syncSettingsSnapshot);

  async function getSettings(): Promise<SettingsDocument> {
    const cached = collection.get(DEFAULT_SETTINGS_ID);
    if (cached) {
      return normalizeSettingsDocument(cached);
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
        if (!collection.has(DEFAULT_SETTINGS_ID)) {
          throw error;
        }
        await applyCollectionUpdate(sanitized);
      }
    }
    const updated = await getSettings();
    writeSettingsSnapshot(storage, storageKey, updated);
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
    snapshotSubscription.unsubscribe();
    if (defaultStoreInstance === store) {
      defaultStoreInstance = null;
      defaultStorePromise = null;
    }
    await collection.cleanup();
  }

  const store = {
    storageKey,
    storage,
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
  fallbackMemoryStorage.removeItem(SETTINGS_STORAGE_KEY);
  fallbackMemoryStorage.removeItem(settingsSnapshotStorageKey(SETTINGS_STORAGE_KEY));
}

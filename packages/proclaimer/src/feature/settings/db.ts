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
  readLegacyCongregationId,
  readLegacyMidweekSelectorSettings,
  readLegacyPublisher,
} from "./legacy.ts";
import {
  areSettingsRecordEntriesEqual,
  DEFAULT_SETTINGS,
  DEFAULT_SETTINGS_ID,
  isRecordSettingsKey,
  isSettingsDocument,
  isSettingValue,
  isValidSettingsId,
  normalizeSettingsDocument,
  normalizeSettingsUpdatedAt,
  SETTINGS_KEYS,
  toSettingsPatch,
  type RecordSettingsKey,
  type SettingsDocument,
  type SettingsKey,
  type SettingsPatch,
  type SettingsUpdatedAt,
  type ThemeMode,
} from "./schema.ts";

export const SETTINGS_STORAGE_KEY = "proclaimer:settings";

export type { StorageApi, StorageEventApi };

export type StoredSettingsDocument = SettingsDocument & {
  updatedAt?: SettingsUpdatedAt;
};

export type SettingsCollection = Collection<
  StoredSettingsDocument,
  string,
  LocalStorageCollectionUtils,
  never,
  StoredSettingsDocument
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

function settingsKeysInPatch(patch: SettingsPatch): SettingsKey[] {
  return SETTINGS_KEYS.filter((key) => patch[key] !== undefined);
}

function asRecord(value: unknown): Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function hasOwn(value: Record<string, unknown>, key: string): boolean {
  return Object.prototype.hasOwnProperty.call(value, key);
}

function entryTimestampsFor(
  updatedAt: SettingsUpdatedAt,
  key: RecordSettingsKey,
): Record<string, number> {
  return { ...((updatedAt[key] ?? {}) as Record<string, number>) };
}

function setUpdatedAtValue(
  updatedAt: SettingsUpdatedAt,
  key: SettingsKey,
  value: number | Record<string, number>,
): void {
  if (key === "selectedMaps") {
    updatedAt.selectedMaps = value as Record<string, number>;
  } else if (key === "recentSelectedMaps") {
    updatedAt.recentSelectedMaps = value as Record<string, number>;
  } else if (key === "midweekSelectorSettings") {
    updatedAt.midweekSelectorSettings = value as SettingsUpdatedAt["midweekSelectorSettings"];
  } else {
    (updatedAt as Partial<Record<SettingsKey, unknown>>)[key] = value;
  }
}

function timestampsForPatch(
  existing: StoredSettingsDocument | undefined,
  patch: SettingsPatch,
  timestamp: number,
): SettingsUpdatedAt {
  const timestamps: SettingsUpdatedAt = {};
  for (const key of settingsKeysInPatch(patch)) {
    if (!isRecordSettingsKey(key)) {
      setUpdatedAtValue(timestamps, key, timestamp);
      continue;
    }
    const existingEntries = asRecord(existing?.[key]);
    const nextEntries = asRecord(patch[key]);
    const entryTimestamps: Record<string, number> = {};
    for (const entryKey of new Set([
      ...Object.keys(existingEntries),
      ...Object.keys(nextEntries),
    ])) {
      if (!areSettingsRecordEntriesEqual(key, existingEntries[entryKey], nextEntries[entryKey])) {
        entryTimestamps[entryKey] = timestamp;
      }
    }
    if (Object.keys(entryTimestamps).length > 0) {
      setUpdatedAtValue(timestamps, key, entryTimestamps);
    }
  }
  return timestamps;
}

function areTimestampMapsEqual(a: Record<string, number>, b: Record<string, number>): boolean {
  const aKeys = Object.keys(a);
  const bKeys = Object.keys(b);
  return aKeys.length === bKeys.length && aKeys.every((key) => a[key] === b[key]);
}

function mergeRecordSetting(
  key: RecordSettingsKey,
  existingValue: unknown,
  incomingValue: unknown,
  existingTimestamps: Record<string, number>,
  incomingTimestamps: Record<string, number>,
): {
  value: Record<string, unknown>;
  updatedAt: Record<string, number>;
  changed: boolean;
} {
  const existingEntries = asRecord(existingValue);
  const incomingEntries = asRecord(incomingValue);
  const mergedEntries = { ...existingEntries };
  const mergedTimestamps = { ...existingTimestamps };
  let valueChanged = false;

  for (const entryKey of new Set([
    ...Object.keys(incomingEntries),
    ...Object.keys(incomingTimestamps),
  ])) {
    const incomingHasValue = hasOwn(incomingEntries, entryKey);
    const incomingHasTimestamp = hasOwn(incomingTimestamps, entryKey);
    if (!incomingHasValue && !incomingHasTimestamp) {
      continue;
    }
    const existingHasValue = hasOwn(mergedEntries, entryKey);
    const existingTimestamp = existingTimestamps[entryKey] ?? 0;
    const incomingTimestamp = incomingTimestamps[entryKey] ?? 0;

    if (incomingHasValue) {
      if (incomingTimestamp >= existingTimestamp) {
        const nextValue = incomingEntries[entryKey];
        if (
          !existingHasValue ||
          !areSettingsRecordEntriesEqual(key, mergedEntries[entryKey], nextValue)
        ) {
          mergedEntries[entryKey] = nextValue;
          valueChanged = true;
        }
        mergedTimestamps[entryKey] = incomingTimestamp;
      }
    } else if (incomingTimestamp >= existingTimestamp) {
      if (existingHasValue) {
        delete mergedEntries[entryKey];
        valueChanged = true;
      }
      mergedTimestamps[entryKey] = incomingTimestamp;
    }
  }

  return {
    value: mergedEntries,
    updatedAt: mergedTimestamps,
    changed: valueChanged || !areTimestampMapsEqual(existingTimestamps, mergedTimestamps),
  };
}

export async function createSettingsStore(options: CreateSettingsStoreOptions = {}) {
  const storeName = options.name ?? "proclaimer";
  const storageKey =
    options.storageKey ?? (options.name ? `${options.name}:settings` : SETTINGS_STORAGE_KEY);
  const storage = options.storage ?? getDefaultStorage();

  const initCollection = async (): Promise<SettingsCollection> => {
    const instance = createCollection(
      localStorageCollectionOptions<StoredSettingsDocument, string>({
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
    const tx = collection.insert({
      ...initialDoc,
      updatedAt: timestampsForPatch(undefined, options.initialSettings ?? {}, Date.now()),
    });
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

  const current = collection.get(DEFAULT_SETTINGS_ID);
  if (current) {
    const normalized = normalizeSettingsDocument(current);
    const legacyCongregationId =
      normalized.congregationId.trim().length === 0 ? readLegacyCongregationId(storage) : null;
    const congregationId = legacyCongregationId ?? normalized.congregationId;
    const legacyPublisher =
      normalized.publisherId.trim().length === 0 && congregationId.trim().length > 0
        ? readLegacyPublisher(storage)
        : null;
    const legacyPatch: SettingsPatch = {};
    if (legacyCongregationId) {
      legacyPatch.congregationId = legacyCongregationId;
    }
    if (legacyPublisher && legacyPublisher.congregationId === congregationId) {
      legacyPatch.publisherId = legacyPublisher.id;
    }
    const legacyMidweekSelectorSettings = readLegacyMidweekSelectorSettings(storage);
    const hasMissingMidweekSelectorSettings = Object.keys(legacyMidweekSelectorSettings).some(
      (participationId) =>
        normalized.midweekSelectorSettings[
          participationId as keyof typeof normalized.midweekSelectorSettings
        ] === undefined,
    );
    if (hasMissingMidweekSelectorSettings) {
      legacyPatch.midweekSelectorSettings = {
        ...legacyMidweekSelectorSettings,
        ...normalized.midweekSelectorSettings,
      };
    }
    if (Object.keys(legacyPatch).length > 0) {
      await applyCollectionUpdate(legacyPatch, {});
    }
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
  const snapshotSubscription = collection.subscribeChanges(syncSettingsSnapshot, {
    includeInitialState: true,
  });

  async function getSettings(): Promise<SettingsDocument> {
    const cached = collection.get(DEFAULT_SETTINGS_ID);
    if (cached) {
      return normalizeSettingsDocument(cached);
    }
    return { ...DEFAULT_SETTINGS };
  }

  async function applyCollectionUpdate(
    sanitized: SettingsPatch,
    updatedAt: SettingsUpdatedAt,
  ): Promise<void> {
    const keys = settingsKeysInPatch(sanitized);
    const tx = collection.update(DEFAULT_SETTINGS_ID, (draft) => {
      Object.assign(draft, sanitized);
      const mergedUpdatedAt = normalizeSettingsUpdatedAt(draft.updatedAt);
      for (const key of keys) {
        const nextTimestamp = updatedAt[key];
        if (nextTimestamp === undefined) {
          continue;
        }
        if (isRecordSettingsKey(key)) {
          setUpdatedAtValue(mergedUpdatedAt, key, {
            ...entryTimestampsFor(mergedUpdatedAt, key),
            ...(nextTimestamp as Record<string, number>),
          });
        } else {
          setUpdatedAtValue(mergedUpdatedAt, key, nextTimestamp as number);
        }
      }
      draft.updatedAt = mergedUpdatedAt;
    });
    await tx.isPersisted.promise;
  }

  function validateSettingsPatch(patch: SettingsPatch): SettingsPatch {
    for (const key of SETTINGS_KEYS) {
      if (patch[key] !== undefined && !isSettingValue(key, patch[key])) {
        throw new Error(`Invalid settings value for "${key}"`);
      }
    }
    const sanitized = toSettingsPatch(patch);
    if (Object.keys(sanitized).length === 0) {
      throw new Error("Invalid settings patch: at least one valid setting is required");
    }
    return sanitized;
  }

  async function applySettingsPatch(
    sanitized: SettingsPatch,
    updatedAt: SettingsUpdatedAt,
  ): Promise<SettingsDocument> {
    if (collection.has(DEFAULT_SETTINGS_ID)) {
      await applyCollectionUpdate(sanitized, updatedAt);
    } else {
      const next = normalizeSettingsDocument({
        ...DEFAULT_SETTINGS,
        ...sanitized,
        id: DEFAULT_SETTINGS_ID,
      });
      try {
        const tx = collection.insert({ ...next, updatedAt });
        await tx.isPersisted.promise;
      } catch (error) {
        if (!collection.has(DEFAULT_SETTINGS_ID)) {
          throw error;
        }
        await applyCollectionUpdate(sanitized, updatedAt);
      }
    }
    const updated = await getSettings();
    writeSettingsSnapshot(storage, storageKey, updated);
    return updated;
  }

  async function updateSettings(patch: SettingsPatch): Promise<SettingsDocument> {
    const sanitized = validateSettingsPatch(patch);
    return applySettingsPatch(
      sanitized,
      timestampsForPatch(collection.get(DEFAULT_SETTINGS_ID), sanitized, Date.now()),
    );
  }

  async function getSettingsUpdatedAt(): Promise<SettingsUpdatedAt> {
    return normalizeSettingsUpdatedAt(collection.get(DEFAULT_SETTINGS_ID)?.updatedAt);
  }

  async function mergeImportedSettings(
    patch: SettingsPatch,
    incomingUpdatedAt: SettingsUpdatedAt = {},
  ): Promise<SettingsDocument> {
    const sanitized = validateSettingsPatch(patch);
    const existing = collection.get(DEFAULT_SETTINGS_ID);
    const existingUpdatedAt = normalizeSettingsUpdatedAt(existing?.updatedAt);
    const normalizedIncomingUpdatedAt = normalizeSettingsUpdatedAt(incomingUpdatedAt);
    const mergedPatch: SettingsPatch = {};
    const mergedUpdatedAt: SettingsUpdatedAt = {};

    for (const key of settingsKeysInPatch(sanitized)) {
      if (isRecordSettingsKey(key)) {
        const merged = mergeRecordSetting(
          key,
          existing?.[key],
          sanitized[key],
          entryTimestampsFor(existingUpdatedAt, key),
          entryTimestampsFor(normalizedIncomingUpdatedAt, key),
        );
        if (!existing || merged.changed) {
          (mergedPatch as Partial<Record<SettingsKey, unknown>>)[key] = merged.value;
          setUpdatedAtValue(mergedUpdatedAt, key, merged.updatedAt);
        }
        continue;
      }

      const incomingTimestamp = (normalizedIncomingUpdatedAt[key] as number | undefined) ?? 0;
      const existingTimestamp = (existingUpdatedAt[key] as number | undefined) ?? 0;
      if (!existing || incomingTimestamp >= existingTimestamp) {
        (mergedPatch as Partial<Record<SettingsKey, unknown>>)[key] = sanitized[key];
        setUpdatedAtValue(mergedUpdatedAt, key, incomingTimestamp);
      }
    }

    if (Object.keys(mergedPatch).length === 0) {
      return getSettings();
    }
    return applySettingsPatch(mergedPatch, mergedUpdatedAt);
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
    getSettingsUpdatedAt,
    mergeImportedSettings,
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

import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { expect, test } from "vite-plus/test";
import {
  AppearanceSettingsSection,
  applyTheme,
  areSettingsEqual,
  createSettingsBinaryFilename,
  createSettingsStore,
  DARK_PALETTE_CLASS,
  DataSettingsSection,
  decodeSettingsBinary,
  DEFAULT_SETTINGS_ID,
  downloadSettingsBinary,
  encodeSettingsBinary,
  exportSettingsBinary,
  getSettingsStore,
  importSettingsBinary,
  importSettingsBinaryFile,
  isSettingsDocument,
  isThemeMode,
  isValidSettingsId,
  normalizeSettingsDocument,
  resetDefaultSettingsStoreForTesting,
  SETTINGS_BINARY_EXTENSION,
  SETTINGS_BINARY_FILENAME,
  SETTINGS_ID_MAX_LENGTH,
  SETTINGS_KEYS,
  SETTINGS_STORAGE_KEY,
  SettingsSection,
  settingsSnapshotStorageKey,
  SettingsView,
  THEME_LABELS,
  THEME_MODES,
  THEME_OPTIONS,
  toSettingsPatch,
  useSettings,
  type SettingsPatch,
  type StorageApi,
} from "../src/feature/settings/index.ts";

let storeCounter = 0;
function nextStoreName() {
  storeCounter += 1;
  return `proclaimer_test_${Date.now()}_${storeCounter}`;
}

test("validates theme modes, schema helpers, and binary filename formatting", () => {
  expect(SETTINGS_BINARY_EXTENSION).toBe(".pro");
  expect(SETTINGS_BINARY_FILENAME).toBe("settings.pro");
  expect(createSettingsBinaryFilename(new Date(2026, 9, 23, 14, 5, 9))).toBe(
    "settings-2026-10-23_14-05-09.pro",
  );
  expect(THEME_MODES).toEqual(["light", "dark", "system"]);
  expect(SETTINGS_KEYS).toEqual(["theme"]);
  expect(THEME_LABELS).toEqual({ light: "Light", dark: "Dark", system: "System" });
  expect(THEME_OPTIONS).toEqual([
    { value: "light", label: "Light" },
    { value: "dark", label: "Dark" },
    { value: "system", label: "System" },
  ]);
  expect(isThemeMode("light")).toBe(true);
  expect(isThemeMode("dark")).toBe(true);
  expect(isThemeMode("system")).toBe(true);
  expect(isThemeMode("solarized")).toBe(false);
  expect(isThemeMode(null)).toBe(false);

  expect(normalizeSettingsDocument(undefined)).toEqual({
    id: DEFAULT_SETTINGS_ID,
    theme: "system",
  });
  expect(normalizeSettingsDocument({ id: "", theme: "dark" })).toEqual({
    id: DEFAULT_SETTINGS_ID,
    theme: "dark",
  });
  const overlongId = "a".repeat(SETTINGS_ID_MAX_LENGTH + 1);
  expect(isValidSettingsId(DEFAULT_SETTINGS_ID)).toBe(true);
  expect(isValidSettingsId("")).toBe(false);
  expect(isValidSettingsId(overlongId)).toBe(false);
  expect(isSettingsDocument({ id: DEFAULT_SETTINGS_ID, theme: "dark" })).toBe(true);
  expect(isSettingsDocument({ id: overlongId, theme: "dark" })).toBe(false);
  expect(normalizeSettingsDocument({ id: overlongId, theme: "dark" })).toEqual({
    id: DEFAULT_SETTINGS_ID,
    theme: "dark",
  });
  expect(toSettingsPatch({ id: "custom", theme: "light" })).toEqual({ theme: "light" });
  expect(
    areSettingsEqual(
      { id: DEFAULT_SETTINGS_ID, theme: "dark" },
      { id: DEFAULT_SETTINGS_ID, theme: "dark" },
    ),
  ).toBe(true);
  expect(
    areSettingsEqual(
      { id: DEFAULT_SETTINGS_ID, theme: "dark" },
      { id: DEFAULT_SETTINGS_ID, theme: "light" },
    ),
  ).toBe(false);

  expect(typeof SettingsView).toBe("function");
  expect(typeof SettingsSection).toBe("function");
  expect(typeof AppearanceSettingsSection).toBe("function");
  expect(typeof DataSettingsSection).toBe("function");
});

test("initializes LocalStorage Collection store with default system theme and updates settings", async () => {
  const storeName = nextStoreName();
  const store = await createSettingsStore({ name: storeName });
  try {
    const initial = await store.getSettings();
    expect(initial).toEqual({ id: DEFAULT_SETTINGS_ID, theme: "system" });
    expect(store.collection.get(DEFAULT_SETTINGS_ID)?.theme).toBe("system");

    const updatedDark = await store.setTheme("dark");
    expect(updatedDark.theme).toBe("dark");
    expect(store.collection.get(DEFAULT_SETTINGS_ID)?.theme).toBe("dark");

    const rawStored = store.storage.getItem(store.storageKey);
    expect(rawStored).toBeTruthy();
    expect(store.collection.utils.getStorageSize()).toBeGreaterThan(0);

    const peerStore = await createSettingsStore({ name: storeName, storage: store.storage });
    try {
      expect((await peerStore.getSettings()).theme).toBe("dark");
    } finally {
      await peerStore.close();
    }

    const updatedLight = await store.setSetting("theme", "light");
    expect(updatedLight.theme).toBe("light");
    expect(store.collection.get(DEFAULT_SETTINGS_ID)?.theme).toBe("light");

    await expect(store.updateSettings({})).rejects.toThrow(
      "Invalid settings patch: at least one valid setting is required",
    );
    await expect(
      store.updateSettings({ theme: "bogus" } as unknown as SettingsPatch),
    ).rejects.toThrow('Invalid settings value for "theme"');
  } finally {
    await store.close();
  }
});

test("exports settings to a binary Uint8Array and imports into another store", async () => {
  const sourceStore = await createSettingsStore({ name: nextStoreName() });
  const targetStore = await createSettingsStore({ name: nextStoreName() });

  try {
    await sourceStore.setTheme("dark");
    const binary = await exportSettingsBinary(sourceStore);
    expect(binary).toBeInstanceOf(Uint8Array);
    expect(binary.byteLength).toBeGreaterThan(7);

    const decoded = decodeSettingsBinary(binary);
    expect(decoded).toEqual({ id: DEFAULT_SETTINGS_ID, theme: "dark" });

    const imported = await importSettingsBinary(binary, targetStore);
    expect(imported).toEqual({ id: DEFAULT_SETTINGS_ID, theme: "dark" });
    expect((await targetStore.getSettings()).theme).toBe("dark");

    const blob = new Blob([binary], { type: "application/octet-stream" });
    await sourceStore.setTheme("light");
    const lightBinary = await exportSettingsBinary(sourceStore);
    const lightBlob = new Blob([lightBinary], { type: "application/octet-stream" });

    const fileImported = await importSettingsBinaryFile(lightBlob, targetStore);
    expect(fileImported.theme).toBe("light");
    expect((await targetStore.getSettings()).theme).toBe("light");
    expect(blob.size).toBeGreaterThan(0);

    const downloaded = await downloadSettingsBinary(targetStore, "");
    expect(decodeSettingsBinary(downloaded)).toEqual({ id: DEFAULT_SETTINGS_ID, theme: "light" });
  } finally {
    await sourceStore.close();
    await targetStore.close();
  }
});

test("rejects invalid binary payloads", () => {
  expect(() => decodeSettingsBinary(new Uint8Array([1, 2, 3]))).toThrow(
    "Invalid settings binary: file is too short",
  );
  expect(() =>
    decodeSettingsBinary(new Uint8Array([0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 123, 125])),
  ).toThrow("Invalid settings binary: unrecognized header");

  const valid = encodeSettingsBinary({ id: DEFAULT_SETTINGS_ID, theme: "dark" });
  const corrupted = new Uint8Array(valid);
  corrupted[corrupted.length - 1] = 0x00;
  expect(() => decodeSettingsBinary(corrupted)).toThrow(
    "Invalid settings binary: corrupted payload",
  );

  const magic = valid.subarray(0, 11);
  const makeBinaryPayload = (payload: unknown) => {
    const body = new TextEncoder().encode(JSON.stringify(payload));
    const out = new Uint8Array(magic.length + body.length);
    out.set(magic, 0);
    out.set(body, magic.length);
    return out;
  };

  expect(() => decodeSettingsBinary(makeBinaryPayload({ theme: "invalid" }))).toThrow(
    "Invalid settings binary: invalid theme value",
  );
  expect(() => decodeSettingsBinary(makeBinaryPayload({}))).toThrow(
    "Invalid settings binary: no valid settings found",
  );
  expect(
    decodeSettingsBinary(
      makeBinaryPayload({ id: "x".repeat(SETTINGS_ID_MAX_LENGTH + 5), theme: "dark" }),
    ),
  ).toEqual({ id: DEFAULT_SETTINGS_ID, theme: "dark" });
});

test("applies dark class to target element based on theme", () => {
  const fakeElement = {
    dataset: {} as Record<string, string>,
    classes: new Set<string>(),
    classList: {
      toggle(className: string, force?: boolean) {
        if (force) {
          fakeElement.classes.add(className);
        } else {
          fakeElement.classes.delete(className);
        }
        return Boolean(force);
      },
    },
  };

  expect(applyTheme("dark", fakeElement as unknown as HTMLElement)).toBe(true);
  expect(fakeElement.classes.has(DARK_PALETTE_CLASS)).toBe(true);
  expect(fakeElement.dataset.theme).toBe("dark");

  expect(applyTheme("light", fakeElement as unknown as HTMLElement)).toBe(false);
  expect(fakeElement.classes.has(DARK_PALETTE_CLASS)).toBe(false);
  expect(fakeElement.dataset.theme).toBe("light");
});

test("persists settings in localStorage when available and resets default store cleanly", async () => {
  const storageMap = new Map<string, string>();
  const previousLocalStorage = globalThis.localStorage;
  Object.defineProperty(globalThis, "localStorage", {
    configurable: true,
    value: {
      getItem: (key: string) => storageMap.get(key) ?? null,
      setItem: (key: string, value: string) => {
        storageMap.set(key, value);
      },
      removeItem: (key: string) => {
        storageMap.delete(key);
      },
    },
  });

  try {
    const store = await getSettingsStore();
    expect(store.storageKey).toBe(SETTINGS_STORAGE_KEY);
    await store.setTheme("light");
    expect(storageMap.get(SETTINGS_STORAGE_KEY)).toBeTruthy();
    expect(Array.from(storageMap.keys())).toEqual([
      SETTINGS_STORAGE_KEY,
      settingsSnapshotStorageKey(SETTINGS_STORAGE_KEY),
    ]);

    await store.close();

    function Probe() {
      const { theme } = useSettings();
      return createElement("span", null, theme);
    }
    expect(renderToStaticMarkup(createElement(Probe))).toBe("<span>light</span>");

    const reopened = await getSettingsStore();
    expect(reopened).not.toBe(store);
    expect((await reopened.getSettings()).theme).toBe("light");
    await resetDefaultSettingsStoreForTesting();
  } finally {
    Object.defineProperty(globalThis, "localStorage", {
      configurable: true,
      value: previousLocalStorage,
    });
  }
});

test("ignores persisted entries whose data id does not match the storage key", () => {
  const storageMap = new Map<string, string>();
  const previousLocalStorage = globalThis.localStorage;
  Object.defineProperty(globalThis, "localStorage", {
    configurable: true,
    value: {
      getItem: (key: string) => storageMap.get(key) ?? null,
      setItem: (key: string, value: string) => {
        storageMap.set(key, value);
      },
      removeItem: (key: string) => {
        storageMap.delete(key);
      },
    },
  });
  storageMap.set(
    SETTINGS_STORAGE_KEY,
    JSON.stringify({
      "s:default": { versionKey: "v1", data: { id: "other", theme: "dark" } },
    }),
  );

  try {
    function Probe() {
      const { theme } = useSettings();
      return createElement("span", null, theme);
    }
    expect(renderToStaticMarkup(createElement(Probe))).toBe("<span>system</span>");
  } finally {
    Object.defineProperty(globalThis, "localStorage", {
      configurable: true,
      value: previousLocalStorage,
    });
  }
});

test("preloads persisted settings from the in-memory fallback when localStorage is unavailable", async () => {
  const previousLocalStorage = globalThis.localStorage;
  Object.defineProperty(globalThis, "localStorage", {
    configurable: true,
    value: undefined,
  });

  try {
    const store = await getSettingsStore();
    await store.setTheme("dark");
    await store.close();

    function Probe() {
      const { theme } = useSettings();
      return createElement("span", null, theme);
    }
    expect(renderToStaticMarkup(createElement(Probe))).toBe("<span>dark</span>");
  } finally {
    await resetDefaultSettingsStoreForTesting();
    Object.defineProperty(globalThis, "localStorage", {
      configurable: true,
      value: previousLocalStorage,
    });
  }
});

test("recovers from malformed or corrupt data in storage and falls back to defaults", async () => {
  const corruptValues = [
    "not-valid-json{",
    "null",
    JSON.stringify({ theme: "dark" }),
    JSON.stringify({ "s:default": { version: 1, data: null } }),
    JSON.stringify({ "s:default": { versionKey: "v1", data: { id: "", theme: "dark" } } }),
    JSON.stringify({
      "s:default": { versionKey: "v1", data: { id: DEFAULT_SETTINGS_ID, theme: "bogus" } },
    }),
  ];

  for (const corruptValue of corruptValues) {
    const storageMap = new Map<string, string>();
    const storage: StorageApi = {
      getItem: (key) => storageMap.get(key) ?? null,
      setItem: (key, value) => {
        storageMap.set(key, value);
      },
      removeItem: (key) => {
        storageMap.delete(key);
      },
    };
    const storeName = nextStoreName();
    const storageKey = `${storeName}:settings`;
    storage.setItem(storageKey, corruptValue);

    const store = await createSettingsStore({
      name: storeName,
      storageKey,
      storage,
      initialSettings: { theme: "dark" },
    });
    try {
      const settings = await store.getSettings();
      expect(settings).toEqual({ id: DEFAULT_SETTINGS_ID, theme: "dark" });
    } finally {
      await store.close();
    }
  }
});

test("does not wipe storage when init fails with a non-format storage error", async () => {
  let removed = false;
  const storage: StorageApi = {
    getItem: () => {
      throw new Error("Transient storage read failure");
    },
    setItem: () => {},
    removeItem: () => {
      removed = true;
    },
  };

  await expect(createSettingsStore({ name: nextStoreName(), storage })).rejects.toThrow(
    "Transient storage read failure",
  );
  expect(removed).toBe(false);
});

test("surfaces underlying storage error when insert fails and key is missing", async () => {
  const storageMap = new Map<string, string>();
  let failWrites = false;
  const storage: StorageApi = {
    getItem: (key) => storageMap.get(key) ?? null,
    setItem: (key, value) => {
      if (failWrites) {
        throw new Error("QuotaExceededError: storage full");
      }
      storageMap.set(key, value);
    },
    removeItem: (key) => {
      storageMap.delete(key);
    },
  };

  const store = await createSettingsStore({ name: nextStoreName(), storage });
  try {
    const deleteTx = store.collection.delete(DEFAULT_SETTINGS_ID);
    await deleteTx.isPersisted.promise;
    expect(store.collection.has(DEFAULT_SETTINGS_ID)).toBe(false);

    failWrites = true;
    await expect(store.setTheme("dark")).rejects.toThrow("QuotaExceededError: storage full");
  } finally {
    failWrites = false;
    await store.close();
  }
});

import { expect, test } from "vite-plus/test";
import {
  applyTheme,
  createSettingsBinaryFilename,
  createSettingsStore,
  DARK_PALETTE_CLASS,
  decodeSettingsBinary,
  DEFAULT_SETTINGS_ID,
  downloadSettingsBinary,
  encodeSettingsBinary,
  exportSettingsBinary,
  getCachedTheme,
  getSettingsStore,
  importSettingsBinary,
  importSettingsBinaryFile,
  isThemeMode,
  resetDefaultSettingsStoreForTesting,
  setCachedTheme,
  SETTINGS_BINARY_EXTENSION,
  SETTINGS_BINARY_FILENAME,
  THEME_MODES,
  THEME_STORAGE_KEY,
} from "../src/feature/settings/index.ts";

let dbCounter = 0;
function nextDbName() {
  dbCounter += 1;
  return `subbie_test_${Date.now()}_${dbCounter}`;
}

test("validates theme modes and binary filename formatting", () => {
  expect(SETTINGS_BINARY_EXTENSION).toBe(".sub");
  expect(SETTINGS_BINARY_FILENAME).toBe("settings.sub");
  expect(createSettingsBinaryFilename(new Date("2026-10-23T14:05:09.000Z"))).toBe(
    "settings-2026-10-23_14-05-09.sub",
  );
  expect(THEME_MODES).toEqual(["light", "dark", "system"]);
  expect(isThemeMode("light")).toBe(true);
  expect(isThemeMode("dark")).toBe(true);
  expect(isThemeMode("system")).toBe(true);
  expect(isThemeMode("solarized")).toBe(false);
  expect(isThemeMode(null)).toBe(false);
});

test("initializes RxDB and TanStack DB store with default system theme and updates theme", async () => {
  const store = await createSettingsStore({ name: nextDbName() });
  try {
    const initial = await store.getSettings();
    expect(initial).toEqual({ id: DEFAULT_SETTINGS_ID, theme: "system" });
    expect(store.collection.get(DEFAULT_SETTINGS_ID)?.theme).toBe("system");

    const updatedDark = await store.setTheme("dark");
    expect(updatedDark.theme).toBe("dark");
    expect(store.collection.get(DEFAULT_SETTINGS_ID)?.theme).toBe("dark");

    const rxDoc = await store.rxCollection.findOne(DEFAULT_SETTINGS_ID).exec();
    expect(rxDoc?.theme).toBe("dark");

    const updatedLight = await store.setTheme("light");
    expect(updatedLight.theme).toBe("light");
    expect(store.collection.get(DEFAULT_SETTINGS_ID)?.theme).toBe("light");
  } finally {
    await store.close();
  }
});

test("exports settings to a binary Uint8Array and imports into another store", async () => {
  const sourceStore = await createSettingsStore({ name: nextDbName() });
  const targetStore = await createSettingsStore({ name: nextDbName() });

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
  expect(() => decodeSettingsBinary(new Uint8Array([0, 0, 0, 0, 0, 0, 0, 123, 125]))).toThrow(
    "Invalid settings binary: unrecognized header",
  );

  const valid = encodeSettingsBinary({ id: DEFAULT_SETTINGS_ID, theme: "dark" });
  const corrupted = new Uint8Array(valid);
  corrupted[corrupted.length - 1] = 0x00;
  expect(() => decodeSettingsBinary(corrupted)).toThrow(
    "Invalid settings binary: corrupted payload",
  );
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

test("caches theme in localStorage when available and resets default store cleanly", async () => {
  const storageMap = new Map<string, string>();
  const previousLocalStorage = globalThis.localStorage;
  Object.defineProperty(globalThis, "localStorage", {
    configurable: true,
    value: {
      getItem: (key: string) => storageMap.get(key) ?? null,
      setItem: (key: string, value: string) => {
        storageMap.set(key, value);
      },
    },
  });

  try {
    expect(getCachedTheme()).toBeNull();
    setCachedTheme("dark");
    expect(storageMap.get(THEME_STORAGE_KEY)).toBe("dark");
    expect(getCachedTheme()).toBe("dark");

    const store = await getSettingsStore();
    await store.setTheme("light");
    expect(getCachedTheme()).toBe("light");

    await store.close();
    const reopened = await getSettingsStore();
    expect(reopened).not.toBe(store);
    await resetDefaultSettingsStoreForTesting();
  } finally {
    Object.defineProperty(globalThis, "localStorage", {
      configurable: true,
      value: previousLocalStorage,
    });
  }
});

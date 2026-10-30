import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { expect, test } from "vite-plus/test";
import {
  ABN_MAX_LENGTH,
  AppearanceSettingsSection,
  AppearanceSettingsView,
  applyTheme,
  areSettingsEqual,
  BANK_ACCOUNT_NAME_MAX_LENGTH,
  BANK_ACCOUNT_NUMBER_MAX_LENGTH,
  BANK_BSB_MAX_LENGTH,
  BankSettingsSection,
  BankSettingsView,
  BUSINESS_NAME_MAX_LENGTH,
  BusinessSettingsSection,
  BusinessSettingsView,
  createSettingsStore,
  DARK_PALETTE_CLASS,
  DataSettingsSection,
  DataSettingsView,
  DEFAULT_SETTINGS,
  DEFAULT_SETTINGS_ID,
  getSettingsStore,
  INVOICE_NOTES_MAX_LENGTH,
  InvoiceSettingsView,
  isAbn,
  isBankAccountName,
  isBankAccountNumber,
  isBankBsb,
  isBusinessName,
  isGstRate,
  isGstRegistered,
  isInvoiceNotes,
  isPaymentTermsDays,
  isSettingsDocument,
  isSettingValue,
  isThemeMode,
  isValidSettingsId,
  normalizeSettingsDocument,
  resetDefaultSettingsStoreForTesting,
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
  return `subbie_test_${Date.now()}_${storeCounter}`;
}

test("validates theme modes and schema helpers", () => {
  expect(THEME_MODES).toEqual(["light", "dark", "system"]);
  expect(SETTINGS_KEYS).toEqual([
    "theme",
    "defaultPaymentTermsDays",
    "defaultInvoiceNotes",
    "gstRegistered",
    "gstRate",
    "defaultGstType",
    "businessName",
    "abn",
    "bankAccountName",
    "bankBsb",
    "bankAccountNumber",
  ]);
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

  expect(isPaymentTermsDays(0)).toBe(true);
  expect(isPaymentTermsDays(30)).toBe(true);
  expect(isPaymentTermsDays(365)).toBe(true);
  expect(isPaymentTermsDays(-1)).toBe(false);
  expect(isPaymentTermsDays(366)).toBe(false);
  expect(isPaymentTermsDays(1.5)).toBe(false);
  expect(isPaymentTermsDays("30")).toBe(false);
  expect(isInvoiceNotes("")).toBe(true);
  expect(isInvoiceNotes("a".repeat(INVOICE_NOTES_MAX_LENGTH))).toBe(true);
  expect(isInvoiceNotes("a".repeat(INVOICE_NOTES_MAX_LENGTH + 1))).toBe(false);
  expect(isInvoiceNotes(42)).toBe(false);
  expect(isGstRegistered(true)).toBe(true);
  expect(isGstRegistered(false)).toBe(true);
  expect(isGstRegistered("true")).toBe(false);
  expect(isGstRate(0.1)).toBe(true);
  expect(isGstRate(1)).toBe(true);
  expect(isGstRate(0)).toBe(false);
  expect(isGstRate(-0.1)).toBe(false);
  expect(isGstRate(1.5)).toBe(false);
  expect(isGstRate("0.1")).toBe(false);
  expect(isSettingValue("defaultGstType", "gst-free")).toBe(true);
  expect(isSettingValue("defaultGstType", "none")).toBe(false);
  expect(isBusinessName("Acme Pty Ltd")).toBe(true);
  expect(isBusinessName("")).toBe(true);
  expect(isBusinessName("a".repeat(BUSINESS_NAME_MAX_LENGTH + 1))).toBe(false);
  expect(isBusinessName(null)).toBe(false);
  expect(isAbn("51 824 753 556")).toBe(true);
  expect(isAbn("")).toBe(true);
  expect(isAbn("a".repeat(ABN_MAX_LENGTH + 1))).toBe(false);
  expect(isAbn(51824753556)).toBe(false);
  expect(isBankAccountName("Acme Pty Ltd")).toBe(true);
  expect(isBankAccountName("a".repeat(BANK_ACCOUNT_NAME_MAX_LENGTH + 1))).toBe(false);
  expect(isBankAccountName(null)).toBe(false);
  expect(isBankBsb("062-001")).toBe(true);
  expect(isBankBsb("062001")).toBe(true);
  expect(isBankBsb("a".repeat(BANK_BSB_MAX_LENGTH + 1))).toBe(false);
  expect(isBankAccountNumber("123456789")).toBe(true);
  expect(isBankAccountNumber("a".repeat(BANK_ACCOUNT_NUMBER_MAX_LENGTH + 1))).toBe(false);
  expect(isBankAccountNumber(123456789)).toBe(false);

  expect(normalizeSettingsDocument(undefined)).toEqual({ ...DEFAULT_SETTINGS });
  expect(normalizeSettingsDocument({ id: "", theme: "dark" })).toEqual({
    ...DEFAULT_SETTINGS,
    theme: "dark",
  });
  const overlongId = "a".repeat(SETTINGS_ID_MAX_LENGTH + 1);
  expect(isValidSettingsId(DEFAULT_SETTINGS_ID)).toBe(true);
  expect(isValidSettingsId("")).toBe(false);
  expect(isValidSettingsId(overlongId)).toBe(false);
  expect(isSettingsDocument({ ...DEFAULT_SETTINGS, theme: "dark" })).toBe(true);
  expect(isSettingsDocument({ ...DEFAULT_SETTINGS, id: overlongId })).toBe(false);
  expect(normalizeSettingsDocument({ id: overlongId, theme: "dark" })).toEqual({
    ...DEFAULT_SETTINGS,
    theme: "dark",
  });
  expect(toSettingsPatch({ id: "custom", theme: "light" })).toEqual({ theme: "light" });
  expect(
    areSettingsEqual(
      { ...DEFAULT_SETTINGS, theme: "dark" },
      { ...DEFAULT_SETTINGS, theme: "dark" },
    ),
  ).toBe(true);
  expect(
    areSettingsEqual(
      { ...DEFAULT_SETTINGS, theme: "dark" },
      { ...DEFAULT_SETTINGS, theme: "light" },
    ),
  ).toBe(false);

  expect(typeof SettingsView).toBe("function");
  expect(typeof SettingsSection).toBe("function");
  expect(typeof AppearanceSettingsSection).toBe("function");
  expect(typeof AppearanceSettingsView).toBe("function");
  expect(typeof BankSettingsSection).toBe("function");
  expect(typeof BankSettingsView).toBe("function");
  expect(typeof BusinessSettingsSection).toBe("function");
  expect(typeof BusinessSettingsView).toBe("function");
  expect(typeof DataSettingsSection).toBe("function");
  expect(typeof DataSettingsView).toBe("function");
  expect(typeof InvoiceSettingsView).toBe("function");
});

test("initializes LocalStorage Collection store with default system theme and updates settings", async () => {
  const storeName = nextStoreName();
  const store = await createSettingsStore({ name: storeName });
  try {
    const initial = await store.getSettings();
    expect(initial).toEqual({ ...DEFAULT_SETTINGS });
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

    const patched = await store.updateSettings({
      defaultPaymentTermsDays: 14,
      defaultInvoiceNotes: "Please pay by bank transfer",
      gstRegistered: false,
      gstRate: 0.05,
      defaultGstType: "gst-free",
      businessName: "Acme Pty Ltd",
      abn: "51 824 753 556",
      bankAccountName: "Acme Pty Ltd",
      bankBsb: "062-001",
      bankAccountNumber: "123456789",
    });
    expect(patched.defaultPaymentTermsDays).toBe(14);
    expect(patched.defaultInvoiceNotes).toBe("Please pay by bank transfer");
    expect(patched.gstRegistered).toBe(false);
    expect(patched.gstRate).toBe(0.05);
    expect(patched.defaultGstType).toBe("gst-free");
    expect(patched.businessName).toBe("Acme Pty Ltd");
    expect(patched.abn).toBe("51 824 753 556");
    expect(patched.bankAccountName).toBe("Acme Pty Ltd");
    expect(patched.bankBsb).toBe("062-001");
    expect(patched.bankAccountNumber).toBe("123456789");
    expect(patched.theme).toBe("light");
    expect((await store.getSettings()).gstRate).toBe(0.05);
    expect((await store.getSettings()).bankBsb).toBe("062-001");

    await expect(store.updateSettings({})).rejects.toThrow(
      "Invalid settings patch: at least one valid setting is required",
    );
    await expect(
      store.updateSettings({ theme: "bogus" } as unknown as SettingsPatch),
    ).rejects.toThrow('Invalid settings value for "theme"');
    await expect(store.updateSettings({ gstRate: 0 })).rejects.toThrow(
      'Invalid settings value for "gstRate"',
    );
    await expect(store.updateSettings({ gstRate: 1.5 })).rejects.toThrow(
      'Invalid settings value for "gstRate"',
    );
    await expect(store.updateSettings({ defaultPaymentTermsDays: 30.5 })).rejects.toThrow(
      'Invalid settings value for "defaultPaymentTermsDays"',
    );
    await expect(
      store.updateSettings({ defaultGstType: "bogus" } as unknown as SettingsPatch),
    ).rejects.toThrow('Invalid settings value for "defaultGstType"');
    await expect(
      store.updateSettings({ businessName: "a".repeat(BUSINESS_NAME_MAX_LENGTH + 1) }),
    ).rejects.toThrow('Invalid settings value for "businessName"');
    await expect(store.updateSettings({ abn: "a".repeat(ABN_MAX_LENGTH + 1) })).rejects.toThrow(
      'Invalid settings value for "abn"',
    );
    await expect(
      store.updateSettings({ bankBsb: "a".repeat(BANK_BSB_MAX_LENGTH + 1) }),
    ).rejects.toThrow('Invalid settings value for "bankBsb"');
  } finally {
    await store.close();
  }
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
      expect(settings).toEqual({ ...DEFAULT_SETTINGS, theme: "dark" });
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

import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { expect, test, vi } from "vite-plus/test";

import { createCollection, localStorageCollectionOptions } from "@tanstack/react-db";

import type { Publisher, PublisherCollection } from "../src/feature/publisher/index.ts";
import {
  AppearanceSettingsSection,
  applyTheme,
  areSettingsEqual,
  createSettingsBinaryFilename,
  createSettingsStore,
  DARK_PALETTE_CLASS,
  DataSettingsSection,
  DEFAULT_EMERGENCY_CONTACTS_VISIBLE_TYPES,
  DEFAULT_MIDWEEK_ANY_STAT_PARTICIPATION_TYPES,
  DEFAULT_MIDWEEK_SELECTOR_SETTINGS,
  decodeSettingsBinary,
  DEFAULT_SETTINGS_ID,
  downloadSettingsBinary,
  encodeSettingsBinary,
  exportSettingsBinary,
  getSettingsStore,
  importSettingsBinary,
  importSettingsBinaryFile,
  isCongregationId,
  isEmergencyContactsShowArchived,
  isEmergencyContactsVisibleTypes,
  isMapEditColorScheme,
  isNotAtHomeStaleDays,
  isNotAtHomeVisibility,
  isPublisherId,
  isRecentMapCount,
  isRecentSelectedMaps,
  isSelectedMap,
  isSelectedMaps,
  isSettingsDocument,
  isThemeMode,
  isValidSettingsId,
  LEGACY_SELECTED_CONGREGATION_KEY,
  legacyMidweekSelectorSettingsKey,
  midweekSelectorSettingsSchema,
  normalizeSettingsDocument,
  PublisherSettingsSection,
  RECENT_MAP_COUNT_CHOICES,
  recordRecentMapSelection,
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
  expect(SETTINGS_KEYS).toEqual([
    "theme",
    "congregationId",
    "publisherId",
    "selectedMaps",
    "recentSelectedMaps",
    "recentMapCount",
    "notAtHomeStaleDays",
    "notAtHomeVisibility",
    "mapEditColorScheme",
    "emergencyContactsVisibleTypes",
    "emergencyContactsShowArchived",
    "midweekSelectorSettings",
  ]);
  expect(DEFAULT_MIDWEEK_ANY_STAT_PARTICIPATION_TYPES).toEqual([
    "chairman",
    "prayer",
    "treasures",
    "gems",
    "bible_reading",
    "apply",
    "assistant",
    "counselor",
    "living",
    "cbs_conductor",
    "cbs_reader",
  ]);
  expect(DEFAULT_MIDWEEK_SELECTOR_SETTINGS).toEqual({
    gender: "all",
    statParticipationTypes: DEFAULT_MIDWEEK_ANY_STAT_PARTICIPATION_TYPES,
  });
  expect(
    midweekSelectorSettingsSchema.safeParse({ gender: "all", statParticipationTypes: [] }).success,
  ).toBe(true);
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
    congregationId: "",
    publisherId: "",
    selectedMaps: {},
    recentSelectedMaps: {},
    recentMapCount: 5,
    notAtHomeStaleDays: 90,
    notAtHomeVisibility: "all",
    mapEditColorScheme: "multicolored",
    emergencyContactsVisibleTypes: DEFAULT_EMERGENCY_CONTACTS_VISIBLE_TYPES,
    emergencyContactsShowArchived: false,
    midweekSelectorSettings: {},
  });
  expect(normalizeSettingsDocument({ id: "", theme: "dark" })).toEqual({
    id: DEFAULT_SETTINGS_ID,
    theme: "dark",
    congregationId: "",
    publisherId: "",
    selectedMaps: {},
    recentSelectedMaps: {},
    recentMapCount: 5,
    notAtHomeStaleDays: 90,
    notAtHomeVisibility: "all",
    mapEditColorScheme: "multicolored",
    emergencyContactsVisibleTypes: DEFAULT_EMERGENCY_CONTACTS_VISIBLE_TYPES,
    emergencyContactsShowArchived: false,
    midweekSelectorSettings: {},
  });
  const overlongId = "a".repeat(SETTINGS_ID_MAX_LENGTH + 1);
  expect(isValidSettingsId(DEFAULT_SETTINGS_ID)).toBe(true);
  expect(isValidSettingsId("")).toBe(false);
  expect(isValidSettingsId(overlongId)).toBe(false);
  expect(isCongregationId("")).toBe(true);
  expect(isCongregationId("congregation-1")).toBe(true);
  expect(isCongregationId("   ")).toBe(false);
  expect(isCongregationId("a".repeat(65))).toBe(false);
  expect(isPublisherId("")).toBe(true);
  expect(isPublisherId("publisher-1")).toBe(true);
  expect(isPublisherId("   ")).toBe(false);
  expect(isPublisherId("a".repeat(65))).toBe(false);
  expect(isSelectedMap("")).toBe(false);
  expect(isSelectedMap("map-1")).toBe(true);
  expect(isSelectedMap("   ")).toBe(false);
  expect(isSelectedMap("a".repeat(257))).toBe(false);
  expect(isSelectedMaps({})).toBe(true);
  expect(isSelectedMaps({ "congregation-1": "map-1" })).toBe(true);
  expect(isSelectedMaps({ "congregation-1": "" })).toBe(false);
  expect(isSelectedMaps({ "": "map-1" })).toBe(false);
  expect(isSelectedMaps("map-1")).toBe(false);
  expect(RECENT_MAP_COUNT_CHOICES).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
  expect(isRecentMapCount(5)).toBe(true);
  expect(isRecentMapCount(0)).toBe(true);
  expect(isRecentMapCount(10)).toBe(true);
  expect(isRecentMapCount(-1)).toBe(false);
  expect(isRecentMapCount(11)).toBe(false);
  expect(isRecentMapCount(1.5)).toBe(false);
  expect(isRecentMapCount("5")).toBe(false);
  expect(isRecentSelectedMaps({})).toBe(true);
  expect(isRecentSelectedMaps({ "congregation-1": ["map-2", "map-1"] })).toBe(true);
  expect(isRecentSelectedMaps({ "congregation-1": ["map-1", ""] })).toBe(false);
  expect(isRecentSelectedMaps({ "congregation-1": "map-1" })).toBe(false);
  expect(isRecentSelectedMaps({ "": ["map-1"] })).toBe(false);
  expect(recordRecentMapSelection({}, "congregation-1", "map-1")).toEqual({
    "congregation-1": ["map-1"],
  });
  expect(
    recordRecentMapSelection({ "congregation-1": ["map-1", "map-2"] }, "congregation-1", "map-2"),
  ).toEqual({ "congregation-1": ["map-2", "map-1"] });
  expect(recordRecentMapSelection({}, "congregation-1", "map-2", "map-1")).toEqual({
    "congregation-1": ["map-2", "map-1"],
  });
  expect(
    recordRecentMapSelection(
      { "congregation-1": Array.from({ length: 10 }, (_, index) => `map-${index}`) },
      "congregation-1",
      "map-new",
    )["congregation-1"],
  ).toHaveLength(10);
  expect(isNotAtHomeStaleDays(90)).toBe(true);
  expect(isNotAtHomeStaleDays(0)).toBe(true);
  expect(isNotAtHomeStaleDays(-1)).toBe(false);
  expect(isNotAtHomeStaleDays(366)).toBe(false);
  expect(isNotAtHomeStaleDays(1.5)).toBe(false);
  expect(isNotAtHomeStaleDays("90")).toBe(false);
  expect(isNotAtHomeVisibility("all")).toBe(true);
  expect(isNotAtHomeVisibility("hide_old")).toBe(true);
  expect(isNotAtHomeVisibility("hide_new")).toBe(true);
  expect(isNotAtHomeVisibility("none")).toBe(false);
  expect(isNotAtHomeVisibility(null)).toBe(false);
  expect(isMapEditColorScheme("standard")).toBe(true);
  expect(isMapEditColorScheme("multicolored")).toBe(true);
  expect(isMapEditColorScheme("rainbow")).toBe(false);
  expect(isMapEditColorScheme(null)).toBe(false);
  expect(isEmergencyContactsVisibleTypes([])).toBe(true);
  expect(isEmergencyContactsVisibleTypes(["publisher", "inactive"])).toBe(true);
  expect(isEmergencyContactsVisibleTypes(["invalid"])).toBe(false);
  expect(isEmergencyContactsVisibleTypes(null)).toBe(false);
  expect(isEmergencyContactsShowArchived(true)).toBe(true);
  expect(isEmergencyContactsShowArchived(false)).toBe(true);
  expect(isEmergencyContactsShowArchived("true")).toBe(false);
  expect(
    isSettingsDocument({
      id: DEFAULT_SETTINGS_ID,
      theme: "dark",
      congregationId: "",
      publisherId: "",
      selectedMaps: {},
      recentSelectedMaps: {},
      recentMapCount: 5,
      notAtHomeStaleDays: 90,
      notAtHomeVisibility: "all",
      mapEditColorScheme: "multicolored",
      emergencyContactsVisibleTypes: DEFAULT_EMERGENCY_CONTACTS_VISIBLE_TYPES,
      emergencyContactsShowArchived: false,
      midweekSelectorSettings: {},
    }),
  ).toBe(true);
  expect(isSettingsDocument({ id: DEFAULT_SETTINGS_ID, theme: "dark", congregationId: "  " })).toBe(
    false,
  );
  expect(isSettingsDocument({ id: overlongId, theme: "dark" })).toBe(false);
  expect(normalizeSettingsDocument({ id: overlongId, theme: "dark" })).toEqual({
    id: DEFAULT_SETTINGS_ID,
    theme: "dark",
    congregationId: "",
    publisherId: "",
    selectedMaps: {},
    recentSelectedMaps: {},
    recentMapCount: 5,
    notAtHomeStaleDays: 90,
    notAtHomeVisibility: "all",
    mapEditColorScheme: "multicolored",
    emergencyContactsVisibleTypes: DEFAULT_EMERGENCY_CONTACTS_VISIBLE_TYPES,
    emergencyContactsShowArchived: false,
    midweekSelectorSettings: {},
  });
  expect(toSettingsPatch({ id: "custom", theme: "light" })).toEqual({ theme: "light" });
  expect(
    areSettingsEqual(
      {
        id: DEFAULT_SETTINGS_ID,
        theme: "dark",
        congregationId: "",
        publisherId: "",
        selectedMaps: {},
        recentSelectedMaps: {},
        recentMapCount: 5,
        notAtHomeStaleDays: 90,
        notAtHomeVisibility: "all",
        mapEditColorScheme: "multicolored",
        emergencyContactsVisibleTypes: DEFAULT_EMERGENCY_CONTACTS_VISIBLE_TYPES,
        emergencyContactsShowArchived: false,
        midweekSelectorSettings: {},
      },
      {
        id: DEFAULT_SETTINGS_ID,
        theme: "dark",
        congregationId: "",
        publisherId: "",
        selectedMaps: {},
        recentSelectedMaps: {},
        recentMapCount: 5,
        notAtHomeStaleDays: 90,
        notAtHomeVisibility: "all",
        mapEditColorScheme: "multicolored",
        emergencyContactsVisibleTypes: DEFAULT_EMERGENCY_CONTACTS_VISIBLE_TYPES,
        emergencyContactsShowArchived: false,
        midweekSelectorSettings: {},
      },
    ),
  ).toBe(true);
  expect(
    areSettingsEqual(
      {
        id: DEFAULT_SETTINGS_ID,
        theme: "dark",
        congregationId: "",
        publisherId: "",
        selectedMaps: {},
        recentSelectedMaps: {},
        recentMapCount: 5,
        notAtHomeStaleDays: 90,
        notAtHomeVisibility: "all",
        mapEditColorScheme: "multicolored",
        emergencyContactsVisibleTypes: DEFAULT_EMERGENCY_CONTACTS_VISIBLE_TYPES,
        emergencyContactsShowArchived: false,
        midweekSelectorSettings: {},
      },
      {
        id: DEFAULT_SETTINGS_ID,
        theme: "light",
        congregationId: "",
        publisherId: "",
        selectedMaps: {},
        recentSelectedMaps: {},
        recentMapCount: 5,
        notAtHomeStaleDays: 90,
        notAtHomeVisibility: "all",
        mapEditColorScheme: "multicolored",
        emergencyContactsVisibleTypes: DEFAULT_EMERGENCY_CONTACTS_VISIBLE_TYPES,
        emergencyContactsShowArchived: false,
        midweekSelectorSettings: {},
      },
    ),
  ).toBe(false);
  expect(
    areSettingsEqual(
      {
        id: DEFAULT_SETTINGS_ID,
        theme: "dark",
        congregationId: "",
        publisherId: "",
        selectedMaps: { "congregation-1": "map-1" },
        recentSelectedMaps: {},
        recentMapCount: 5,
        notAtHomeStaleDays: 90,
        notAtHomeVisibility: "all",
        mapEditColorScheme: "multicolored",
        emergencyContactsVisibleTypes: DEFAULT_EMERGENCY_CONTACTS_VISIBLE_TYPES,
        emergencyContactsShowArchived: false,
        midweekSelectorSettings: {},
      },
      {
        id: DEFAULT_SETTINGS_ID,
        theme: "dark",
        congregationId: "",
        publisherId: "",
        selectedMaps: { "congregation-1": "map-1" },
        recentSelectedMaps: {},
        recentMapCount: 5,
        notAtHomeStaleDays: 90,
        notAtHomeVisibility: "all",
        mapEditColorScheme: "multicolored",
        emergencyContactsVisibleTypes: DEFAULT_EMERGENCY_CONTACTS_VISIBLE_TYPES,
        emergencyContactsShowArchived: false,
        midweekSelectorSettings: {},
      },
    ),
  ).toBe(true);
  expect(
    areSettingsEqual(
      {
        id: DEFAULT_SETTINGS_ID,
        theme: "dark",
        congregationId: "",
        publisherId: "",
        selectedMaps: { "congregation-1": "map-1" },
        recentSelectedMaps: {},
        recentMapCount: 5,
        notAtHomeStaleDays: 90,
        notAtHomeVisibility: "all",
        mapEditColorScheme: "multicolored",
        emergencyContactsVisibleTypes: DEFAULT_EMERGENCY_CONTACTS_VISIBLE_TYPES,
        emergencyContactsShowArchived: false,
        midweekSelectorSettings: {},
      },
      {
        id: DEFAULT_SETTINGS_ID,
        theme: "dark",
        congregationId: "",
        publisherId: "",
        selectedMaps: { "congregation-1": "map-2" },
        recentSelectedMaps: {},
        recentMapCount: 5,
        notAtHomeStaleDays: 90,
        notAtHomeVisibility: "all",
        mapEditColorScheme: "multicolored",
        emergencyContactsVisibleTypes: DEFAULT_EMERGENCY_CONTACTS_VISIBLE_TYPES,
        emergencyContactsShowArchived: false,
        midweekSelectorSettings: {},
      },
    ),
  ).toBe(false);

  const recentBase = normalizeSettingsDocument({ theme: "dark" });
  expect(
    areSettingsEqual(
      { ...recentBase, recentSelectedMaps: { "congregation-1": ["map-2", "map-1"] } },
      { ...recentBase, recentSelectedMaps: { "congregation-1": ["map-2", "map-1"] } },
    ),
  ).toBe(true);
  expect(
    areSettingsEqual(
      { ...recentBase, recentSelectedMaps: { "congregation-1": ["map-2", "map-1"] } },
      { ...recentBase, recentSelectedMaps: { "congregation-1": ["map-1", "map-2"] } },
    ),
  ).toBe(false);
  expect(areSettingsEqual({ ...recentBase, recentMapCount: 3 }, recentBase)).toBe(false);

  expect(typeof SettingsView).toBe("function");
  expect(typeof SettingsSection).toBe("function");
  expect(typeof AppearanceSettingsSection).toBe("function");
  expect(typeof DataSettingsSection).toBe("function");
  expect(typeof PublisherSettingsSection).toBe("function");
});

test("offers account sign-in only when the selected publisher is linked to an account", async () => {
  const storageMap = new Map<string, string>();
  const collection = createCollection(
    localStorageCollectionOptions<Publisher, string>({
      id: `publishers_test_${Date.now()}`,
      storageKey: `publishers_test_${Date.now()}`,
      storage: {
        getItem: (key) => storageMap.get(key) ?? null,
        setItem: (key, value) => {
          storageMap.set(key, value);
        },
        removeItem: (key) => {
          storageMap.delete(key);
        },
      },
      getKey: (publisher) => publisher.id ?? "",
      startSync: true,
    }),
  );

  try {
    await collection.preload();
    const tx = collection.insert([
      {
        id: "p1",
        first_name: "Alice",
        last_name: "Anderson",
        congregation_id: "c1",
        auth_id: "auth-1",
      },
      { id: "p2", first_name: "Bob", last_name: "Brown", congregation_id: "c1" },
    ]);
    await tx.isPersisted.promise;

    const render = (publisherId: string) =>
      renderToStaticMarkup(
        createElement(PublisherSettingsSection, {
          congregationId: "c1",
          publisherId,
          publisherCollection: collection as unknown as PublisherCollection,
        }),
      );

    const linked = render("p1");
    expect(linked).toContain("Anderson, Alice");
    expect(linked).toContain("Sign in to your account");
    expect(linked).not.toContain("Signed in");

    const unlinked = render("p2");
    expect(unlinked).toContain("Brown, Bob");
    expect(unlinked).not.toContain("Sign in to your account");
  } finally {
    await collection.cleanup().catch(() => {});
  }
});

test("initializes LocalStorage Collection store with default system theme and updates settings", async () => {
  const storeName = nextStoreName();
  const store = await createSettingsStore({ name: storeName });
  try {
    const initial = await store.getSettings();
    expect(initial).toEqual({
      id: DEFAULT_SETTINGS_ID,
      theme: "system",
      congregationId: "",
      publisherId: "",
      selectedMaps: {},
      recentSelectedMaps: {},
      recentMapCount: 5,
      notAtHomeStaleDays: 90,
      notAtHomeVisibility: "all",
      mapEditColorScheme: "multicolored",
      emergencyContactsVisibleTypes: DEFAULT_EMERGENCY_CONTACTS_VISIBLE_TYPES,
      emergencyContactsShowArchived: false,
      midweekSelectorSettings: {},
    });
    expect(store.collection.get(DEFAULT_SETTINGS_ID)?.theme).toBe("system");

    const updatedDark = await store.setTheme("dark");
    expect(updatedDark.theme).toBe("dark");
    expect(store.collection.get(DEFAULT_SETTINGS_ID)?.theme).toBe("dark");

    const updatedMap = await store.setSetting("selectedMaps", { "congregation-1": "map-1" });
    expect(updatedMap.selectedMaps).toEqual({ "congregation-1": "map-1" });
    expect(store.collection.get(DEFAULT_SETTINGS_ID)?.selectedMaps).toEqual({
      "congregation-1": "map-1",
    });

    const rawStored = store.storage.getItem(store.storageKey);
    expect(rawStored).toBeTruthy();
    expect(store.collection.utils.getStorageSize()).toBeGreaterThan(0);

    const peerStore = await createSettingsStore({ name: storeName, storage: store.storage });
    try {
      expect((await peerStore.getSettings()).theme).toBe("dark");
      expect((await peerStore.getSettingsUpdatedAt()).theme).toBe(
        (await store.getSettingsUpdatedAt()).theme,
      );
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

test("migrates legacy midweek selector settings into the settings store", async () => {
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
  storageMap.set(
    legacyMidweekSelectorSettingsKey("apply"),
    JSON.stringify({ gender: "female", statParticipationTypes: ["bible_reading", "apply"] }),
  );
  storageMap.set(legacyMidweekSelectorSettingsKey("prayer"), "not-json");

  const store = await createSettingsStore({ name: nextStoreName(), storage });
  try {
    const settings = await store.getSettings();
    expect(settings.midweekSelectorSettings).toEqual({
      apply: { gender: "female", statParticipationTypes: ["bible_reading", "apply"] },
    });
  } finally {
    await store.close();
  }
});

test("does not treat legacy migration time as a settings edit timestamp", async () => {
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
  storageMap.set(LEGACY_SELECTED_CONGREGATION_KEY, JSON.stringify({ id: "legacy-congregation" }));
  storageMap.set(
    legacyMidweekSelectorSettingsKey("apply"),
    JSON.stringify({ gender: "female", statParticipationTypes: ["apply"] }),
  );

  const sourceStore = await createSettingsStore({ name: nextStoreName() });
  const now = vi.spyOn(Date, "now");
  let targetStore: Awaited<ReturnType<typeof createSettingsStore>> | undefined;

  try {
    now.mockReturnValue(3_000);
    await sourceStore.updateSettings({
      congregationId: "imported-congregation",
      midweekSelectorSettings: {
        apply: { gender: "male", statParticipationTypes: ["living"] },
      },
    });
    const binary = await exportSettingsBinary(sourceStore);

    now.mockReturnValue(5_000);
    targetStore = await createSettingsStore({ name: nextStoreName(), storage });
    expect((await targetStore.getSettings()).congregationId).toBe("legacy-congregation");
    expect((await targetStore.getSettingsUpdatedAt()).congregationId).toBeUndefined();
    expect((await targetStore.getSettingsUpdatedAt()).midweekSelectorSettings).toBeUndefined();

    const imported = await importSettingsBinary(binary, targetStore);
    expect(imported.congregationId).toBe("imported-congregation");
    expect(imported.midweekSelectorSettings).toEqual({
      apply: { gender: "male", statParticipationTypes: ["living"] },
    });

    const updatedAt = await targetStore.getSettingsUpdatedAt();
    expect(updatedAt.congregationId).toBe(3_000);
    expect(updatedAt.midweekSelectorSettings?.apply).toBe(3_000);
  } finally {
    now.mockRestore();
    await sourceStore.close();
    await targetStore?.close();
  }
});

test("exports settings to a binary Uint8Array and imports into another store", async () => {
  const sourceStore = await createSettingsStore({ name: nextStoreName() });
  const targetStore = await createSettingsStore({ name: nextStoreName() });

  try {
    await sourceStore.updateSettings({
      theme: "dark",
      recentMapCount: 3,
      recentSelectedMaps: { "congregation-1": ["map-2", "map-1"] },
      mapEditColorScheme: "multicolored",
      emergencyContactsVisibleTypes: ["publisher", "inactive"],
      emergencyContactsShowArchived: true,
      midweekSelectorSettings: {
        apply: { gender: "male", statParticipationTypes: ["apply", "assistant"] },
      },
    });
    const binary = await exportSettingsBinary(sourceStore);
    expect(binary).toBeInstanceOf(Uint8Array);
    expect(binary.byteLength).toBeGreaterThan(7);

    const decoded = decodeSettingsBinary(binary);
    expect(decoded).toEqual({
      id: DEFAULT_SETTINGS_ID,
      theme: "dark",
      congregationId: "",
      publisherId: "",
      selectedMaps: {},
      recentSelectedMaps: { "congregation-1": ["map-2", "map-1"] },
      recentMapCount: 3,
      notAtHomeStaleDays: 90,
      notAtHomeVisibility: "all",
      mapEditColorScheme: "multicolored",
      emergencyContactsVisibleTypes: ["publisher", "inactive"],
      emergencyContactsShowArchived: true,
      midweekSelectorSettings: {
        apply: { gender: "male", statParticipationTypes: ["apply", "assistant"] },
      },
    });

    const imported = await importSettingsBinary(binary, targetStore);
    expect(imported).toEqual({
      id: DEFAULT_SETTINGS_ID,
      theme: "dark",
      congregationId: "",
      publisherId: "",
      selectedMaps: {},
      recentSelectedMaps: { "congregation-1": ["map-2", "map-1"] },
      recentMapCount: 3,
      notAtHomeStaleDays: 90,
      notAtHomeVisibility: "all",
      mapEditColorScheme: "multicolored",
      emergencyContactsVisibleTypes: ["publisher", "inactive"],
      emergencyContactsShowArchived: true,
      midweekSelectorSettings: {
        apply: { gender: "male", statParticipationTypes: ["apply", "assistant"] },
      },
    });
    expect((await targetStore.getSettings()).theme).toBe("dark");

    const blob = new Blob([binary], { type: "application/octet-stream" });
    await sourceStore.updateSettings({
      theme: "light",
      recentMapCount: 5,
      recentSelectedMaps: {},
      emergencyContactsVisibleTypes: DEFAULT_EMERGENCY_CONTACTS_VISIBLE_TYPES,
      emergencyContactsShowArchived: false,
      midweekSelectorSettings: {},
    });
    const lightBinary = await exportSettingsBinary(sourceStore);
    const lightBlob = new Blob([lightBinary], { type: "application/octet-stream" });

    const fileImported = await importSettingsBinaryFile(lightBlob, targetStore);
    expect(fileImported.theme).toBe("light");
    expect((await targetStore.getSettings()).theme).toBe("light");
    expect(blob.size).toBeGreaterThan(0);

    const downloaded = await downloadSettingsBinary(targetStore, "");
    expect(decodeSettingsBinary(downloaded)).toEqual({
      id: DEFAULT_SETTINGS_ID,
      theme: "light",
      congregationId: "",
      publisherId: "",
      selectedMaps: {},
      recentSelectedMaps: {},
      recentMapCount: 5,
      notAtHomeStaleDays: 90,
      notAtHomeVisibility: "all",
      mapEditColorScheme: "multicolored",
      emergencyContactsVisibleTypes: DEFAULT_EMERGENCY_CONTACTS_VISIBLE_TYPES,
      emergencyContactsShowArchived: false,
      midweekSelectorSettings: {},
    });
  } finally {
    await sourceStore.close();
    await targetStore.close();
  }
});

test("merges imported settings by per-setting update timestamps", async () => {
  const sourceStore = await createSettingsStore({ name: nextStoreName() });
  const targetStore = await createSettingsStore({ name: nextStoreName() });
  const now = vi.spyOn(Date, "now");

  try {
    now.mockReturnValue(1_000);
    await sourceStore.setSetting("theme", "dark");
    now.mockReturnValue(2_000);
    await sourceStore.setSetting("recentMapCount", 3);
    const binary = await exportSettingsBinary(sourceStore);

    now.mockReturnValue(3_000);
    await targetStore.setSetting("theme", "light");
    now.mockReturnValue(500);
    await targetStore.setSetting("recentMapCount", 5);

    const imported = await importSettingsBinary(binary, targetStore);
    expect(imported.theme).toBe("light");
    expect(imported.recentMapCount).toBe(3);

    const updatedAt = await targetStore.getSettingsUpdatedAt();
    expect(updatedAt.theme).toBe(3_000);
    expect(updatedAt.recentMapCount).toBe(2_000);
  } finally {
    now.mockRestore();
    await sourceStore.close();
    await targetStore.close();
  }
});

test("preserves timestamps for unchanged record entries during local updates", async () => {
  const store = await createSettingsStore({ name: nextStoreName() });
  const now = vi.spyOn(Date, "now");

  try {
    now.mockReturnValue(1_000);
    await store.setSetting("selectedMaps", {
      congregation1: "map-1",
      congregation2: "map-2",
    });
    now.mockReturnValue(2_000);
    await store.setSetting("selectedMaps", {
      congregation1: "map-1-updated",
      congregation2: "map-2",
    });

    expect((await store.getSettingsUpdatedAt()).selectedMaps).toEqual({
      congregation1: 2_000,
      congregation2: 1_000,
    });
  } finally {
    now.mockRestore();
    await store.close();
  }
});

test("merges record-valued settings entries independently", async () => {
  const sourceStore = await createSettingsStore({ name: nextStoreName() });
  const targetStore = await createSettingsStore({ name: nextStoreName() });
  const now = vi.spyOn(Date, "now");

  try {
    now.mockReturnValue(1_000);
    await sourceStore.updateSettings({
      selectedMaps: { congregation1: "map-source", shared: "map-source" },
      midweekSelectorSettings: {
        apply: { gender: "male", statParticipationTypes: ["apply"] },
      },
    });
    const binary = await exportSettingsBinary(sourceStore);

    now.mockReturnValue(2_000);
    await targetStore.updateSettings({
      selectedMaps: { congregation2: "map-target", shared: "map-target" },
      midweekSelectorSettings: {
        living: { gender: "female", statParticipationTypes: ["living"] },
      },
    });

    const imported = await importSettingsBinary(binary, targetStore);
    expect(imported.selectedMaps).toEqual({
      congregation1: "map-source",
      congregation2: "map-target",
      shared: "map-target",
    });
    expect(imported.midweekSelectorSettings).toEqual({
      apply: { gender: "male", statParticipationTypes: ["apply"] },
      living: { gender: "female", statParticipationTypes: ["living"] },
    });

    const updatedAt = await targetStore.getSettingsUpdatedAt();
    expect(updatedAt.selectedMaps?.congregation1).toBe(1_000);
    expect(updatedAt.selectedMaps?.congregation2).toBe(2_000);
    expect(updatedAt.selectedMaps?.shared).toBe(2_000);
    expect(updatedAt.midweekSelectorSettings?.apply).toBe(1_000);
    expect(updatedAt.midweekSelectorSettings?.living).toBe(2_000);
  } finally {
    now.mockRestore();
    await sourceStore.close();
    await targetStore.close();
  }
});

test("propagates newer record entry deletions on import", async () => {
  const sourceStore = await createSettingsStore({ name: nextStoreName() });
  const targetStore = await createSettingsStore({ name: nextStoreName() });
  const now = vi.spyOn(Date, "now");

  try {
    now.mockReturnValue(1_000);
    await sourceStore.setSetting("selectedMaps", { congregation1: "map-source" });
    now.mockReturnValue(2_000);
    await sourceStore.setSetting("selectedMaps", {});
    const binary = await exportSettingsBinary(sourceStore);

    now.mockReturnValue(1_500);
    await targetStore.setSetting("selectedMaps", { congregation1: "map-target" });

    const imported = await importSettingsBinary(binary, targetStore);
    expect(imported.selectedMaps).toEqual({});
    expect((await targetStore.getSettingsUpdatedAt()).selectedMaps?.congregation1).toBe(2_000);
  } finally {
    now.mockRestore();
    await sourceStore.close();
    await targetStore.close();
  }
});

test("keeps local settings when every imported setting is older", async () => {
  const sourceStore = await createSettingsStore({ name: nextStoreName() });
  const targetStore = await createSettingsStore({ name: nextStoreName() });
  const now = vi.spyOn(Date, "now");

  try {
    now.mockReturnValue(1_000);
    await sourceStore.setSetting("theme", "dark");
    const binary = await exportSettingsBinary(sourceStore);

    now.mockReturnValue(2_000);
    await targetStore.setSetting("theme", "light");
    const imported = await importSettingsBinary(binary, targetStore);

    expect(imported.theme).toBe("light");
    expect((await targetStore.getSettings()).theme).toBe("light");
    expect((await targetStore.getSettingsUpdatedAt()).theme).toBe(2_000);
  } finally {
    now.mockRestore();
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

  const valid = encodeSettingsBinary({
    id: DEFAULT_SETTINGS_ID,
    theme: "dark",
    congregationId: "",
    publisherId: "",
    selectedMaps: {},
    recentSelectedMaps: {},
    recentMapCount: 5,
    notAtHomeStaleDays: 90,
    notAtHomeVisibility: "all",
    mapEditColorScheme: "multicolored",
    emergencyContactsVisibleTypes: DEFAULT_EMERGENCY_CONTACTS_VISIBLE_TYPES,
    emergencyContactsShowArchived: false,
    midweekSelectorSettings: {},
  });
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
  expect(() => decodeSettingsBinary(makeBinaryPayload({ recentMapCount: 11 }))).toThrow(
    "Invalid settings binary: invalid recentMapCount value",
  );
  expect(() => decodeSettingsBinary(makeBinaryPayload({ mapEditColorScheme: "rainbow" }))).toThrow(
    "Invalid settings binary: invalid mapEditColorScheme value",
  );
  expect(() => decodeSettingsBinary(makeBinaryPayload({}))).toThrow(
    "Invalid settings binary: no valid settings found",
  );
  expect(
    decodeSettingsBinary(
      makeBinaryPayload({ id: "x".repeat(SETTINGS_ID_MAX_LENGTH + 5), theme: "dark" }),
    ),
  ).toEqual({
    id: DEFAULT_SETTINGS_ID,
    theme: "dark",
    congregationId: "",
    publisherId: "",
    selectedMaps: {},
    recentSelectedMaps: {},
    recentMapCount: 5,
    notAtHomeStaleDays: 90,
    notAtHomeVisibility: "all",
    mapEditColorScheme: "multicolored",
    emergencyContactsVisibleTypes: DEFAULT_EMERGENCY_CONTACTS_VISIBLE_TYPES,
    emergencyContactsShowArchived: false,
    midweekSelectorSettings: {},
  });
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
      expect(settings).toEqual({
        id: DEFAULT_SETTINGS_ID,
        theme: "dark",
        congregationId: "",
        publisherId: "",
        selectedMaps: {},
        recentSelectedMaps: {},
        recentMapCount: 5,
        notAtHomeStaleDays: 90,
        notAtHomeVisibility: "all",
        mapEditColorScheme: "multicolored",
        emergencyContactsVisibleTypes: DEFAULT_EMERGENCY_CONTACTS_VISIBLE_TYPES,
        emergencyContactsShowArchived: false,
        midweekSelectorSettings: {},
      });
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

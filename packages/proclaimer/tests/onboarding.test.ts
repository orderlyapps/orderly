import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { expect, test } from "vite-plus/test";

import { createCollection, localStorageCollectionOptions } from "@tanstack/react-db";

import { initSupabase, resetSupabaseClientForTesting } from "../src/feature/backend/index.ts";
import {
  getCongregationCollection,
  resetCongregationCollectionForTesting,
  type Congregation,
  type CongregationCollection,
} from "../src/feature/congregation/index.ts";
import {
  createOnboardingPatch,
  isOnboardingComplete,
  OnboardingGate,
  OnboardingView,
} from "../src/feature/onboarding/index.ts";
import {
  getPublisherDisplayName,
  usePublishers,
  type Publisher,
  type PublisherCollection,
} from "../src/feature/publisher/index.ts";
import {
  CONGREGATION_ID_MAX_LENGTH,
  createSettingsStore,
  DEFAULT_SETTINGS,
  LEGACY_SELECTED_CONGREGATION_KEY,
  LEGACY_SELECTED_PUBLISHER_KEY,
  readLegacyCongregationId,
  readLegacyPublisher,
  type StorageApi,
} from "../src/feature/settings/index.ts";

let storeCounter = 0;
function nextStoreName() {
  storeCounter += 1;
  return `proclaimer_test_${Date.now()}_${storeCounter}`;
}

test("detects onboarding completion and builds settings patches", () => {
  expect(isOnboardingComplete(DEFAULT_SETTINGS)).toBe(false);
  expect(isOnboardingComplete({ ...DEFAULT_SETTINGS, congregationId: "   " })).toBe(false);
  expect(isOnboardingComplete({ ...DEFAULT_SETTINGS, congregationId: "congregation-1" })).toBe(
    true,
  );

  expect(createOnboardingPatch({ congregationId: "congregation-1" })).toEqual({
    congregationId: "congregation-1",
    publisherId: "",
  });
  expect(createOnboardingPatch({ congregationId: "  congregation-1  " })).toEqual({
    congregationId: "congregation-1",
    publisherId: "",
  });
  expect(
    createOnboardingPatch({ congregationId: "congregation-1", publisherId: "publisher-1" }),
  ).toEqual({
    congregationId: "congregation-1",
    publisherId: "publisher-1",
  });
  expect(
    createOnboardingPatch({ congregationId: "congregation-1", publisherId: "  publisher-1  " }),
  ).toEqual({
    congregationId: "congregation-1",
    publisherId: "publisher-1",
  });

  expect(createOnboardingPatch({ congregationId: "" })).toBeNull();
  expect(createOnboardingPatch({ congregationId: "   " })).toBeNull();
  expect(
    createOnboardingPatch({ congregationId: "a".repeat(CONGREGATION_ID_MAX_LENGTH + 1) }),
  ).toBeNull();
});

test("gate renders onboarding until a congregation is saved", async () => {
  const store = await createSettingsStore({ name: nextStoreName() });
  try {
    const onboarding = createElement("p", null, "onboarding");
    const app = createElement("p", null, "app");

    const render = () =>
      renderToStaticMarkup(createElement(OnboardingGate, { store, onboarding }, app));

    expect(render()).toBe("<p>onboarding</p>");

    const patch = createOnboardingPatch({ congregationId: "congregation-1" });
    expect(patch).not.toBeNull();
    if (!patch) {
      throw new Error("Expected onboarding patch to be valid");
    }
    const updated = await store.updateSettings(patch);
    expect(isOnboardingComplete(updated)).toBe(true);
    expect(updated.congregationId).toBe("congregation-1");

    expect(render()).toBe("<p>app</p>");
  } finally {
    await store.close();
  }
});

test("renders the onboarding form with a hidden continue button", async () => {
  const store = await createSettingsStore({ name: nextStoreName() });
  try {
    const markup = renderToStaticMarkup(createElement(OnboardingView, { store }));
    expect(markup).toContain("Welcome to Proclaimer");
    expect(markup).toContain("<ion-select");
    expect(markup).not.toContain("ion-button");
  } finally {
    await store.close();
  }
});

test("renders congregation options from a provided collection", async () => {
  const storageMap = new Map<string, string>();
  const collection = createCollection(
    localStorageCollectionOptions<Congregation, string>({
      id: `congregations_test_${Date.now()}`,
      storageKey: `congregations_test_${Date.now()}`,
      storage: {
        getItem: (key) => storageMap.get(key) ?? null,
        setItem: (key, value) => {
          storageMap.set(key, value);
        },
        removeItem: (key) => {
          storageMap.delete(key);
        },
      },
      getKey: (congregation) => congregation.id ?? "",
      startSync: true,
    }),
  );

  const store = await createSettingsStore({ name: nextStoreName() });
  try {
    await collection.preload();
    const tx = collection.insert([
      { id: "c2", name: "Beta Congregation" },
      { id: "c1", name: "Alpha Congregation" },
      { id: "c3", name: "Placeholder Congregation", congregation_id: "c1" },
      { name: "Anonymous Congregation" },
    ]);
    await tx.isPersisted.promise;

    const markup = renderToStaticMarkup(
      createElement(OnboardingView, {
        store,
        collection: collection as unknown as CongregationCollection,
      }),
    );
    expect(markup).toContain("Alpha Congregation");
    expect(markup).toContain("Beta Congregation");
    expect(markup).not.toContain("Placeholder Congregation");
    expect(markup).not.toContain("Anonymous Congregation");
    expect(markup).not.toContain("Retry");
  } finally {
    await store.close();
    await collection.cleanup().catch(() => {});
  }
});

test("asks for the congregation password when the selected congregation has one", async () => {
  const storageMap = new Map<string, string>();
  const collection = createCollection(
    localStorageCollectionOptions<Congregation, string>({
      id: `congregations_test_password_${Date.now()}`,
      storageKey: `congregations_test_password_${Date.now()}`,
      storage: {
        getItem: (key) => storageMap.get(key) ?? null,
        setItem: (key, value) => {
          storageMap.set(key, value);
        },
        removeItem: (key) => {
          storageMap.delete(key);
        },
      },
      getKey: (congregation) => congregation.id ?? "",
      startSync: true,
    }),
  );

  const store = await createSettingsStore({ name: nextStoreName() });
  try {
    await collection.preload();
    const tx = collection.insert([
      { id: "c1", name: "Alpha Congregation", password: "letmein" },
      { id: "c2", name: "Beta Congregation" },
    ]);
    await tx.isPersisted.promise;

    const render = () =>
      renderToStaticMarkup(
        createElement(OnboardingView, {
          store,
          collection: collection as unknown as CongregationCollection,
        }),
      );

    await store.updateSettings({ congregationId: "c1" });
    const protectedMarkup = render();
    expect(protectedMarkup).toContain("<ion-input");
    expect(protectedMarkup).not.toContain("ion-button");

    await store.updateSettings({ congregationId: "c2" });
    const openMarkup = render();
    expect(openMarkup).not.toContain("<ion-input");
    expect(openMarkup).toContain("ion-button");
    expect(openMarkup).not.toContain("disabled");

    await store.updateSettings({ congregationId: "unknown-congregation" });
    const unresolvedMarkup = render();
    expect(unresolvedMarkup).not.toContain("<ion-input");
    expect(unresolvedMarkup).not.toContain("ion-button");
  } finally {
    await store.close();
    await collection.cleanup().catch(() => {});
  }
});

function createMapStorage(storageMap = new Map<string, string>()): StorageApi {
  return {
    getItem: (key) => storageMap.get(key) ?? null,
    setItem: (key, value) => {
      storageMap.set(key, value);
    },
    removeItem: (key) => {
      storageMap.delete(key);
    },
  };
}

test("reads the congregation id stored by the legacy app", () => {
  const storageMap = new Map<string, string>();
  const storage = createMapStorage(storageMap);

  expect(readLegacyCongregationId(storage)).toBeNull();

  storageMap.set(LEGACY_SELECTED_CONGREGATION_KEY, "not-valid-json{");
  expect(readLegacyCongregationId(storage)).toBeNull();

  storageMap.set(LEGACY_SELECTED_CONGREGATION_KEY, JSON.stringify({ name: "No Id" }));
  expect(readLegacyCongregationId(storage)).toBeNull();

  storageMap.set(LEGACY_SELECTED_CONGREGATION_KEY, JSON.stringify({ id: "   " }));
  expect(readLegacyCongregationId(storage)).toBeNull();

  storageMap.set(
    LEGACY_SELECTED_CONGREGATION_KEY,
    JSON.stringify({ id: "c1", name: "Alpha Congregation", password: "letmein" }),
  );
  expect(readLegacyCongregationId(storage)).toBe("c1");
});

test("migrates the legacy congregation selection into a new settings store", async () => {
  const storageMap = new Map<string, string>();
  const storage = createMapStorage(storageMap);
  storageMap.set(
    LEGACY_SELECTED_CONGREGATION_KEY,
    JSON.stringify({ id: "c1", name: "Alpha Congregation" }),
  );

  const store = await createSettingsStore({ name: nextStoreName(), storage });
  try {
    const settings = await store.getSettings();
    expect(settings.congregationId).toBe("c1");
    expect(isOnboardingComplete(settings)).toBe(true);
    expect(settings.theme).toBe("system");
    // The legacy key is left in place so the previous app keeps working
    expect(storageMap.get(LEGACY_SELECTED_CONGREGATION_KEY)).toBeTruthy();
  } finally {
    await store.close();
  }
});

test("does not overwrite an existing congregation selection with the legacy value", async () => {
  const storageMap = new Map<string, string>();
  const storage = createMapStorage(storageMap);
  const storeName = nextStoreName();

  const first = await createSettingsStore({ name: storeName, storage });
  await first.updateSettings({ congregationId: "c2" });
  await first.close();

  storageMap.set(
    LEGACY_SELECTED_CONGREGATION_KEY,
    JSON.stringify({ id: "c1", name: "Alpha Congregation" }),
  );

  const second = await createSettingsStore({ name: storeName, storage });
  try {
    expect((await second.getSettings()).congregationId).toBe("c2");
  } finally {
    await second.close();
  }
});

test("migrates the legacy selection when settings exist without a congregation", async () => {
  const storageMap = new Map<string, string>();
  const storage = createMapStorage(storageMap);
  const storeName = nextStoreName();

  const first = await createSettingsStore({ name: storeName, storage });
  await first.setTheme("dark");
  await first.close();

  storageMap.set(
    LEGACY_SELECTED_CONGREGATION_KEY,
    JSON.stringify({ id: "c1", name: "Alpha Congregation" }),
  );

  const second = await createSettingsStore({ name: storeName, storage });
  try {
    const settings = await second.getSettings();
    expect(settings.congregationId).toBe("c1");
    expect(settings.theme).toBe("dark");
  } finally {
    await second.close();
  }
});

test("gate renders the app immediately when only the legacy selection exists", () => {
  const storageMap = new Map<string, string>();
  const previousLocalStorage = globalThis.localStorage;
  Object.defineProperty(globalThis, "localStorage", {
    configurable: true,
    value: createMapStorage(storageMap),
  });
  storageMap.set(
    LEGACY_SELECTED_CONGREGATION_KEY,
    JSON.stringify({ id: "c1", name: "Alpha Congregation" }),
  );

  try {
    const markup = renderToStaticMarkup(
      createElement(
        OnboardingGate,
        { onboarding: createElement("p", null, "onboarding") },
        createElement("p", null, "app"),
      ),
    );
    expect(markup).toBe("<p>app</p>");
  } finally {
    Object.defineProperty(globalThis, "localStorage", {
      configurable: true,
      value: previousLocalStorage,
    });
  }
});

test("congregation collection is created lazily once supabase is initialized", async () => {
  initSupabase({ url: "https://example.supabase.co", anonKey: "test-anon-key" });
  try {
    const collection = getCongregationCollection();
    expect(collection).toBe(getCongregationCollection());
    expect(typeof collection.utils.refetch).toBe("function");
    expect(collection.utils.isError).toBe(false);
  } finally {
    await resetCongregationCollectionForTesting();
    resetSupabaseClientForTesting();
  }
});

test("publisher display name prefers display_name and falls back to first_name", () => {
  expect(
    getPublisherDisplayName({ first_name: "Alice", last_name: "Smith", display_name: "Ally" }),
  ).toBe("Smith, Ally");
  expect(getPublisherDisplayName({ first_name: "Alice", last_name: "Smith" })).toBe("Smith, Alice");
  expect(
    getPublisherDisplayName({ first_name: "Alice", last_name: "Smith", display_name: "   " }),
  ).toBe("Smith, Alice");
});

test("usePublishers lists only publishers from the selected congregation, sorted by name", async () => {
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
      { id: "p2", first_name: "Bob", last_name: "Zulu", congregation_id: "c1" },
      { id: "p1", first_name: "Alice", last_name: "Smith", congregation_id: "c1" },
      { id: "p3", first_name: "Carol", last_name: "Jones", congregation_id: "c2" },
      { id: "p4", first_name: "Dan", last_name: "Alpha", congregation_id: "c1" },
    ]);
    await tx.isPersisted.promise;

    function Probe() {
      const { publishers } = usePublishers("c1", collection as unknown as PublisherCollection);
      return createElement(
        "ul",
        null,
        publishers.map((p) => createElement("li", { key: p.id }, getPublisherDisplayName(p))),
      );
    }

    const markup = renderToStaticMarkup(createElement(Probe));
    expect(markup).toContain("Alpha, Dan");
    expect(markup).toContain("Smith, Alice");
    expect(markup).toContain("Zulu, Bob");
    expect(markup).not.toContain("Jones");
    expect(markup.indexOf("Alpha, Dan")).toBeLessThan(markup.indexOf("Smith, Alice"));
    expect(markup.indexOf("Smith, Alice")).toBeLessThan(markup.indexOf("Zulu, Bob"));

    function EmptyProbe() {
      const { publishers } = usePublishers(undefined, collection as unknown as PublisherCollection);
      return createElement("span", null, String(publishers.length));
    }
    expect(renderToStaticMarkup(createElement(EmptyProbe))).toBe("<span>0</span>");
  } finally {
    await collection.cleanup().catch(() => {});
  }
});

test("renders the publisher step with publishers for the selected congregation", async () => {
  const congregationsMap = new Map<string, string>();
  const congregations = createCollection(
    localStorageCollectionOptions<Congregation, string>({
      id: `congregations_test_step_${Date.now()}`,
      storageKey: `congregations_test_step_${Date.now()}`,
      storage: {
        getItem: (key) => congregationsMap.get(key) ?? null,
        setItem: (key, value) => {
          congregationsMap.set(key, value);
        },
        removeItem: (key) => {
          congregationsMap.delete(key);
        },
      },
      getKey: (congregation) => congregation.id ?? "",
      startSync: true,
    }),
  );
  const publishersMap = new Map<string, string>();
  const publishers = createCollection(
    localStorageCollectionOptions<Publisher, string>({
      id: `publishers_test_step_${Date.now()}`,
      storageKey: `publishers_test_step_${Date.now()}`,
      storage: {
        getItem: (key) => publishersMap.get(key) ?? null,
        setItem: (key, value) => {
          publishersMap.set(key, value);
        },
        removeItem: (key) => {
          publishersMap.delete(key);
        },
      },
      getKey: (publisher) => publisher.id ?? "",
      startSync: true,
    }),
  );

  const store = await createSettingsStore({ name: nextStoreName() });
  try {
    await congregations.preload();
    await publishers.preload();
    const congregationsTx = congregations.insert({ id: "c1", name: "Alpha Congregation" });
    await congregationsTx.isPersisted.promise;
    const publishersTx = publishers.insert([
      { id: "p1", first_name: "Alice", last_name: "Smith", congregation_id: "c1" },
      { id: "p2", first_name: "Bob", last_name: "Zulu", congregation_id: "c1" },
      { id: "p3", first_name: "Carol", last_name: "Jones", congregation_id: "c2" },
    ]);
    await publishersTx.isPersisted.promise;
    await store.updateSettings({ congregationId: "c1" });

    const render = () =>
      renderToStaticMarkup(
        createElement(OnboardingView, {
          store,
          collection: congregations as unknown as CongregationCollection,
          publisherCollection: publishers as unknown as PublisherCollection,
          initialStep: "publisher",
        }),
      );

    const markup = render();
    expect(markup).toContain("Who are you?");
    expect(markup).toContain("Smith, Alice");
    expect(markup).toContain("Zulu, Bob");
    expect(markup).not.toContain("Jones");
    expect(markup).toContain("Skip");
    expect(markup).not.toContain("Finish");

    await store.updateSettings({ publisherId: "p1" });
    const selectedMarkup = render();
    expect(selectedMarkup).toContain("Finish");
    expect(selectedMarkup).not.toContain("Skip");
    expect(selectedMarkup).toContain("ion-icon");

    // A publisher id from another congregation is not treated as selected
    await store.updateSettings({ publisherId: "p3" });
    const staleMarkup = render();
    expect(staleMarkup).toContain("Skip");
    expect(staleMarkup).not.toContain("Finish");
  } finally {
    await store.close();
    await congregations.cleanup().catch(() => {});
    await publishers.cleanup().catch(() => {});
  }
});

test("reads the publisher id stored by the legacy app", () => {
  const storageMap = new Map<string, string>();
  const storage = createMapStorage(storageMap);

  expect(readLegacyPublisher(storage)).toBeNull();

  storageMap.set(LEGACY_SELECTED_PUBLISHER_KEY, "not-valid-json{");
  expect(readLegacyPublisher(storage)).toBeNull();

  storageMap.set(LEGACY_SELECTED_PUBLISHER_KEY, JSON.stringify({ first_name: "No Id" }));
  expect(readLegacyPublisher(storage)).toBeNull();

  storageMap.set(LEGACY_SELECTED_PUBLISHER_KEY, JSON.stringify({ id: "   " }));
  expect(readLegacyPublisher(storage)).toBeNull();

  storageMap.set(
    LEGACY_SELECTED_PUBLISHER_KEY,
    JSON.stringify({ id: "p1", first_name: "Alice", last_name: "Smith", congregation_id: "c1" }),
  );
  expect(readLegacyPublisher(storage)).toEqual({ id: "p1", congregationId: "c1" });
});

test("migrates the legacy publisher selection alongside the congregation", async () => {
  const storageMap = new Map<string, string>();
  const storage = createMapStorage(storageMap);
  storageMap.set(
    LEGACY_SELECTED_CONGREGATION_KEY,
    JSON.stringify({ id: "c1", name: "Alpha Congregation" }),
  );
  storageMap.set(
    LEGACY_SELECTED_PUBLISHER_KEY,
    JSON.stringify({ id: "p1", first_name: "Alice", last_name: "Smith", congregation_id: "c1" }),
  );

  const store = await createSettingsStore({ name: nextStoreName(), storage });
  try {
    const settings = await store.getSettings();
    expect(settings.congregationId).toBe("c1");
    expect(settings.publisherId).toBe("p1");
    expect(isOnboardingComplete(settings)).toBe(true);
    expect(storageMap.get(LEGACY_SELECTED_PUBLISHER_KEY)).toBeTruthy();
  } finally {
    await store.close();
  }
});

test("does not migrate a legacy publisher from a different congregation", async () => {
  const storageMap = new Map<string, string>();
  const storage = createMapStorage(storageMap);
  storageMap.set(
    LEGACY_SELECTED_CONGREGATION_KEY,
    JSON.stringify({ id: "c1", name: "Alpha Congregation" }),
  );
  storageMap.set(
    LEGACY_SELECTED_PUBLISHER_KEY,
    JSON.stringify({ id: "p1", congregation_id: "c2" }),
  );

  const store = await createSettingsStore({ name: nextStoreName(), storage });
  try {
    const settings = await store.getSettings();
    expect(settings.congregationId).toBe("c1");
    expect(settings.publisherId).toBe("");
  } finally {
    await store.close();
  }
});

test("migrates the legacy publisher when the congregation is already set", async () => {
  const storageMap = new Map<string, string>();
  const storage = createMapStorage(storageMap);
  const storeName = nextStoreName();

  const first = await createSettingsStore({ name: storeName, storage });
  await first.updateSettings({ congregationId: "c1" });
  await first.close();

  storageMap.set(
    LEGACY_SELECTED_PUBLISHER_KEY,
    JSON.stringify({ id: "p1", congregation_id: "c1" }),
  );

  const second = await createSettingsStore({ name: storeName, storage });
  try {
    const settings = await second.getSettings();
    expect(settings.congregationId).toBe("c1");
    expect(settings.publisherId).toBe("p1");
  } finally {
    await second.close();
  }
});

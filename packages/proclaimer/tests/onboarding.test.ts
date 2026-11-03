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
  CONGREGATION_ID_MAX_LENGTH,
  createSettingsStore,
  DEFAULT_SETTINGS,
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
  });
  expect(createOnboardingPatch({ congregationId: "  congregation-1  " })).toEqual({
    congregationId: "congregation-1",
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

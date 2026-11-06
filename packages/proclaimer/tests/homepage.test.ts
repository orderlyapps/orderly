import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { expect, test } from "vite-plus/test";

import { createCollection, localStorageCollectionOptions } from "@tanstack/react-db";

import { getWelcomeName, HomepageView } from "../src/feature/homepage/index.ts";
import type { Publisher, PublisherCollection } from "../src/feature/publisher/index.ts";
import { createSettingsStore } from "../src/feature/settings/index.ts";

let storeCounter = 0;
function nextStoreName() {
  storeCounter += 1;
  return `proclaimer_homepage_test_${Date.now()}_${storeCounter}`;
}

test("welcome name prefers display_name and falls back to first_name", () => {
  expect(getWelcomeName({ first_name: "Alice", last_name: "Smith", display_name: "Ally" })).toBe(
    "Ally",
  );
  expect(getWelcomeName({ first_name: "Alice", last_name: "Smith" })).toBe("Alice");
  expect(getWelcomeName({ first_name: "Alice", last_name: "Smith", display_name: "   " })).toBe(
    "Alice",
  );
  expect(getWelcomeName({ first_name: "  ", last_name: "Smith" })).toBeNull();
  expect(getWelcomeName(null)).toBeNull();
  expect(getWelcomeName(undefined)).toBeNull();
});

test("renders the logo and a plain welcome when no publisher is selected", async () => {
  const store = await createSettingsStore({ name: nextStoreName() });
  try {
    await store.updateSettings({ congregationId: "c1" });

    const markup = renderToStaticMarkup(createElement(HomepageView, { store }));
    expect(markup).toContain('src="/logo.svg"');
    expect(markup).toContain("Welcome");
    expect(markup).not.toContain("Welcome,");
  } finally {
    await store.close();
  }
});

test("greets the selected publisher by name", async () => {
  const storageMap = new Map<string, string>();
  const collection = createCollection(
    localStorageCollectionOptions<Publisher, string>({
      id: `publishers_homepage_test_${Date.now()}`,
      storageKey: `publishers_homepage_test_${Date.now()}`,
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

  const store = await createSettingsStore({ name: nextStoreName() });
  try {
    await collection.preload();
    const tx = collection.insert([
      { id: "p1", first_name: "Alice", last_name: "Smith", congregation_id: "c1" },
      { id: "p2", first_name: "Bob", last_name: "Zulu", congregation_id: "c1" },
    ]);
    await tx.isPersisted.promise;
    await store.updateSettings({ congregationId: "c1", publisherId: "p1" });

    const markup = renderToStaticMarkup(
      createElement(HomepageView, {
        store,
        publisherCollection: collection as unknown as PublisherCollection,
      }),
    );
    expect(markup).toContain("Welcome, Alice");
    expect(markup).not.toContain("Zulu");
  } finally {
    await store.close();
    await collection.cleanup().catch(() => {});
  }
});

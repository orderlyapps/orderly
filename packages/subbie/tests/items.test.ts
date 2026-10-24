import { expect, test } from "vite-plus/test";
import { getRxStorageMemory } from "rxdb/plugins/storage-memory";
import {
  createItemsStore,
  isItemDocument,
  isValidItemId,
  normalizeItemDocument,
  validateItemInput,
} from "../src/feature/items/index.ts";

let storeCounter = 0;
function nextStoreName() {
  storeCounter += 1;
  return `subbie_items_test_${Date.now()}_${storeCounter}`;
}

test("validates item documents", () => {
  const item = normalizeItemDocument({
    name: "Consulting",
    unitPriceCents: 15_000,
  });
  expect(isItemDocument(item)).toBe(true);
  expect(isValidItemId(item.id)).toBe(true);
  expect(isValidItemId("")).toBe(false);
  expect(item.unitPriceCents).toBe(15_000);

  const badItem = normalizeItemDocument({ name: "", unitPriceCents: -50 });
  expect(badItem.unitPriceCents).toBe(0);
  expect(isItemDocument(badItem)).toBe(false);
});

test("validates create inputs", () => {
  expect(() => validateItemInput({ name: "Consulting", unitPriceCents: 100 })).not.toThrow();
  expect(() => validateItemInput({ name: "", unitPriceCents: 100 })).toThrow("name is required");
  expect(() => validateItemInput({ name: "x", unitPriceCents: -1 })).toThrow(
    "non-negative integer",
  );
  expect(() => validateItemInput({ name: "x", unitPriceCents: 1.5 })).toThrow(
    "non-negative integer",
  );
});

test("creates, updates and deletes items in the rxdb-backed store", async () => {
  const store = await createItemsStore({
    name: nextStoreName(),
    storage: getRxStorageMemory(),
  });
  try {
    expect(store.listItems()).toEqual([]);

    const item = await store.createItem({
      name: "Consulting",
      description: "Hourly consulting",
      unitPriceCents: 15_000,
      unit: "hour",
    });
    expect(isItemDocument(item)).toBe(true);
    expect(item.unitPriceCents).toBe(15_000);

    expect(store.listItems()).toHaveLength(1);
    expect(store.getItem(item.id)?.unit).toBe("hour");

    const updatedItem = await store.updateItem(item.id, {
      name: "  Consulting  ",
      unit: "  day  ",
      unitPriceCents: 20_000,
    });
    expect(updatedItem.name).toBe("Consulting");
    expect(updatedItem.unit).toBe("day");
    expect(updatedItem.unitPriceCents).toBe(20_000);

    await expect(store.updateItem(item.id, { name: "" })).rejects.toThrow("Invalid item update");
    await expect(store.updateItem(item.id, { unitPriceCents: -50 })).rejects.toThrow(
      "Invalid item update",
    );
    await expect(store.updateItem(item.id, { unitPriceCents: 12.5 })).rejects.toThrow(
      "Invalid item update",
    );
    await expect(store.updateItem("missing", { name: "x" })).rejects.toThrow("Item not found");

    await store.deleteItem(item.id);
    expect(store.listItems()).toEqual([]);
    await expect(store.deleteItem(item.id)).rejects.toThrow("Item not found");
  } finally {
    await store.close();
  }
});

test("sorts items by name", async () => {
  const store = await createItemsStore({
    name: nextStoreName(),
    storage: getRxStorageMemory(),
  });
  try {
    await store.createItem({ name: "Writing", unitPriceCents: 5000 });
    await store.createItem({ name: "Consulting", unitPriceCents: 15000 });
    await store.createItem({ name: "Design", unitPriceCents: 10000 });
    expect(store.listItems().map((item) => item.name)).toEqual(["Consulting", "Design", "Writing"]);
  } finally {
    await store.close();
  }
});

import { expect, test } from "vite-plus/test";
import { TabooCardStore, type TabooStorage } from "../../src/index.ts";

function createStorage(): TabooStorage {
  const map = new Map<string, string>();
  return {
    getItem: (key) => map.get(key) ?? null,
    setItem: (key, value) => {
      map.set(key, value);
    },
    removeItem: (key) => {
      map.delete(key);
    },
  };
}

function createStore() {
  return new TabooCardStore({ storage: createStorage() });
}

test("saves and lists cards", () => {
  const store = createStore();
  store.saveCard("Apple", ["fruit", "pie"]);
  store.saveCard("Boat", ["water"]);
  expect(store.listCards()).toEqual([
    { word: "Apple", taboo: ["fruit", "pie"] },
    { word: "Boat", taboo: ["water"] },
  ]);
});

test("saving an existing word replaces the card in place", () => {
  const store = createStore();
  store.saveCard("Apple", ["fruit"]);
  store.saveCard("Boat", ["water"]);
  store.saveCard(" apple ", ["red", "core"]);
  const cards = store.listCards();
  expect(cards).toHaveLength(2);
  expect(cards[0]).toEqual({ word: "apple", taboo: ["red", "core"] });
});

test("updateCard replaces a card in place", () => {
  const store = createStore();
  store.saveCard("Apple", ["fruit"]);
  store.saveCard("Boat", ["water"]);
  store.updateCard("apple", "Apple", ["orchard", "pie"]);
  expect(store.listCards()).toEqual([
    { word: "Apple", taboo: ["orchard", "pie"] },
    { word: "Boat", taboo: ["water"] },
  ]);
});

test("updateCard renames a card without moving it", () => {
  const store = createStore();
  store.saveCard("Apple", ["fruit"]);
  store.saveCard("Boat", ["water"]);
  store.updateCard("apple", "Cherry", ["red"]);
  expect(store.listCards()).toEqual([
    { word: "Cherry", taboo: ["red"] },
    { word: "Boat", taboo: ["water"] },
  ]);
});

test("updateCard throws when the new word belongs to another card", () => {
  const store = createStore();
  store.saveCard("Apple", ["fruit"]);
  store.saveCard("Boat", ["water"]);
  expect(() => store.updateCard("Apple", "boat", ["sea"])).toThrow(
    'A card named "Boat" already exists',
  );
  expect(store.listCards()).toEqual([
    { word: "Apple", taboo: ["fruit"] },
    { word: "Boat", taboo: ["water"] },
  ]);
});

test("updateCard adds the card when the original word is missing", () => {
  const store = createStore();
  store.updateCard("Ghost", "Apple", ["fruit"]);
  expect(store.listCards()).toEqual([{ word: "Apple", taboo: ["fruit"] }]);
});

test("removeCard deletes by word case-insensitively", () => {
  const store = createStore();
  store.saveCard("Apple", ["fruit"]);
  store.removeCard("APPLE");
  expect(store.listCards()).toEqual([]);
});

test("importDeck merges by word and importDeck without merge replaces", () => {
  const store = createStore();
  store.saveCard("Apple", ["fruit"]);
  store.importDeck({
    name: "Shared",
    cards: [
      { word: "apple", taboo: ["orchard"] },
      { word: "Boat", taboo: ["water"] },
    ],
  });
  expect(store.listCards()).toEqual([
    { word: "apple", taboo: ["orchard"] },
    { word: "Boat", taboo: ["water"] },
  ]);
  store.importDeck(
    { name: "Other", cards: [{ word: "Cake", taboo: ["slice"] }] },
    { merge: false },
  );
  expect(store.listCards()).toEqual([{ word: "Cake", taboo: ["slice"] }]);
});

test("corrupted storage reads as an empty list", () => {
  const storage = createStorage();
  storage.setItem("taboo:cards", "{oops");
  const store = new TabooCardStore({ storage });
  expect(store.listCards()).toEqual([]);
});

test("clear removes stored cards", () => {
  const store = createStore();
  store.saveCard("Apple", ["fruit"]);
  store.clear();
  expect(store.listCards()).toEqual([]);
});

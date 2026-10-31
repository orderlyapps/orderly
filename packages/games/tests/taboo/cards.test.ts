import { expect, test } from "vite-plus/test";
import {
  createTabooCard,
  normalizeTabooCard,
  parseTabooDeck,
  serializeTabooDeck,
} from "../../src/index.ts";

test("createTabooCard trims and dedupes taboo words", () => {
  const card = createTabooCard("  Apple  Pie ", ["Fruit", "fruit ", "", "apple pie", "dessert"]);
  expect(card.word).toBe("Apple Pie");
  expect(card.taboo).toEqual(["Fruit", "dessert"]);
});

test("createTabooCard rejects empty word and empty taboo list", () => {
  expect(() => createTabooCard("  ", ["fruit"])).toThrow("Card needs a word");
  expect(() => createTabooCard("Apple", [])).toThrow("needs at least one taboo word");
  expect(() => createTabooCard("Apple", ["apple"])).toThrow("needs at least one taboo word");
});

test("normalizeTabooCard collapses whitespace", () => {
  const card = normalizeTabooCard({ word: "ice   cream", taboo: ["cold\t dessert"] });
  expect(card.word).toBe("ice cream");
  expect(card.taboo).toEqual(["cold dessert"]);
});

test("serializeTabooDeck round-trips through parseTabooDeck", () => {
  const json = serializeTabooDeck({
    name: "Party Deck",
    cards: [
      { word: "Apple", taboo: ["fruit", "pie"] },
      { word: "Boat", taboo: ["water", "sail"] },
    ],
  });
  const deck = parseTabooDeck(json);
  expect(deck.name).toBe("Party Deck");
  expect(deck.cards).toEqual([
    { word: "Apple", taboo: ["fruit", "pie"] },
    { word: "Boat", taboo: ["water", "sail"] },
  ]);
});

test("serializeTabooDeck rejects decks it could not re-import", () => {
  expect(() => serializeTabooDeck({ name: "Empty", cards: [] })).toThrow("no cards");
  expect(() => serializeTabooDeck({ name: "Bad", cards: [{ word: "  ", taboo: ["x"] }] })).toThrow(
    "card 1 needs a word and taboo words",
  );
});

test("parseTabooDeck accepts a bare cards payload", () => {
  const deck = parseTabooDeck('{"cards":[{"word":"Apple","taboo":["fruit"]}]}');
  expect(deck.cards).toHaveLength(1);
});

test("parseTabooDeck rejects invalid input", () => {
  expect(() => parseTabooDeck("not json")).toThrow("not valid JSON");
  expect(() => parseTabooDeck("42")).toThrow("expected an object");
  expect(() => parseTabooDeck('{"format":"other","cards":[]}')).toThrow("unrecognized format");
  expect(() => parseTabooDeck('{"cards":"nope"}')).toThrow("missing cards");
  expect(() => parseTabooDeck('{"cards":[]}')).toThrow("no cards");
  expect(() => parseTabooDeck('{"cards":[{"word":"Apple"}]}')).toThrow("card 1 is malformed");
  expect(() => parseTabooDeck('{"cards":[{"word":" ","taboo":["x"]}]}')).toThrow(
    "card 1 needs a word",
  );
});

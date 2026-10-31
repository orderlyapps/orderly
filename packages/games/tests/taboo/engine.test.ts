import { expect, test } from "vite-plus/test";
import { TabooEngine, type TabooCard } from "../../src/index.ts";

const cards: TabooCard[] = [
  { word: "Apple", taboo: ["fruit", "pie"] },
  { word: "Boat", taboo: ["water", "sail"] },
  { word: "Cake", taboo: ["birthday", "slice"] },
];

test("serves every card exactly once", () => {
  const engine = new TabooEngine({ cards });
  const seen: string[] = [];
  while (engine.currentCard) {
    seen.push(engine.currentCard.word);
    engine.correct();
  }
  expect(seen).toHaveLength(3);
  expect(new Set(seen).size).toBe(3);
  expect(engine.exhausted).toBe(true);
  expect(engine.score).toBe(3);
});

test("skip advances without scoring", () => {
  const engine = new TabooEngine({ cards, random: () => 0 });
  const first = engine.currentCard!.word;
  engine.skip();
  expect(engine.score).toBe(0);
  expect(engine.skipped).toBe(1);
  expect(engine.currentCard!.word).not.toBe(first);
});

test("reset reshuffles and restores the deck", () => {
  const engine = new TabooEngine({ cards });
  engine.correct();
  engine.correct();
  engine.reset();
  expect(engine.score).toBe(0);
  expect(engine.remaining).toBe(3);
  expect(engine.currentCard).not.toBeNull();
});

test("setCards swaps the deck", () => {
  const engine = new TabooEngine({ cards });
  engine.setCards([{ word: "Solo", taboo: ["one"] }]);
  expect(engine.total).toBe(1);
  expect(engine.currentCard!.word).toBe("Solo");
});

test("an empty deck has no current card", () => {
  const engine = new TabooEngine();
  expect(engine.currentCard).toBeNull();
  expect(engine.exhausted).toBe(true);
  expect(engine.correct()).toBeNull();
});

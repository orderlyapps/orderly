import { afterEach, beforeEach, expect, test, vi } from "vite-plus/test";
import { TabooGame, type TabooCard } from "../../src/index.ts";

const cards: TabooCard[] = [
  { word: "Apple", taboo: ["fruit"] },
  { word: "Boat", taboo: ["water"] },
];

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

test("startRound emits the first card, score and tick", () => {
  const seen: (string | null)[] = [];
  const ticks: number[] = [];
  const game = new TabooGame({
    cards,
    roundMs: 5000,
    tickMs: 1000,
    onCard: (card) => seen.push(card?.word ?? null),
    onTick: (ms) => ticks.push(ms),
  });
  game.startRound();
  expect(game.running).toBe(true);
  expect(seen).toHaveLength(1);
  expect(ticks[0]).toBe(5000);
  vi.advanceTimersByTime(1000);
  expect(ticks.at(-1)).toBe(4000);
  game.destroy();
});

test("correct scores and advances until the deck runs out", () => {
  let finalScore: number | null = null;
  const game = new TabooGame({ cards, onRoundEnd: (score) => (finalScore = score) });
  game.startRound();
  game.correct();
  expect(game.running).toBe(true);
  game.correct();
  expect(game.running).toBe(false);
  expect(finalScore).toBe(2);
  game.destroy();
});

test("the round ends when the timer expires", () => {
  let finalScore: number | null = null;
  const game = new TabooGame({
    cards,
    roundMs: 3000,
    tickMs: 1000,
    onRoundEnd: (score) => (finalScore = score),
  });
  game.startRound();
  game.correct();
  vi.advanceTimersByTime(3000);
  expect(game.running).toBe(false);
  expect(finalScore).toBe(1);
  game.destroy();
});

test("pause and resume keep the remaining time", () => {
  const ticks: number[] = [];
  const game = new TabooGame({
    cards,
    roundMs: 5000,
    tickMs: 1000,
    onTick: (ms) => ticks.push(ms),
  });
  game.startRound();
  vi.advanceTimersByTime(1000);
  game.pause();
  vi.advanceTimersByTime(10_000);
  expect(ticks.at(-1)).toBe(4000);
  game.resume();
  vi.advanceTimersByTime(1000);
  expect(ticks.at(-1)).toBe(3000);
  game.destroy();
});

test("startRound does nothing for an empty deck", () => {
  const game = new TabooGame({ cards: [] });
  game.startRound();
  expect(game.running).toBe(false);
  game.destroy();
});

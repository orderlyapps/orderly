export interface TabooCard {
  /** The word players try to guess. */
  word: string;
  /** Words the clue-giver may not say. */
  taboo: string[];
}

export interface TabooDeck {
  name: string;
  cards: TabooCard[];
}

export const TABOO_DECK_FORMAT = "ionic-taboo";
export const TABOO_DECK_VERSION = 1;

interface TabooDeckFile {
  format: string;
  version: number;
  name: string;
  cards: TabooCard[];
}

function normalizeWord(word: string): string {
  return word.trim().replace(/\s+/g, " ");
}

/** Trims, dedupes (case-insensitive) and drops taboo words equal to the card word. */
export function normalizeTabooCard(card: TabooCard): TabooCard {
  const word = normalizeWord(card.word);
  const seen = new Set<string>([word.toLowerCase()]);
  const taboo: string[] = [];
  for (const raw of card.taboo) {
    const entry = normalizeWord(raw);
    const key = entry.toLowerCase();
    if (!entry || seen.has(key)) continue;
    seen.add(key);
    taboo.push(entry);
  }
  return { word, taboo };
}

/** Validates input and returns a normalized card. Throws when the card is unusable. */
export function createTabooCard(word: string, taboo: string[]): TabooCard {
  const card = normalizeTabooCard({ word, taboo });
  if (!card.word) throw new Error("Card needs a word");
  if (card.taboo.length === 0) throw new Error(`"${card.word}" needs at least one taboo word`);
  return card;
}

export function isTabooCard(value: unknown): value is TabooCard {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return false;
  const record = value as Record<string, unknown>;
  return (
    typeof record.word === "string" &&
    Array.isArray(record.taboo) &&
    record.taboo.every((entry) => typeof entry === "string")
  );
}

/** Serializes a deck to shareable JSON. Throws when the deck could not be re-imported. */
export function serializeTabooDeck(deck: TabooDeck): string {
  const cards = deck.cards.map((card) => normalizeTabooCard(card));
  if (cards.length === 0) {
    throw new Error("Cannot export deck: no cards");
  }
  for (const [index, card] of cards.entries()) {
    if (!card.word || card.taboo.length === 0) {
      throw new Error(`Cannot export deck: card ${index + 1} needs a word and taboo words`);
    }
  }
  const file: TabooDeckFile = {
    format: TABOO_DECK_FORMAT,
    version: TABOO_DECK_VERSION,
    name: deck.name,
    cards,
  };
  return `${JSON.stringify(file, null, 2)}\n`;
}

/** Parses a deck from exported JSON. Throws a descriptive error when invalid. */
export function parseTabooDeck(input: string): TabooDeck {
  let parsed: unknown;
  try {
    parsed = JSON.parse(input);
  } catch {
    throw new Error("Invalid deck file: not valid JSON");
  }
  if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
    throw new Error("Invalid deck file: expected an object");
  }
  const record = parsed as Record<string, unknown>;
  if (record.format !== undefined && record.format !== TABOO_DECK_FORMAT) {
    throw new Error("Invalid deck file: unrecognized format");
  }
  if (!Array.isArray(record.cards)) {
    throw new Error("Invalid deck file: missing cards");
  }
  const cards: TabooCard[] = [];
  for (const [index, entry] of record.cards.entries()) {
    if (!isTabooCard(entry)) {
      throw new Error(`Invalid deck file: card ${index + 1} is malformed`);
    }
    const card = normalizeTabooCard(entry);
    if (!card.word || card.taboo.length === 0) {
      throw new Error(`Invalid deck file: card ${index + 1} needs a word and taboo words`);
    }
    cards.push(card);
  }
  if (cards.length === 0) {
    throw new Error("Invalid deck file: no cards found");
  }
  const name = typeof record.name === "string" ? record.name.trim() : "";
  return { name: name || "Shared Deck", cards };
}

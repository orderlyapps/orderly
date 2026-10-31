import {
  createTabooCard,
  isTabooCard,
  normalizeTabooCard,
  type TabooCard,
  type TabooDeck,
} from "./cards.ts";

export interface TabooStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

export interface TabooCardStoreOptions {
  storageKey?: string;
  storage?: TabooStorage;
}

export interface TabooImportOptions {
  /** When true (default) imported cards replace existing cards with the same word. */
  merge?: boolean;
}

export const TABOO_STORAGE_KEY = "taboo:cards";

function createMemoryStorage(): TabooStorage {
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

const fallbackMemoryStorage = createMemoryStorage();

function getDefaultStorage(): TabooStorage {
  try {
    if (typeof localStorage !== "undefined") return localStorage;
  } catch {
    // Fall back to in-memory storage when localStorage is unavailable or restricted
  }
  return fallbackMemoryStorage;
}

function wordKey(word: string): string {
  return word.toLowerCase();
}

export class TabooCardStore {
  private readonly storage: TabooStorage;
  private readonly storageKey: string;

  constructor(options: TabooCardStoreOptions = {}) {
    this.storageKey = options.storageKey ?? TABOO_STORAGE_KEY;
    this.storage = options.storage ?? getDefaultStorage();
  }

  listCards(): TabooCard[] {
    let raw: string | null = null;
    try {
      raw = this.storage.getItem(this.storageKey);
      if (!raw) return [];
      const parsed: unknown = JSON.parse(raw);
      if (!Array.isArray(parsed)) return [];
      const cards: TabooCard[] = [];
      for (const entry of parsed) {
        if (!isTabooCard(entry)) continue;
        const card = normalizeTabooCard(entry);
        if (card.word && card.taboo.length > 0) cards.push(card);
      }
      return cards;
    } catch {
      return [];
    }
  }

  /** Adds a card, replacing any existing card with the same word. */
  saveCard(word: string, taboo: string[]): TabooCard[] {
    const card = createTabooCard(word, taboo);
    const cards = this.listCards();
    const index = cards.findIndex((entry) => wordKey(entry.word) === wordKey(card.word));
    if (index === -1) {
      cards.push(card);
    } else {
      cards[index] = card;
    }
    this.write(cards);
    return cards;
  }

  removeCard(word: string): TabooCard[] {
    const key = wordKey(word);
    const cards = this.listCards().filter((card) => wordKey(card.word) !== key);
    this.write(cards);
    return cards;
  }

  /** Returns the updated card list after merging or replacing with the deck. */
  importDeck(deck: TabooDeck, options: TabooImportOptions = {}): TabooCard[] {
    const merge = options.merge ?? true;
    const cards = merge ? this.listCards() : [];
    for (const entry of deck.cards) {
      const card = normalizeTabooCard(entry);
      const index = cards.findIndex((existing) => wordKey(existing.word) === wordKey(card.word));
      if (index === -1) {
        cards.push(card);
      } else {
        cards[index] = card;
      }
    }
    this.write(cards);
    return cards;
  }

  exportDeck(name = "My Taboo Deck"): TabooDeck {
    return { name, cards: this.listCards() };
  }

  clear(): void {
    this.storage.removeItem(this.storageKey);
  }

  private write(cards: TabooCard[]): void {
    this.storage.setItem(this.storageKey, JSON.stringify(cards));
  }
}

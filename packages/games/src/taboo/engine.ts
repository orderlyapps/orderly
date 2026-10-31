import type { TabooCard } from "./cards.ts";

export interface TabooEngineOptions {
  cards?: TabooCard[];
  random?: () => number;
}

export class TabooEngine {
  score = 0;
  skipped = 0;
  currentCard: TabooCard | null = null;
  private cards: TabooCard[];
  private queue: TabooCard[] = [];
  private readonly random: () => number;

  constructor(options: TabooEngineOptions = {}) {
    this.random = options.random ?? Math.random;
    this.cards = [...(options.cards ?? [])];
    this.reset();
  }

  get total(): number {
    return this.cards.length;
  }

  get remaining(): number {
    return this.queue.length;
  }

  get exhausted(): boolean {
    return this.queue.length === 0;
  }

  setCards(cards: TabooCard[]): void {
    this.cards = [...cards];
    this.reset();
  }

  reset(): void {
    this.queue = this.shuffled(this.cards);
    this.score = 0;
    this.skipped = 0;
    this.currentCard = this.queue[0] ?? null;
  }

  correct(): TabooCard | null {
    if (!this.currentCard) return null;
    this.score += 1;
    return this.advance();
  }

  skip(): TabooCard | null {
    if (!this.currentCard) return null;
    this.skipped += 1;
    return this.advance();
  }

  private advance(): TabooCard | null {
    this.queue.shift();
    this.currentCard = this.queue[0] ?? null;
    return this.currentCard;
  }

  private shuffled(cards: TabooCard[]): TabooCard[] {
    const queue = [...cards];
    for (let i = queue.length - 1; i > 0; i--) {
      const j = Math.min(i, Math.floor(this.random() * (i + 1)));
      [queue[i], queue[j]] = [queue[j]!, queue[i]!];
    }
    return queue;
  }
}

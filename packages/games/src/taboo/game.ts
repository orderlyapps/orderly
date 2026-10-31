import type { TabooCard } from "./cards.ts";
import { TabooEngine, type TabooEngineOptions } from "./engine.ts";

export interface TabooGameOptions extends TabooEngineOptions {
  /** Round length in milliseconds. */
  roundMs?: number;
  /** How often onTick fires while a round runs. */
  tickMs?: number;
  onCard?: (card: TabooCard | null) => void;
  onScore?: (score: number) => void;
  onTick?: (remainingMs: number) => void;
  onRoundEnd?: (score: number) => void;
}

export class TabooGame {
  readonly engine: TabooEngine;
  readonly roundMs: number;
  private readonly tickMs: number;
  private readonly onCard?: (card: TabooCard | null) => void;
  private readonly onScore?: (score: number) => void;
  private readonly onTick?: (remainingMs: number) => void;
  private readonly onRoundEnd?: (score: number) => void;
  private timer: ReturnType<typeof setInterval> | null = null;
  private endsAt = 0;
  private remainingMs = 0;
  running = false;
  private paused = false;
  private destroyed = false;

  constructor(options: TabooGameOptions = {}) {
    this.roundMs = Math.max(1000, Math.floor(options.roundMs ?? 60_000));
    this.tickMs = Math.max(50, Math.floor(options.tickMs ?? 250));
    this.onCard = options.onCard;
    this.onScore = options.onScore;
    this.onTick = options.onTick;
    this.onRoundEnd = options.onRoundEnd;
    this.engine = new TabooEngine(options);
  }

  get pausedRound(): boolean {
    return this.paused;
  }

  startRound(): void {
    if (this.destroyed || this.engine.total === 0) return;
    this.engine.reset();
    this.running = true;
    this.paused = false;
    this.remainingMs = this.roundMs;
    this.endsAt = Date.now() + this.roundMs;
    this.onScore?.(0);
    this.onCard?.(this.engine.currentCard);
    this.onTick?.(this.roundMs);
    this.schedule();
  }

  endRound(): void {
    if (!this.running) return;
    this.clearTimer();
    this.running = false;
    this.paused = false;
    this.onRoundEnd?.(this.engine.score);
  }

  pause(): void {
    if (!this.running || this.paused) return;
    this.remainingMs = Math.max(0, this.endsAt - Date.now());
    this.clearTimer();
    this.paused = true;
  }

  resume(): void {
    if (!this.running || !this.paused || this.destroyed) return;
    this.paused = false;
    this.endsAt = Date.now() + this.remainingMs;
    this.schedule();
  }

  correct(): void {
    if (!this.running || this.paused) return;
    const card = this.engine.correct();
    this.onScore?.(this.engine.score);
    if (this.engine.exhausted) {
      this.endRound();
      return;
    }
    this.onCard?.(card);
  }

  skip(): void {
    if (!this.running || this.paused) return;
    const card = this.engine.skip();
    if (this.engine.exhausted) {
      this.endRound();
      return;
    }
    this.onCard?.(card);
  }

  destroy(): void {
    this.destroyed = true;
    this.clearTimer();
    this.running = false;
  }

  private schedule(): void {
    this.clearTimer();
    this.timer = setInterval(this.tick, this.tickMs);
  }

  private tick = (): void => {
    this.remainingMs = Math.max(0, this.endsAt - Date.now());
    if (this.remainingMs === 0) {
      this.onTick?.(0);
      this.endRound();
      return;
    }
    this.onTick?.(this.remainingMs);
  };

  private clearTimer(): void {
    if (this.timer === null) return;
    clearInterval(this.timer);
    this.timer = null;
  }
}

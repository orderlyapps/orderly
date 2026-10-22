import { SnakeEngine, type Direction } from "./engine.ts";

export interface SnakeGameOptions {
  cols?: number;
  rows?: number;
  /** Base milliseconds per tick. The game speeds up as the score grows. */
  tickMs?: number;
  onScore?: (score: number) => void;
  onGameOver?: (score: number) => void;
}

const KEY_DIRECTIONS: Record<string, Direction> = {
  ArrowUp: "up",
  ArrowDown: "down",
  ArrowLeft: "left",
  ArrowRight: "right",
  w: "up",
  s: "down",
  a: "left",
  d: "right",
};

const SWIPE_THRESHOLD = 24;

export class SnakeGame {
  readonly engine: SnakeEngine;
  private readonly canvas: HTMLCanvasElement;
  private readonly ctx: CanvasRenderingContext2D;
  private readonly tickMs: number;
  private readonly onScore?: (score: number) => void;
  private readonly onGameOver?: (score: number) => void;
  private timer: ReturnType<typeof setTimeout> | null = null;
  private touchStart: { x: number; y: number } | null = null;
  private readonly resizeObserver: ResizeObserver;
  private destroyed = false;

  constructor(canvas: HTMLCanvasElement, options: SnakeGameOptions = {}) {
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("SnakeGame requires a 2d canvas context");
    this.canvas = canvas;
    this.ctx = ctx;
    this.tickMs = options.tickMs ?? 140;
    this.onScore = options.onScore;
    this.onGameOver = options.onGameOver;
    this.engine = new SnakeEngine(options);

    window.addEventListener("keydown", this.handleKeyDown);
    canvas.addEventListener("touchstart", this.handleTouchStart, { passive: false });
    canvas.addEventListener("touchmove", this.handleTouchMove, { passive: false });
    this.resizeObserver = new ResizeObserver(() => this.resize());
    this.resizeObserver.observe(canvas);
    this.resize();
  }

  start(): void {
    if (this.timer !== null || this.destroyed) return;
    this.scheduleTick();
  }

  stop(): void {
    if (this.timer === null) return;
    clearTimeout(this.timer);
    this.timer = null;
  }

  restart(): void {
    this.engine.reset();
    this.onScore?.(0);
    this.draw();
    this.stop();
    this.start();
  }

  destroy(): void {
    this.destroyed = true;
    this.stop();
    window.removeEventListener("keydown", this.handleKeyDown);
    this.canvas.removeEventListener("touchstart", this.handleTouchStart);
    this.canvas.removeEventListener("touchmove", this.handleTouchMove);
    this.resizeObserver.disconnect();
  }

  private scheduleTick(): void {
    const speedUp = Math.min(this.engine.score * 4, this.tickMs * 0.6);
    this.timer = setTimeout(this.tick, this.tickMs - speedUp);
  }

  private tick = (): void => {
    const previousScore = this.engine.score;
    this.engine.step();
    this.draw();
    if (this.engine.score !== previousScore) this.onScore?.(this.engine.score);
    if (this.engine.gameOver) {
      this.timer = null;
      this.onGameOver?.(this.engine.score);
      return;
    }
    this.scheduleTick();
  };

  private resize(): void {
    const { clientWidth, clientHeight } = this.canvas;
    if (clientWidth === 0 || clientHeight === 0) return;
    const dpr = window.devicePixelRatio || 1;
    this.canvas.width = Math.round(clientWidth * dpr);
    this.canvas.height = Math.round(clientHeight * dpr);
    this.draw();
  }

  private handleKeyDown = (event: KeyboardEvent): void => {
    const direction = KEY_DIRECTIONS[event.key];
    if (direction) {
      event.preventDefault();
      this.engine.setDirection(direction);
    }
  };

  private handleTouchStart = (event: TouchEvent): void => {
    event.preventDefault();
    const touch = event.touches[0];
    if (touch) this.touchStart = { x: touch.clientX, y: touch.clientY };
  };

  private handleTouchMove = (event: TouchEvent): void => {
    event.preventDefault();
    if (!this.touchStart) return;
    const touch = event.touches[0];
    if (!touch) return;
    const dx = touch.clientX - this.touchStart.x;
    const dy = touch.clientY - this.touchStart.y;
    if (Math.max(Math.abs(dx), Math.abs(dy)) < SWIPE_THRESHOLD) return;
    this.engine.setDirection(
      Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? "right" : "left") : dy > 0 ? "down" : "up",
    );
    this.touchStart = { x: touch.clientX, y: touch.clientY };
  };

  private draw(): void {
    const { width, height } = this.canvas;
    const cellX = width / this.engine.cols;
    const cellY = height / this.engine.rows;

    this.ctx.fillStyle = "#111";
    this.ctx.fillRect(0, 0, width, height);

    this.ctx.fillStyle = "#e5484d";
    const food = this.engine.food;
    this.ctx.beginPath();
    this.ctx.arc(
      (food.x + 0.5) * cellX,
      (food.y + 0.5) * cellY,
      Math.min(cellX, cellY) * 0.4,
      0,
      Math.PI * 2,
    );
    this.ctx.fill();

    this.engine.snake.forEach((segment, index) => {
      this.ctx.fillStyle = index === 0 ? "#46d07e" : "#2fa463";
      this.ctx.fillRect(segment.x * cellX + 1, segment.y * cellY + 1, cellX - 2, cellY - 2);
    });
  }
}

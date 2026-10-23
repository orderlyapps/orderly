import { fitCanvasToDisplaySize } from "../shared/canvas.ts";
import type { Direction } from "../shared/grid.ts";
import { DirectionalInput } from "../shared/input.ts";
import { SnakeEngine, type SnakeEngineOptions } from "./engine.ts";

export interface SnakeGameOptions extends SnakeEngineOptions {
  /** Base milliseconds per tick. The game speeds up as the score grows. */
  tickMs?: number;
  onScore?: (score: number) => void;
  onGameOver?: (score: number) => void;
}

export class SnakeGame {
  readonly engine: SnakeEngine;
  private readonly canvas: HTMLCanvasElement;
  private readonly ctx: CanvasRenderingContext2D;
  private readonly input: DirectionalInput;
  private readonly tickMs: number;
  private readonly onScore?: (score: number) => void;
  private readonly onGameOver?: (score: number) => void;
  private timer: ReturnType<typeof setTimeout> | null = null;
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
    this.input = new DirectionalInput(canvas, {
      onDirection: (direction) => this.engine.setDirection(direction),
    });
    this.resizeObserver = new ResizeObserver(() => this.resize());
    this.resizeObserver.observe(canvas);
    this.resize();
  }

  start(): void {
    if (this.timer !== null || this.destroyed || this.engine.gameOver) return;
    this.scheduleTick();
  }

  stop(): void {
    if (this.timer === null) return;
    clearTimeout(this.timer);
    this.timer = null;
  }

  setDirection(direction: Direction): void {
    this.engine.setDirection(direction);
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
    this.input.destroy();
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
    if (!fitCanvasToDisplaySize(this.canvas)) return;
    this.draw();
  }

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

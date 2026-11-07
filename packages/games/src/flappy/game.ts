import { fitCanvasToDisplaySize } from "../shared/canvas.ts";
import { FlappyEngine, type FlappyEngineOptions } from "./engine.ts";

const FLAP_KEYS = new Set([" ", "ArrowUp", "w", "W"]);

export interface FlappyGameOptions extends FlappyEngineOptions {
  /** Milliseconds per tick. */
  tickMs?: number;
  onScore?: (score: number) => void;
  onGameOver?: (score: number) => void;
}

export class FlappyGame {
  readonly engine: FlappyEngine;
  private readonly canvas: HTMLCanvasElement;
  private readonly ctx: CanvasRenderingContext2D;
  private readonly tickMs: number;
  private readonly onScore?: (score: number) => void;
  private readonly onGameOver?: (score: number) => void;
  private timer: ReturnType<typeof setTimeout> | null = null;
  private readonly resizeObserver: ResizeObserver;
  private destroyed = false;

  constructor(canvas: HTMLCanvasElement, options: FlappyGameOptions = {}) {
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("FlappyGame requires a 2d canvas context");
    this.canvas = canvas;
    this.ctx = ctx;
    this.tickMs = options.tickMs ?? 16;
    this.onScore = options.onScore;
    this.onGameOver = options.onGameOver;
    this.engine = new FlappyEngine(options);
    window.addEventListener("keydown", this.handleKeyDown);
    canvas.addEventListener("pointerdown", this.handlePointerDown);
    this.resizeObserver = new ResizeObserver(() => this.resize());
    this.resizeObserver.observe(canvas);
    this.resize();
  }

  start(): void {
    if (this.timer !== null || this.destroyed || this.engine.gameOver) return;
    this.draw();
    this.scheduleTick();
  }

  stop(): void {
    if (this.timer === null) return;
    clearTimeout(this.timer);
    this.timer = null;
  }

  flap(): void {
    this.engine.flap();
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
    this.canvas.removeEventListener("pointerdown", this.handlePointerDown);
    this.resizeObserver.disconnect();
  }

  private scheduleTick(): void {
    this.timer = setTimeout(this.tick, this.tickMs);
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

  private handleKeyDown = (event: KeyboardEvent): void => {
    if (!FLAP_KEYS.has(event.key)) return;
    const target = event.target;
    if (
      target instanceof HTMLInputElement ||
      target instanceof HTMLTextAreaElement ||
      target instanceof HTMLSelectElement ||
      (target instanceof HTMLElement && target.isContentEditable)
    ) {
      return;
    }
    if (this.canvas.getClientRects().length === 0) return;
    event.preventDefault();
    this.engine.flap();
  };

  private handlePointerDown = (event: PointerEvent): void => {
    event.preventDefault();
    this.engine.flap();
  };

  private resize(): void {
    if (!fitCanvasToDisplaySize(this.canvas)) return;
    this.draw();
  }

  private draw(): void {
    const { ctx, engine } = this;
    const { width, pipeWidth, pipeGap, birdRadius, floorY } = engine;
    ctx.save();
    ctx.setTransform(this.canvas.width / width, 0, 0, this.canvas.height / engine.height, 0, 0);

    const sky = ctx.createLinearGradient(0, 0, 0, engine.height);
    sky.addColorStop(0, "#48a4dd");
    sky.addColorStop(1, "#a8ddf0");
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, width, engine.height);

    for (const pipe of engine.pipes) {
      const bottomY = pipe.gapY + pipeGap;
      ctx.fillStyle = "#3f9e4d";
      ctx.fillRect(pipe.x, 0, pipeWidth, pipe.gapY);
      ctx.fillRect(pipe.x, bottomY, pipeWidth, floorY - bottomY);
      ctx.fillStyle = "#2c7a38";
      ctx.fillRect(pipe.x - 0.8, pipe.gapY - 3, pipeWidth + 1.6, 3);
      ctx.fillRect(pipe.x - 0.8, bottomY, pipeWidth + 1.6, 3);
    }

    ctx.fillStyle = "#c9a35c";
    ctx.fillRect(0, floorY, width, engine.groundHeight);
    ctx.fillStyle = "#7ecb63";
    ctx.fillRect(0, floorY, width, 2.5);

    ctx.translate(engine.birdX, engine.birdY);
    ctx.rotate(Math.max(-0.5, Math.min(1.2, engine.birdVelocity * 0.25)));
    ctx.fillStyle = "#f7c948";
    ctx.beginPath();
    ctx.arc(0, 0, birdRadius, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#e0a92e";
    ctx.beginPath();
    ctx.ellipse(
      -birdRadius * 0.2,
      birdRadius * 0.1,
      birdRadius * 0.55,
      birdRadius * 0.35,
      -0.3,
      0,
      Math.PI * 2,
    );
    ctx.fill();
    ctx.fillStyle = "#ffffff";
    ctx.beginPath();
    ctx.arc(birdRadius * 0.45, -birdRadius * 0.3, birdRadius * 0.28, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#222222";
    ctx.beginPath();
    ctx.arc(birdRadius * 0.55, -birdRadius * 0.3, birdRadius * 0.13, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#e8843b";
    ctx.beginPath();
    ctx.moveTo(birdRadius * 0.7, -birdRadius * 0.1);
    ctx.lineTo(birdRadius * 1.35, birdRadius * 0.1);
    ctx.lineTo(birdRadius * 0.7, birdRadius * 0.35);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }
}

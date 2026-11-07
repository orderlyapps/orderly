import { fitCanvasToDisplaySize } from "../shared/canvas.ts";
import type { Direction } from "../shared/grid.ts";
import { DirectionalInput } from "../shared/input.ts";
import { TetrisEngine, type TetrisEngineOptions, type TetrominoKind } from "./engine.ts";

const HARD_DROP_KEYS = new Set([" "]);

const COLORS: Record<TetrominoKind, string> = {
  I: "#3bc7c4",
  O: "#f2c94c",
  T: "#9b6df3",
  S: "#46d07e",
  Z: "#e5484d",
  J: "#5b9dff",
  L: "#f2a93b",
};

export interface TetrisGameOptions extends TetrisEngineOptions {
  /** Base milliseconds per gravity step. The game speeds up each level. */
  tickMs?: number;
  onScore?: (score: number) => void;
  onGameOver?: (score: number) => void;
}

export class TetrisGame {
  readonly engine: TetrisEngine;
  private readonly canvas: HTMLCanvasElement;
  private readonly ctx: CanvasRenderingContext2D;
  private readonly input: DirectionalInput;
  private readonly tickMs: number;
  private readonly onScore?: (score: number) => void;
  private readonly onGameOver?: (score: number) => void;
  private timer: ReturnType<typeof setTimeout> | null = null;
  private readonly resizeObserver: ResizeObserver;
  private lastScore = 0;
  private overEmitted = false;
  private destroyed = false;

  constructor(canvas: HTMLCanvasElement, options: TetrisGameOptions = {}) {
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("TetrisGame requires a 2d canvas context");
    this.canvas = canvas;
    this.ctx = ctx;
    this.tickMs = options.tickMs ?? 700;
    this.onScore = options.onScore;
    this.onGameOver = options.onGameOver;
    this.engine = new TetrisEngine(options);
    this.input = new DirectionalInput(canvas, {
      onDirection: (direction) => this.handleDirection(direction),
    });
    window.addEventListener("keydown", this.handleKeyDown);
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

  moveLeft(): void {
    this.engine.move(-1);
    this.sync();
  }

  moveRight(): void {
    this.engine.move(1);
    this.sync();
  }

  rotate(): void {
    this.engine.rotate();
    this.sync();
  }

  softDrop(): void {
    this.engine.softDrop();
    this.sync();
  }

  hardDrop(): void {
    this.engine.hardDrop();
    this.sync();
  }

  restart(): void {
    this.engine.reset();
    this.lastScore = this.engine.score;
    this.overEmitted = false;
    this.onScore?.(this.engine.score);
    this.draw();
    this.stop();
    this.start();
  }

  destroy(): void {
    this.destroyed = true;
    this.stop();
    this.input.destroy();
    window.removeEventListener("keydown", this.handleKeyDown);
    this.resizeObserver.disconnect();
  }

  private scheduleTick(): void {
    const speedUp = Math.min((this.engine.level - 1) * 70, this.tickMs * 0.85);
    this.timer = setTimeout(this.tick, this.tickMs - speedUp);
  }

  private tick = (): void => {
    this.engine.step();
    this.sync();
    if (this.engine.gameOver) {
      this.timer = null;
      return;
    }
    this.scheduleTick();
  };

  /** Redraws and emits score/game-over callbacks when they change. */
  private sync(): void {
    this.draw();
    if (this.engine.score !== this.lastScore) {
      this.lastScore = this.engine.score;
      this.onScore?.(this.lastScore);
    }
    if (this.engine.gameOver && !this.overEmitted) {
      this.overEmitted = true;
      this.onGameOver?.(this.engine.score);
    }
  }

  private handleDirection(direction: Direction): void {
    if (direction === "left") this.engine.move(-1);
    else if (direction === "right") this.engine.move(1);
    else if (direction === "down") this.engine.softDrop();
    else this.engine.rotate();
    this.sync();
  }

  private handleKeyDown = (event: KeyboardEvent): void => {
    if (!HARD_DROP_KEYS.has(event.key)) return;
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
    this.engine.hardDrop();
    this.sync();
  };

  private resize(): void {
    if (!fitCanvasToDisplaySize(this.canvas)) return;
    this.draw();
  }

  private draw(): void {
    const { ctx, engine } = this;
    const cellW = this.canvas.width / engine.cols;
    const cellH = this.canvas.height / engine.rows;

    ctx.fillStyle = "#111";
    ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    ctx.strokeStyle = "rgba(255, 255, 255, 0.05)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let x = 1; x < engine.cols; x++) {
      ctx.moveTo(x * cellW, 0);
      ctx.lineTo(x * cellW, this.canvas.height);
    }
    for (let y = 1; y < engine.rows; y++) {
      ctx.moveTo(0, y * cellH);
      ctx.lineTo(this.canvas.width, y * cellH);
    }
    ctx.stroke();

    for (let y = 0; y < engine.rows; y++) {
      for (let x = 0; x < engine.cols; x++) {
        const kind = engine.board[y * engine.cols + x];
        if (kind) this.drawCell(x, y, cellW, cellH, COLORS[kind]);
      }
    }

    const ghostY = engine.piece.y + engine.dropDistance();
    if (ghostY !== engine.piece.y) {
      ctx.globalAlpha = 0.25;
      for (const cell of engine.pieceCells({ ...engine.piece, y: ghostY })) {
        this.drawCell(cell.x, cell.y, cellW, cellH, COLORS[engine.piece.kind]);
      }
      ctx.globalAlpha = 1;
    }
    for (const cell of engine.pieceCells()) {
      this.drawCell(cell.x, cell.y, cellW, cellH, COLORS[engine.piece.kind]);
    }
  }

  private drawCell(x: number, y: number, w: number, h: number, color: string): void {
    if (y < 0) return;
    this.ctx.fillStyle = color;
    this.ctx.fillRect(x * w + 1, y * h + 1, w - 2, h - 2);
  }
}

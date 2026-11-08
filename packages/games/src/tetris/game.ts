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
  /** Optional canvas that renders the upcoming piece. */
  previewCanvas?: HTMLCanvasElement;
  /** Base milliseconds per gravity step. The game speeds up each level. */
  tickMs?: number;
  onScore?: (score: number) => void;
  onGameOver?: (score: number) => void;
}

export class TetrisGame {
  readonly engine: TetrisEngine;
  paused = false;
  private readonly canvas: HTMLCanvasElement;
  private readonly ctx: CanvasRenderingContext2D;
  private readonly previewCanvas?: HTMLCanvasElement;
  private readonly previewCtx: CanvasRenderingContext2D | null;
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
      // Rotating is destructive, so an upward swipe needs more travel.
      swipeThresholds: { up: 48 },
    });
    this.previewCanvas = options.previewCanvas;
    this.previewCtx = options.previewCanvas?.getContext("2d") ?? null;
    window.addEventListener("keydown", this.handleKeyDown);
    this.resizeObserver = new ResizeObserver(() => this.resize());
    this.resizeObserver.observe(canvas);
    if (this.previewCanvas) this.resizeObserver.observe(this.previewCanvas);
    this.resize();
  }

  start(): void {
    if (this.timer !== null || this.destroyed || this.paused || this.engine.gameOver) return;
    this.scheduleTick();
  }

  stop(): void {
    if (this.timer === null) return;
    clearTimeout(this.timer);
    this.timer = null;
  }

  pause(): void {
    if (this.engine.gameOver) return;
    this.paused = true;
    this.stop();
  }

  resume(): void {
    this.paused = false;
    this.start();
  }

  moveLeft(): void {
    if (this.paused) return;
    this.engine.move(-1);
    this.sync();
  }

  moveRight(): void {
    if (this.paused) return;
    this.engine.move(1);
    this.sync();
  }

  rotate(): void {
    if (this.paused) return;
    this.engine.rotate();
    this.sync();
  }

  softDrop(): void {
    if (this.paused) return;
    this.engine.softDrop();
    this.sync();
  }

  hardDrop(): void {
    if (this.paused) return;
    this.engine.hardDrop();
    this.sync();
  }

  restart(): void {
    this.engine.reset();
    this.paused = false;
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
    if (direction === "left") this.moveLeft();
    else if (direction === "right") this.moveRight();
    else if (direction === "down") this.softDrop();
    else this.rotate();
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
    this.hardDrop();
  };

  private resize(): void {
    if (this.previewCanvas && fitCanvasToDisplaySize(this.previewCanvas)) this.drawPreview();
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

    this.drawPreview();
  }

  private drawPreview(): void {
    const { previewCanvas: canvas, previewCtx: ctx, engine } = this;
    if (!canvas || !ctx || canvas.width === 0 || canvas.height === 0) return;
    const cells = engine.pieceCells({ kind: engine.next, rotation: 0, x: 0, y: 0 });
    const minX = Math.min(...cells.map((cell) => cell.x));
    const maxX = Math.max(...cells.map((cell) => cell.x));
    const minY = Math.min(...cells.map((cell) => cell.y));
    const maxY = Math.max(...cells.map((cell) => cell.y));
    const size = Math.min(canvas.width, canvas.height) / 5;
    const offsetX = (canvas.width - (maxX - minX + 1) * size) / 2;
    const offsetY = (canvas.height - (maxY - minY + 1) * size) / 2;
    ctx.fillStyle = "#111";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = COLORS[engine.next];
    for (const cell of cells) {
      ctx.fillRect(
        offsetX + (cell.x - minX) * size + 1,
        offsetY + (cell.y - minY) * size + 1,
        size - 2,
        size - 2,
      );
    }
  }

  private drawCell(x: number, y: number, w: number, h: number, color: string): void {
    if (y < 0) return;
    this.ctx.fillStyle = color;
    this.ctx.fillRect(x * w + 1, y * h + 1, w - 2, h - 2);
  }
}

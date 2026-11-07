import { fitCanvasToDisplaySize } from "../shared/canvas.ts";
import type { Cell } from "../shared/grid.ts";
import {
  MinesweeperEngine,
  type MinesweeperEngineOptions,
  type MinesweeperStatus,
} from "./engine.ts";

const LONG_PRESS_MS = 350;

const NUMBER_COLORS: Record<number, string> = {
  1: "#5b9dff",
  2: "#46d07e",
  3: "#e5484d",
  4: "#9b6df3",
  5: "#f2a93b",
  6: "#3bc7c4",
  7: "#f0f0f0",
  8: "#8b93a3",
};

export interface MinesweeperGameOptions extends MinesweeperEngineOptions {
  /** Called once when the first reveal starts the game. */
  onStart?: () => void;
  onFlags?: (remaining: number) => void;
  onGameOver?: (status: "won" | "lost") => void;
}

export class MinesweeperGame {
  readonly engine: MinesweeperEngine;
  private flagMode = false;
  private readonly canvas: HTMLCanvasElement;
  private readonly ctx: CanvasRenderingContext2D;
  private readonly onStart?: () => void;
  private readonly onFlags?: (remaining: number) => void;
  private readonly onGameOver?: (status: "won" | "lost") => void;
  private readonly resizeObserver: ResizeObserver;
  private longPressTimer: ReturnType<typeof setTimeout> | null = null;
  private longPressFired = false;
  private lastStatus: MinesweeperStatus = "ready";
  private lastRemaining: number;
  private destroyed = false;

  constructor(canvas: HTMLCanvasElement, options: MinesweeperGameOptions = {}) {
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("MinesweeperGame requires a 2d canvas context");
    this.canvas = canvas;
    this.ctx = ctx;
    this.onStart = options.onStart;
    this.onFlags = options.onFlags;
    this.onGameOver = options.onGameOver;
    this.engine = new MinesweeperEngine(options);
    this.lastRemaining = this.engine.minesRemaining;
    canvas.addEventListener("pointerdown", this.handlePointerDown);
    canvas.addEventListener("pointerup", this.handlePointerUp);
    canvas.addEventListener("pointercancel", this.handlePointerCancel);
    canvas.addEventListener("pointerleave", this.handlePointerCancel);
    canvas.addEventListener("contextmenu", this.handleContextMenu);
    this.resizeObserver = new ResizeObserver(() => this.resize());
    this.resizeObserver.observe(canvas);
    this.resize();
  }

  /** When enabled, taps flag cells instead of revealing them. */
  setFlagMode(flagMode: boolean): void {
    this.flagMode = flagMode;
  }

  restart(): void {
    this.engine.reset();
    this.lastStatus = "ready";
    this.lastRemaining = this.engine.minesRemaining;
    this.onFlags?.(this.engine.minesRemaining);
    this.draw();
  }

  destroy(): void {
    this.destroyed = true;
    this.clearLongPress();
    this.canvas.removeEventListener("pointerdown", this.handlePointerDown);
    this.canvas.removeEventListener("pointerup", this.handlePointerUp);
    this.canvas.removeEventListener("pointercancel", this.handlePointerCancel);
    this.canvas.removeEventListener("pointerleave", this.handlePointerCancel);
    this.canvas.removeEventListener("contextmenu", this.handleContextMenu);
    this.resizeObserver.disconnect();
  }

  private handleContextMenu = (event: Event): void => {
    event.preventDefault();
  };

  private handlePointerDown = (event: PointerEvent): void => {
    event.preventDefault();
    this.longPressFired = false;
    const cell = this.cellFromEvent(event);
    if (!cell) return;
    if (event.button === 2) {
      this.flag(cell);
      return;
    }
    if (event.pointerType === "mouse") return;
    this.clearLongPress();
    this.longPressTimer = setTimeout(() => {
      this.longPressTimer = null;
      this.longPressFired = true;
      this.flag(cell);
    }, LONG_PRESS_MS);
  };

  private handlePointerUp = (event: PointerEvent): void => {
    this.clearLongPress();
    if (event.button !== 0 || this.destroyed) return;
    if (this.longPressFired) {
      this.longPressFired = false;
      return;
    }
    const cell = this.cellFromEvent(event);
    if (!cell) return;
    if (this.flagMode) this.flag(cell);
    else this.reveal(cell);
  };

  private handlePointerCancel = (): void => {
    this.clearLongPress();
  };

  private clearLongPress(): void {
    if (this.longPressTimer === null) return;
    clearTimeout(this.longPressTimer);
    this.longPressTimer = null;
  }

  private cellFromEvent(event: PointerEvent): Cell | undefined {
    const rect = this.canvas.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return undefined;
    const x = Math.floor(((event.clientX - rect.left) / rect.width) * this.engine.cols);
    const y = Math.floor(((event.clientY - rect.top) / rect.height) * this.engine.rows);
    if (x < 0 || y < 0 || x >= this.engine.cols || y >= this.engine.rows) return undefined;
    return { x, y };
  }

  private reveal(cell: Cell): void {
    this.engine.reveal(cell.x, cell.y);
    this.sync();
  }

  private flag(cell: Cell): void {
    this.engine.toggleFlag(cell.x, cell.y);
    this.sync();
  }

  private sync(): void {
    this.draw();
    const { status, minesRemaining } = this.engine;
    if (status !== this.lastStatus) {
      const previous = this.lastStatus;
      this.lastStatus = status;
      if (previous === "ready" && status === "playing") this.onStart?.();
      if (status === "won" || status === "lost") this.onGameOver?.(status);
    }
    if (minesRemaining !== this.lastRemaining) {
      this.lastRemaining = minesRemaining;
      this.onFlags?.(minesRemaining);
    }
  }

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

    for (const cell of engine.cells) {
      const px = cell.x * cellW;
      const py = cell.y * cellH;
      if (cell.revealed) {
        ctx.fillStyle = cell.exploded ? "#8c2f39" : "#1b1e24";
        ctx.fillRect(px + 0.5, py + 0.5, cellW - 1, cellH - 1);
        if (cell.mine) this.drawMine(px, py, cellW, cellH);
        else if (cell.adjacent > 0) this.drawNumber(cell.adjacent, px, py, cellW, cellH);
      } else {
        ctx.fillStyle = "#3a4150";
        ctx.fillRect(px + 0.5, py + 0.5, cellW - 1, cellH - 1);
        if (cell.flagged) {
          this.drawFlag(px, py, cellW, cellH);
          if (engine.status === "lost" && !cell.mine) this.drawCross(px, py, cellW, cellH);
        } else if (engine.status === "lost" && cell.mine) {
          this.drawMine(px, py, cellW, cellH);
        }
      }
    }
  }

  private drawNumber(value: number, px: number, py: number, w: number, h: number): void {
    const { ctx } = this;
    ctx.fillStyle = NUMBER_COLORS[value] ?? "#f0f0f0";
    ctx.font = `700 ${Math.min(w, h) * 0.55}px -apple-system, system-ui, sans-serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(String(value), px + w / 2, py + h / 2);
  }

  private drawFlag(px: number, py: number, w: number, h: number): void {
    const { ctx } = this;
    const size = Math.min(w, h);
    const poleX = px + w * 0.58;
    const top = py + h * 0.22;
    const base = py + h * 0.74;
    ctx.strokeStyle = "#d7dce5";
    ctx.lineWidth = size * 0.06;
    ctx.beginPath();
    ctx.moveTo(poleX, base);
    ctx.lineTo(poleX, top);
    ctx.stroke();
    ctx.fillStyle = "#e5484d";
    ctx.beginPath();
    ctx.moveTo(poleX, top);
    ctx.lineTo(poleX - size * 0.3, top + size * 0.15);
    ctx.lineTo(poleX, top + size * 0.3);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = "#d7dce5";
    ctx.fillRect(px + w * 0.38, base, w * 0.4, Math.max(1.5, size * 0.05));
  }

  private drawMine(px: number, py: number, w: number, h: number): void {
    const { ctx } = this;
    const size = Math.min(w, h);
    const cx = px + w / 2;
    const cy = py + h / 2;
    const r = size * 0.26;
    ctx.strokeStyle = "#0c0e12";
    ctx.lineWidth = Math.max(1, size * 0.05);
    ctx.beginPath();
    for (let i = 0; i < 4; i++) {
      const angle = (Math.PI / 4) * i;
      ctx.moveTo(cx - Math.cos(angle) * r * 1.4, cy - Math.sin(angle) * r * 1.4);
      ctx.lineTo(cx + Math.cos(angle) * r * 1.4, cy + Math.sin(angle) * r * 1.4);
    }
    ctx.stroke();
    ctx.fillStyle = "#0c0e12";
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#f0f0f0";
    ctx.beginPath();
    ctx.arc(cx - r * 0.3, cy - r * 0.3, r * 0.22, 0, Math.PI * 2);
    ctx.fill();
  }

  private drawCross(px: number, py: number, w: number, h: number): void {
    const { ctx } = this;
    ctx.strokeStyle = "#e5484d";
    ctx.lineWidth = Math.max(1.5, Math.min(w, h) * 0.08);
    ctx.beginPath();
    ctx.moveTo(px + w * 0.2, py + h * 0.2);
    ctx.lineTo(px + w * 0.8, py + h * 0.8);
    ctx.moveTo(px + w * 0.8, py + h * 0.2);
    ctx.lineTo(px + w * 0.2, py + h * 0.8);
    ctx.stroke();
  }
}

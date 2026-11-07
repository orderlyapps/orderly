export type MinesweeperStatus = "ready" | "playing" | "won" | "lost";

export interface MinesweeperCell {
  readonly x: number;
  readonly y: number;
  mine: boolean;
  revealed: boolean;
  flagged: boolean;
  /** Mines in the 8 surrounding cells. Set when mines are placed. */
  adjacent: number;
  /** The mine whose reveal ended the game. */
  exploded: boolean;
}

export interface MinesweeperEngineOptions {
  cols?: number;
  rows?: number;
  mines?: number;
  random?: () => number;
}

export class MinesweeperEngine {
  readonly cols: number;
  readonly rows: number;
  readonly mines: number;
  cells: MinesweeperCell[] = [];
  status: MinesweeperStatus = "ready";
  revealedCount = 0;
  flagCount = 0;
  private minesPlaced = false;
  private readonly random: () => number;

  constructor(options: MinesweeperEngineOptions = {}) {
    this.cols = Math.max(2, Math.floor(options.cols ?? 9));
    this.rows = Math.max(2, Math.floor(options.rows ?? 9));
    this.mines = Math.max(1, Math.min(Math.floor(options.mines ?? 10), this.cols * this.rows - 1));
    this.random = options.random ?? Math.random;
    this.reset();
  }

  get minesRemaining(): number {
    return this.mines - this.flagCount;
  }

  cellAt(x: number, y: number): MinesweeperCell | undefined {
    if (x < 0 || y < 0 || x >= this.cols || y >= this.rows) return undefined;
    return this.cells[y * this.cols + x];
  }

  neighbors(cell: MinesweeperCell): MinesweeperCell[] {
    const out: MinesweeperCell[] = [];
    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        if (dx === 0 && dy === 0) continue;
        const next = this.cellAt(cell.x + dx, cell.y + dy);
        if (next) out.push(next);
      }
    }
    return out;
  }

  reset(): void {
    this.cells = [];
    for (let y = 0; y < this.rows; y++) {
      for (let x = 0; x < this.cols; x++) {
        this.cells.push({
          x,
          y,
          mine: false,
          revealed: false,
          flagged: false,
          adjacent: 0,
          exploded: false,
        });
      }
    }
    this.status = "ready";
    this.revealedCount = 0;
    this.flagCount = 0;
    this.minesPlaced = false;
  }

  reveal(x: number, y: number): void {
    if (this.status === "won" || this.status === "lost") return;
    const cell = this.cellAt(x, y);
    if (!cell || cell.flagged) return;
    if (cell.revealed) {
      this.chord(cell);
      return;
    }
    if (!this.minesPlaced) {
      this.placeMines(cell);
      this.minesPlaced = true;
      this.status = "playing";
    }
    if (cell.mine) {
      this.lose(cell);
      return;
    }
    this.floodReveal(cell);
    this.checkWin();
  }

  toggleFlag(x: number, y: number): void {
    if (this.status === "won" || this.status === "lost") return;
    const cell = this.cellAt(x, y);
    if (!cell || cell.revealed) return;
    cell.flagged = !cell.flagged;
    this.flagCount += cell.flagged ? 1 : -1;
  }

  /** Reveal all covered neighbors of a satisfied number cell. */
  private chord(cell: MinesweeperCell): void {
    if (cell.adjacent === 0) return;
    const around = this.neighbors(cell);
    if (around.filter((n) => n.flagged).length !== cell.adjacent) return;
    for (const next of around) {
      if (next.flagged || next.revealed) continue;
      if (next.mine) {
        this.lose(next);
        return;
      }
      this.floodReveal(next);
    }
    this.checkWin();
  }

  private placeMines(safe: MinesweeperCell): void {
    // Keep the first click and its neighbors mine-free when the board has room.
    let safeZone = new Set<MinesweeperCell>([safe, ...this.neighbors(safe)]);
    if (this.cells.length - safeZone.size < this.mines) {
      safeZone = new Set([safe]);
    }
    const candidates = this.cells.filter((cell) => !safeZone.has(cell));
    for (let i = 0; i < this.mines; i++) {
      const j = i + Math.floor(this.random() * (candidates.length - i));
      const picked = candidates[j]!;
      candidates[j] = candidates[i]!;
      candidates[i] = picked;
      picked.mine = true;
    }
    for (const cell of this.cells) {
      cell.adjacent = this.neighbors(cell).filter((n) => n.mine).length;
    }
  }

  private floodReveal(start: MinesweeperCell): void {
    const stack = [start];
    while (stack.length > 0) {
      const cell = stack.pop()!;
      if (cell.revealed || cell.flagged) continue;
      cell.revealed = true;
      this.revealedCount += 1;
      if (cell.adjacent === 0) {
        for (const next of this.neighbors(cell)) {
          if (!next.revealed && !next.mine) stack.push(next);
        }
      }
    }
  }

  private lose(cell: MinesweeperCell): void {
    cell.exploded = true;
    cell.revealed = true;
    this.status = "lost";
  }

  private checkWin(): void {
    if (this.revealedCount !== this.cols * this.rows - this.mines) return;
    this.status = "won";
    for (const cell of this.cells) {
      if (cell.mine && !cell.flagged) {
        cell.flagged = true;
        this.flagCount += 1;
      }
    }
  }
}

import type { Cell } from "../shared/grid.ts";

export type TetrominoKind = "I" | "O" | "T" | "S" | "Z" | "J" | "L";

export const TETROMINO_KINDS: TetrominoKind[] = ["I", "O", "T", "S", "Z", "J", "L"];

interface TetrominoShape {
  /** Side length of the square box the piece rotates inside. */
  size: number;
  cells: Cell[];
}

const BASE_SHAPES: Record<TetrominoKind, TetrominoShape> = {
  I: {
    size: 4,
    cells: [
      { x: 0, y: 1 },
      { x: 1, y: 1 },
      { x: 2, y: 1 },
      { x: 3, y: 1 },
    ],
  },
  O: {
    size: 2,
    cells: [
      { x: 0, y: 0 },
      { x: 1, y: 0 },
      { x: 0, y: 1 },
      { x: 1, y: 1 },
    ],
  },
  T: {
    size: 3,
    cells: [
      { x: 1, y: 0 },
      { x: 0, y: 1 },
      { x: 1, y: 1 },
      { x: 2, y: 1 },
    ],
  },
  S: {
    size: 3,
    cells: [
      { x: 1, y: 0 },
      { x: 2, y: 0 },
      { x: 0, y: 1 },
      { x: 1, y: 1 },
    ],
  },
  Z: {
    size: 3,
    cells: [
      { x: 0, y: 0 },
      { x: 1, y: 0 },
      { x: 1, y: 1 },
      { x: 2, y: 1 },
    ],
  },
  J: {
    size: 3,
    cells: [
      { x: 0, y: 0 },
      { x: 0, y: 1 },
      { x: 1, y: 1 },
      { x: 2, y: 1 },
    ],
  },
  L: {
    size: 3,
    cells: [
      { x: 2, y: 0 },
      { x: 0, y: 1 },
      { x: 1, y: 1 },
      { x: 2, y: 1 },
    ],
  },
};

function rotationsOf(shape: TetrominoShape): Cell[][] {
  const rotations: Cell[][] = [shape.cells];
  for (let i = 1; i < 4; i++) {
    rotations.push(rotations[i - 1]!.map(({ x, y }) => ({ x: shape.size - 1 - y, y: x })));
  }
  return rotations;
}

const ROTATIONS: Record<TetrominoKind, Cell[][]> = Object.fromEntries(
  TETROMINO_KINDS.map((kind) => [kind, rotationsOf(BASE_SHAPES[kind])]),
) as Record<TetrominoKind, Cell[][]>;

/** Horizontal/vertical shifts tried when a rotation would collide. */
const ROTATION_KICKS: Cell[] = [
  { x: 0, y: 0 },
  { x: -1, y: 0 },
  { x: 1, y: 0 },
  { x: -2, y: 0 },
  { x: 2, y: 0 },
  { x: 0, y: -1 },
];

const LINE_POINTS = [0, 100, 300, 500, 800];

export interface TetrisPiece {
  kind: TetrominoKind;
  /** Rotation index, 0-3. */
  rotation: number;
  /** Left edge of the piece's box on the board. */
  x: number;
  /** Top edge of the piece's box on the board; may be negative. */
  y: number;
}

export interface TetrisEngineOptions {
  cols?: number;
  rows?: number;
  random?: () => number;
}

export class TetrisEngine {
  readonly cols: number;
  readonly rows: number;
  /** Locked cells in row-major order. */
  board: (TetrominoKind | null)[] = [];
  piece: TetrisPiece = { kind: "I", rotation: 0, x: 0, y: 0 };
  /** Kind of the piece that will spawn next. */
  next: TetrominoKind = "I";
  score = 0;
  lines = 0;
  gameOver = false;
  private bag: TetrominoKind[] = [];
  private readonly random: () => number;

  constructor(options: TetrisEngineOptions = {}) {
    this.cols = Math.max(4, Math.floor(options.cols ?? 10));
    this.rows = Math.max(4, Math.floor(options.rows ?? 20));
    this.random = options.random ?? Math.random;
    this.reset();
  }

  /** Increases every 10 cleared lines. */
  get level(): number {
    return Math.floor(this.lines / 10) + 1;
  }

  reset(): void {
    this.board = Array.from({ length: this.cols * this.rows }, () => null);
    this.bag = [];
    this.score = 0;
    this.lines = 0;
    this.gameOver = false;
    this.next = this.nextKind();
    this.spawn();
  }

  cellAt(x: number, y: number): TetrominoKind | null | undefined {
    if (x < 0 || y < 0 || x >= this.cols || y >= this.rows) return undefined;
    return this.board[y * this.cols + x];
  }

  /** Board cells occupied by a piece (defaults to the active piece). */
  pieceCells(piece: TetrisPiece = this.piece): Cell[] {
    return ROTATIONS[piece.kind][piece.rotation]!.map((cell) => ({
      x: piece.x + cell.x,
      y: piece.y + cell.y,
    }));
  }

  collides(piece: TetrisPiece): boolean {
    return this.pieceCells(piece).some(
      (cell) =>
        cell.x < 0 ||
        cell.x >= this.cols ||
        cell.y >= this.rows ||
        (cell.y >= 0 && this.board[cell.y * this.cols + cell.x] !== null),
    );
  }

  /** Rows the piece can still descend before locking; used for the ghost. */
  dropDistance(): number {
    let distance = 0;
    while (!this.collides({ ...this.piece, y: this.piece.y + distance + 1 })) distance += 1;
    return distance;
  }

  move(dx: number): boolean {
    if (this.gameOver) return false;
    const candidate = { ...this.piece, x: this.piece.x + dx };
    if (this.collides(candidate)) return false;
    this.piece = candidate;
    return true;
  }

  /** Rotates clockwise (direction 1) or counter-clockwise (direction -1). */
  rotate(direction = 1): boolean {
    if (this.gameOver) return false;
    const rotation = (this.piece.rotation + direction + 4) % 4;
    for (const kick of ROTATION_KICKS) {
      const candidate = {
        ...this.piece,
        rotation,
        x: this.piece.x + kick.x,
        y: this.piece.y + kick.y,
      };
      if (!this.collides(candidate)) {
        this.piece = candidate;
        return true;
      }
    }
    return false;
  }

  /** Gravity step: descend one row, or lock the piece if it cannot. */
  step(): void {
    if (this.gameOver) return;
    if (this.collides({ ...this.piece, y: this.piece.y + 1 })) {
      this.lock();
      return;
    }
    this.piece = { ...this.piece, y: this.piece.y + 1 };
  }

  /** Like step, but scores one point per descended row. */
  softDrop(): void {
    if (this.gameOver) return;
    if (this.collides({ ...this.piece, y: this.piece.y + 1 })) {
      this.lock();
      return;
    }
    this.piece = { ...this.piece, y: this.piece.y + 1 };
    this.score += 1;
  }

  /** Drops the piece to its landing position and locks it, scoring 2/row. */
  hardDrop(): void {
    if (this.gameOver) return;
    const distance = this.dropDistance();
    this.piece = { ...this.piece, y: this.piece.y + distance };
    this.score += distance * 2;
    this.lock();
  }

  private spawn(): void {
    const kind = this.next;
    this.next = this.nextKind();
    const minY = Math.min(...ROTATIONS[kind][0]!.map((cell) => cell.y));
    this.piece = {
      kind,
      rotation: 0,
      x: Math.floor((this.cols - BASE_SHAPES[kind].size) / 2),
      y: -minY,
    };
    if (this.collides(this.piece)) this.gameOver = true;
  }

  /** Deals pieces from a shuffled bag so every kind appears once per cycle. */
  private nextKind(): TetrominoKind {
    if (this.bag.length === 0) {
      this.bag = [...TETROMINO_KINDS];
      for (let i = this.bag.length - 1; i > 0; i--) {
        const j = Math.floor(this.random() * (i + 1));
        const picked = this.bag[j]!;
        this.bag[j] = this.bag[i]!;
        this.bag[i] = picked;
      }
    }
    return this.bag.pop()!;
  }

  private lock(): void {
    let lockedOut = false;
    for (const cell of this.pieceCells()) {
      if (cell.y < 0) {
        lockedOut = true;
        continue;
      }
      this.board[cell.y * this.cols + cell.x] = this.piece.kind;
    }
    if (lockedOut) {
      this.gameOver = true;
      return;
    }
    const cleared = this.clearLines();
    if (cleared > 0) {
      this.score += LINE_POINTS[cleared]! * this.level;
      this.lines += cleared;
    }
    this.spawn();
  }

  private clearLines(): number {
    let cleared = 0;
    for (let y = this.rows - 1; y >= 0; y--) {
      let full = true;
      for (let x = 0; x < this.cols; x++) {
        if (this.board[y * this.cols + x] === null) {
          full = false;
          break;
        }
      }
      if (!full) continue;
      this.board.splice(y * this.cols, this.cols);
      this.board.unshift(...Array.from({ length: this.cols }, () => null));
      cleared += 1;
      y += 1;
    }
    return cleared;
  }
}

import {
  cellsEqual,
  DIRECTION_DELTAS,
  OPPOSITE_DIRECTIONS,
  type Cell,
  type Direction,
} from "../shared/grid.ts";

export interface SnakeEngineOptions {
  cols?: number;
  rows?: number;
  random?: () => number;
}

/** Smallest board that can hold the starting snake plus one food cell. */
const MIN_BOARD_SIZE = 4;
/** How many turns may be buffered between ticks. */
const MAX_QUEUED_TURNS = 2;

export class SnakeEngine {
  readonly cols: number;
  readonly rows: number;
  snake: Cell[] = [];
  food: Cell = { x: 0, y: 0 };
  direction: Direction = "right";
  score = 0;
  gameOver = false;
  private directionQueue: Direction[] = [];
  private readonly random: () => number;

  constructor(options: SnakeEngineOptions = {}) {
    this.cols = Math.max(MIN_BOARD_SIZE, Math.floor(options.cols ?? 20));
    this.rows = Math.max(MIN_BOARD_SIZE, Math.floor(options.rows ?? 20));
    this.random = options.random ?? Math.random;
    this.reset();
  }

  reset(): void {
    const cx = Math.floor(this.cols / 2);
    const cy = Math.floor(this.rows / 2);
    this.snake = [
      { x: cx, y: cy },
      { x: cx - 1, y: cy },
      { x: cx - 2, y: cy },
    ];
    this.direction = "right";
    this.directionQueue = [];
    this.score = 0;
    this.gameOver = false;
    this.spawnFood();
  }

  setDirection(direction: Direction): void {
    const last = this.directionQueue.at(-1) ?? this.direction;
    if (direction === last || direction === OPPOSITE_DIRECTIONS[last]) return;
    if (this.directionQueue.length < MAX_QUEUED_TURNS) this.directionQueue.push(direction);
  }

  step(): void {
    if (this.gameOver) return;
    this.direction = this.directionQueue.shift() ?? this.direction;
    const delta = DIRECTION_DELTAS[this.direction];
    const head = this.snake[0]!;
    const next = { x: head.x + delta.x, y: head.y + delta.y };

    const eating = cellsEqual(next, this.food);
    const body = eating ? this.snake : this.snake.slice(0, -1);
    const hitsWall = next.x < 0 || next.y < 0 || next.x >= this.cols || next.y >= this.rows;
    const hitsSelf = body.some((cell) => cellsEqual(cell, next));
    if (hitsWall || hitsSelf) {
      this.gameOver = true;
      return;
    }

    this.snake = [next, ...body];
    if (eating) {
      this.score += 1;
      this.spawnFood();
    }
  }

  private spawnFood(): void {
    const free: Cell[] = [];
    for (let y = 0; y < this.rows; y++) {
      for (let x = 0; x < this.cols; x++) {
        if (!this.snake.some((cell) => cell.x === x && cell.y === y)) free.push({ x, y });
      }
    }
    if (free.length === 0) {
      this.gameOver = true;
      return;
    }
    const index = Math.min(free.length - 1, Math.floor(this.random() * free.length));
    this.food = free[index]!;
  }
}

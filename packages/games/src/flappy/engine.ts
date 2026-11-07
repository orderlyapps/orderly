export interface FlappyPipe {
  /** Left edge of the pipe in world units. */
  x: number;
  /** Top edge of the gap in world units. */
  gapY: number;
  /** Whether the bird has already cleared this pipe. */
  passed: boolean;
}

export interface FlappyEngineOptions {
  /** World width in units. */
  width?: number;
  /** World height in units. */
  height?: number;
  /** Height of the ground strip; the bird dies at height - groundHeight. */
  groundHeight?: number;
  /** Horizontal position of the bird from the left edge. */
  birdX?: number;
  birdRadius?: number;
  /** Downward velocity gained each step. */
  gravity?: number;
  /** Upward velocity applied by a flap. */
  flapVelocity?: number;
  /** Pipe speed in world units per step. */
  pipeSpeed?: number;
  pipeWidth?: number;
  /** Vertical height of the gap between pipe segments. */
  pipeGap?: number;
  /** Horizontal distance between successive pipe left edges. */
  pipeSpacing?: number;
  /** Minimum distance between a gap and the ceiling or floor. */
  gapMargin?: number;
  random?: () => number;
}

export class FlappyEngine {
  readonly width: number;
  readonly height: number;
  readonly groundHeight: number;
  readonly birdX: number;
  readonly birdRadius: number;
  readonly gravity: number;
  readonly flapVelocity: number;
  readonly pipeSpeed: number;
  readonly pipeWidth: number;
  readonly pipeGap: number;
  readonly pipeSpacing: number;
  readonly gapMargin: number;
  birdY = 0;
  birdVelocity = 0;
  pipes: FlappyPipe[] = [];
  score = 0;
  started = false;
  gameOver = false;
  private readonly random: () => number;

  constructor(options: FlappyEngineOptions = {}) {
    this.height = Math.max(20, options.height ?? 100);
    this.width = Math.max(20, options.width ?? 75);
    this.groundHeight = Math.max(0, Math.min(options.groundHeight ?? 14, this.height - 10));
    this.birdX = Math.max(1, Math.min(options.birdX ?? this.width * 0.24, this.width - 1));
    this.birdRadius = options.birdRadius ?? 3.2;
    this.gravity = options.gravity ?? 0.09;
    this.flapVelocity = options.flapVelocity ?? 1.15;
    this.pipeSpeed = options.pipeSpeed ?? 0.35;
    this.pipeWidth = options.pipeWidth ?? 9;
    this.pipeGap = Math.min(options.pipeGap ?? 26, this.floorY - 4);
    this.pipeSpacing = Math.max(1, Math.min(options.pipeSpacing ?? 42, this.width));
    this.gapMargin = options.gapMargin ?? 8;
    this.random = options.random ?? Math.random;
    this.reset();
  }

  /** Y coordinate of the ground surface. */
  get floorY(): number {
    return this.height - this.groundHeight;
  }

  reset(): void {
    this.birdY = this.floorY * 0.5;
    this.birdVelocity = 0;
    this.pipes = [];
    this.score = 0;
    this.started = false;
    this.gameOver = false;
  }

  flap(): void {
    if (this.gameOver) return;
    this.started = true;
    this.birdVelocity = -this.flapVelocity;
  }

  step(): void {
    if (this.gameOver || !this.started) return;

    this.birdVelocity += this.gravity;
    this.birdY += this.birdVelocity;

    // The ceiling clamps; the floor is fatal.
    if (this.birdY < this.birdRadius) {
      this.birdY = this.birdRadius;
      this.birdVelocity = 0;
    }
    if (this.birdY + this.birdRadius >= this.floorY) {
      this.birdY = this.floorY - this.birdRadius;
      this.gameOver = true;
      return;
    }

    for (const pipe of this.pipes) {
      pipe.x -= this.pipeSpeed;
      if (!pipe.passed && pipe.x + this.pipeWidth < this.birdX - this.birdRadius) {
        pipe.passed = true;
        this.score += 1;
      }
    }
    while (this.pipes.length > 0 && this.pipes[0]!.x + this.pipeWidth < 0) {
      this.pipes.shift();
    }
    const last = this.pipes.at(-1);
    if (!last || last.x <= this.width - this.pipeSpacing) this.spawnPipe();

    for (const pipe of this.pipes) {
      const overlapsX =
        this.birdX + this.birdRadius > pipe.x &&
        this.birdX - this.birdRadius < pipe.x + this.pipeWidth;
      const outsideGap =
        this.birdY - this.birdRadius < pipe.gapY ||
        this.birdY + this.birdRadius > pipe.gapY + this.pipeGap;
      if (overlapsX && outsideGap) {
        this.gameOver = true;
        return;
      }
    }
  }

  private spawnPipe(): void {
    const min = this.gapMargin;
    const max = Math.max(min, this.floorY - this.pipeGap - this.gapMargin);
    const gapY = min + this.random() * (max - min);
    this.pipes.push({ x: this.width, gapY, passed: false });
  }
}

import type { Direction } from "./grid.ts";

const DEFAULT_KEY_DIRECTIONS: Record<string, Direction> = {
  ArrowUp: "up",
  ArrowDown: "down",
  ArrowLeft: "left",
  ArrowRight: "right",
  w: "up",
  s: "down",
  a: "left",
  d: "right",
};

const DEFAULT_SWIPE_THRESHOLD = 24;

export interface DirectionalInputOptions {
  onDirection: (direction: Direction) => void;
  /** Key to direction mappings, merged over the arrow/WASD defaults. */
  keys?: Record<string, Direction>;
  /** Minimum swipe distance in pixels before a direction is emitted. */
  swipeThreshold?: number;
}

/**
 * Emits directions from arrow/WASD keys (on window) and swipes (on the element).
 * Key presses are ignored while typing in editable elements and while the
 * element is not rendered.
 */
export class DirectionalInput {
  private readonly element: HTMLElement;
  private readonly onDirection: (direction: Direction) => void;
  private readonly keys: Record<string, Direction>;
  private readonly swipeThreshold: number;
  private touchStart: { x: number; y: number } | null = null;

  constructor(element: HTMLElement, options: DirectionalInputOptions) {
    this.element = element;
    this.onDirection = options.onDirection;
    this.keys = { ...DEFAULT_KEY_DIRECTIONS, ...options.keys };
    this.swipeThreshold = options.swipeThreshold ?? DEFAULT_SWIPE_THRESHOLD;

    window.addEventListener("keydown", this.handleKeyDown);
    element.addEventListener("touchstart", this.handleTouchStart, { passive: false });
    element.addEventListener("touchmove", this.handleTouchMove, { passive: false });
    element.addEventListener("touchend", this.handleTouchEnd);
    element.addEventListener("touchcancel", this.handleTouchEnd);
  }

  destroy(): void {
    window.removeEventListener("keydown", this.handleKeyDown);
    this.element.removeEventListener("touchstart", this.handleTouchStart);
    this.element.removeEventListener("touchmove", this.handleTouchMove);
    this.element.removeEventListener("touchend", this.handleTouchEnd);
    this.element.removeEventListener("touchcancel", this.handleTouchEnd);
  }

  private handleKeyDown = (event: KeyboardEvent): void => {
    const direction = this.keys[event.key];
    if (!direction) return;
    const target = event.target;
    if (
      target instanceof HTMLInputElement ||
      target instanceof HTMLTextAreaElement ||
      target instanceof HTMLSelectElement ||
      (target instanceof HTMLElement && target.isContentEditable)
    ) {
      return;
    }
    if (this.element.getClientRects().length === 0) return;
    event.preventDefault();
    this.onDirection(direction);
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
    if (Math.max(Math.abs(dx), Math.abs(dy)) < this.swipeThreshold) return;
    this.onDirection(
      Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? "right" : "left") : dy > 0 ? "down" : "up",
    );
    this.touchStart = { x: touch.clientX, y: touch.clientY };
  };

  private handleTouchEnd = (): void => {
    this.touchStart = null;
  };
}

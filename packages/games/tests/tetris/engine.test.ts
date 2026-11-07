import { expect, test } from "vite-plus/test";
import { TetrisEngine, TETROMINO_KINDS } from "../../src/index.ts";

test("spawns a piece near the top center", () => {
  const engine = new TetrisEngine({ cols: 10, rows: 20 });
  expect(engine.gameOver).toBe(false);
  expect(engine.piece.x).toBeGreaterThanOrEqual(0);
  expect(engine.piece.x).toBeLessThan(10);
  expect(engine.pieceCells().every((cell) => cell.y <= 1)).toBe(true);
});

test("moves the piece left and right until the walls", () => {
  const engine = new TetrisEngine({ cols: 10, rows: 20 });
  engine.piece = { kind: "O", rotation: 0, x: 4, y: 0 };
  for (let i = 0; i < 10; i++) engine.move(-1);
  expect(engine.piece.x).toBe(0);
  for (let i = 0; i < 10; i++) engine.move(1);
  expect(engine.piece.x).toBe(8);
});

test("step descends and locks on the floor", () => {
  const engine = new TetrisEngine({ cols: 10, rows: 20 });
  engine.piece = { kind: "O", rotation: 0, x: 4, y: 0 };
  engine.step();
  expect(engine.piece.y).toBe(1);
  engine.piece = { kind: "O", rotation: 0, x: 4, y: 18 };
  engine.step();
  expect(engine.cellAt(4, 18)).toBe("O");
  expect(engine.cellAt(5, 19)).toBe("O");
  expect(engine.piece.y).toBeLessThan(2);
});

test("rotates a piece clockwise", () => {
  const engine = new TetrisEngine({ cols: 10, rows: 20 });
  engine.piece = { kind: "T", rotation: 0, x: 4, y: 0 };
  expect(engine.rotate()).toBe(true);
  expect(engine.piece.rotation).toBe(1);
  expect(engine.pieceCells()).toEqual([
    { x: 6, y: 1 },
    { x: 5, y: 0 },
    { x: 5, y: 1 },
    { x: 5, y: 2 },
  ]);
});

test("rotation kicks off the wall", () => {
  const engine = new TetrisEngine({ cols: 10, rows: 20 });
  engine.piece = { kind: "I", rotation: 0, x: -1, y: 0 };
  // Rotating a horizontal I at x=-1 needs a kick to fit the 4-wide box.
  engine.piece = { kind: "I", rotation: 1, x: -2, y: 0 };
  expect(engine.rotate(-1)).toBe(true);
  expect(engine.pieceCells().every((cell) => cell.x >= 0)).toBe(true);
});

test("clears a full line and scores", () => {
  const engine = new TetrisEngine({ cols: 10, rows: 20 });
  for (let x = 0; x < 10; x++) {
    if (x < 4 || x > 7) engine.board[19 * 10 + x] = "J";
  }
  engine.piece = { kind: "I", rotation: 0, x: 4, y: 18 };
  engine.hardDrop();
  expect(engine.lines).toBe(1);
  expect(engine.score).toBe(100);
  expect(engine.board.every((cell) => cell === null)).toBe(true);
});

test("a tetris clears four lines and scores 800", () => {
  const engine = new TetrisEngine({ cols: 10, rows: 20 });
  for (let y = 16; y < 20; y++) {
    for (let x = 0; x < 9; x++) engine.board[y * 10 + x] = "J";
  }
  engine.piece = { kind: "I", rotation: 1, x: 7, y: 0 };
  engine.hardDrop();
  expect(engine.lines).toBe(4);
  expect(engine.score).toBe(800 + 2 * 16);
  expect(engine.board.every((cell) => cell === null)).toBe(true);
});

test("soft drop scores one point per row", () => {
  const engine = new TetrisEngine({ cols: 10, rows: 20 });
  engine.piece = { kind: "O", rotation: 0, x: 4, y: 0 };
  engine.softDrop();
  expect(engine.piece.y).toBe(1);
  expect(engine.score).toBe(1);
});

test("hard drop scores two points per row", () => {
  const engine = new TetrisEngine({ cols: 10, rows: 20 });
  engine.piece = { kind: "O", rotation: 0, x: 4, y: 0 };
  engine.hardDrop();
  expect(engine.score).toBe(36);
  expect(engine.cellAt(4, 18)).toBe("O");
});

test("blocks movement into locked cells", () => {
  const engine = new TetrisEngine({ cols: 10, rows: 20 });
  engine.piece = { kind: "O", rotation: 0, x: 4, y: 0 };
  engine.board[3] = "I";
  expect(engine.move(-1)).toBe(false);
});

test("ends the game when a new piece cannot spawn", () => {
  const engine = new TetrisEngine({ cols: 10, rows: 20 });
  // Column 9 stays empty so these rows can never clear as lines.
  for (let y = 0; y < 4; y++) {
    for (let x = 0; x < 9; x++) engine.board[y * 10 + x] = "Z";
  }
  engine.piece = { kind: "O", rotation: 0, x: 4, y: 16 };
  engine.hardDrop();
  expect(engine.gameOver).toBe(true);
});

test("deals each tetromino once per bag", () => {
  const engine = new TetrisEngine({ cols: 10, rows: 40 });
  const seen = new Set([engine.piece.kind]);
  for (let i = 0; i < 6 && !engine.gameOver; i++) {
    engine.hardDrop();
    seen.add(engine.piece.kind);
  }
  expect(engine.gameOver).toBe(false);
  expect(seen.size).toBe(7);
  expect([...seen].every((kind) => TETROMINO_KINDS.includes(kind))).toBe(true);
});

test("ignores input after game over", () => {
  const engine = new TetrisEngine({ cols: 10, rows: 20 });
  engine.gameOver = true;
  const { x, y } = engine.piece;
  engine.step();
  engine.softDrop();
  engine.hardDrop();
  expect(engine.move(-1)).toBe(false);
  expect(engine.rotate()).toBe(false);
  expect(engine.piece.x).toBe(x);
  expect(engine.piece.y).toBe(y);
});

test("reset restores a fresh board", () => {
  const engine = new TetrisEngine({ cols: 10, rows: 20 });
  engine.board[0] = "I";
  engine.score = 500;
  engine.lines = 3;
  engine.gameOver = true;
  engine.reset();
  expect(engine.board.every((cell) => cell === null)).toBe(true);
  expect(engine.score).toBe(0);
  expect(engine.lines).toBe(0);
  expect(engine.gameOver).toBe(false);
});

import { expect, test } from "vite-plus/test";
import { MinesweeperEngine } from "../../src/index.ts";

test("starts covered and ready", () => {
  const engine = new MinesweeperEngine({ cols: 9, rows: 9, mines: 10 });
  expect(engine.status).toBe("ready");
  expect(engine.cells).toHaveLength(81);
  expect(engine.cells.every((cell) => !cell.revealed && !cell.mine)).toBe(true);
});

test("places mines on the first reveal, never on the clicked cell", () => {
  for (let y = 0; y < 5; y++) {
    for (let x = 0; x < 5; x++) {
      const engine = new MinesweeperEngine({ cols: 5, rows: 5, mines: 5 });
      engine.reveal(x, y);
      expect(engine.status).not.toBe("lost");
      expect(engine.cellAt(x, y)!.mine).toBe(false);
      expect(engine.cells.filter((cell) => cell.mine)).toHaveLength(5);
    }
  }
});

test("clamps the mine count so a safe cell always exists", () => {
  const engine = new MinesweeperEngine({ cols: 9, rows: 9, mines: 100 });
  expect(engine.mines).toBe(80);
});

test("flood reveals empty regions and wins when all safe cells are open", () => {
  // 3x3 with 1 mine: mines avoid the clicked cell and its neighbors, so with
  // random() => 0 the mine lands at (0,0) and everything else floods open.
  const engine = new MinesweeperEngine({ cols: 3, rows: 3, mines: 1, random: () => 0 });
  engine.reveal(2, 2);
  expect(engine.status).toBe("won");
  expect(engine.revealedCount).toBe(8);
  expect(engine.cellAt(0, 0)!.flagged).toBe(true);
  expect(engine.flagCount).toBe(1);
  expect(engine.minesRemaining).toBe(0);
});

test("loses when a mine is revealed", () => {
  const engine = new MinesweeperEngine({ cols: 3, rows: 3, mines: 1 });
  engine.cellAt(0, 0)!.mine = true;
  engine.reveal(0, 0);
  expect(engine.status).toBe("lost");
  expect(engine.cellAt(0, 0)!.exploded).toBe(true);
});

test("ignores reveals and flags after the game ends", () => {
  const engine = new MinesweeperEngine({ cols: 3, rows: 3, mines: 1 });
  engine.cellAt(0, 0)!.mine = true;
  engine.reveal(0, 0);
  engine.reveal(2, 2);
  engine.toggleFlag(1, 1);
  expect(engine.cellAt(2, 2)!.revealed).toBe(false);
  expect(engine.cellAt(1, 1)!.flagged).toBe(false);
});

/**
 * 9x9, 15 mines, random() => 0. Clicking (0,0) makes {(0,0)..(1,1)} safe and
 * fills candidates in row-major order, so mines land on rows 0-1 x=2-8 and on
 * (0,2). The flood reveals only the four safe corner cells, leaving (1,1) a
 * revealed 3 with covered neighbors (2,0), (2,1), (0,2) mined and (1,2),
 * (2,2) safe.
 */
function crowdedEngine() {
  const engine = new MinesweeperEngine({ cols: 9, rows: 9, mines: 15, random: () => 0 });
  engine.reveal(0, 0);
  return engine;
}

test("flags block revealing and count against mines remaining", () => {
  const engine = crowdedEngine();
  engine.toggleFlag(8, 8);
  expect(engine.flagCount).toBe(1);
  expect(engine.minesRemaining).toBe(14);
  engine.reveal(8, 8);
  expect(engine.cellAt(8, 8)!.revealed).toBe(false);
  engine.toggleFlag(8, 8);
  expect(engine.flagCount).toBe(0);
});

test("chords a satisfied number to reveal covered neighbors", () => {
  const engine = crowdedEngine();
  expect(engine.cellAt(1, 1)!.adjacent).toBe(3);
  for (const [x, y] of [
    [2, 0],
    [2, 1],
    [0, 2],
  ]) {
    engine.toggleFlag(x, y);
  }
  engine.reveal(1, 1);
  expect(engine.status).toBe("playing");
  expect(engine.cellAt(1, 2)!.revealed).toBe(true);
  expect(engine.cellAt(2, 2)!.revealed).toBe(true);
});

test("chording with a wrong flag can hit a mine and lose", () => {
  const engine = crowdedEngine();
  for (const [x, y] of [
    [2, 0],
    [2, 1],
    [1, 2],
  ]) {
    engine.toggleFlag(x, y);
  }
  engine.reveal(1, 1);
  expect(engine.status).toBe("lost");
  expect(engine.cellAt(0, 2)!.exploded).toBe(true);
});

test("does not chord while flags do not match the number", () => {
  const engine = crowdedEngine();
  engine.toggleFlag(2, 0);
  engine.reveal(1, 1);
  expect(engine.status).toBe("playing");
  expect(engine.cellAt(1, 2)!.revealed).toBe(false);
});

test("reset restores a fresh ready board", () => {
  const engine = new MinesweeperEngine({ cols: 3, rows: 3, mines: 1, random: () => 0 });
  engine.reveal(2, 2);
  expect(engine.status).toBe("won");
  engine.reset();
  expect(engine.status).toBe("ready");
  expect(engine.revealedCount).toBe(0);
  expect(engine.flagCount).toBe(0);
  expect(engine.cells.every((cell) => !cell.revealed && !cell.mine && !cell.flagged)).toBe(true);
});

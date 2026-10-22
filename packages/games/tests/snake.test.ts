import { expect, test } from "vite-plus/test";
import { SnakeEngine } from "../src/index.ts";

test("moves the snake forward", () => {
  const engine = new SnakeEngine({ cols: 10, rows: 10 });
  const head = { ...engine.snake[0]! };
  engine.step();
  expect(engine.snake[0]).toEqual({ x: head.x + 1, y: head.y });
  expect(engine.snake).toHaveLength(3);
});

test("ignores reversing direction", () => {
  const engine = new SnakeEngine({ cols: 10, rows: 10 });
  engine.setDirection("left");
  engine.step();
  expect(engine.snake[0]!.x).toBe(engine.snake[1]!.x + 1);
});

test("applies a two-part turn across ticks without hitting the body", () => {
  const engine = new SnakeEngine({ cols: 10, rows: 10 });
  engine.step();
  engine.setDirection("up");
  engine.setDirection("left");
  engine.step();
  expect(engine.gameOver).toBe(false);
  expect(engine.snake[0]!.y).toBe(engine.snake[1]!.y - 1);
  engine.step();
  expect(engine.gameOver).toBe(false);
  expect(engine.snake[0]!.x).toBe(engine.snake[1]!.x - 1);
});

test("clamps the board to a playable size", () => {
  const engine = new SnakeEngine({ cols: 1, rows: 1 });
  expect(engine.cols).toBe(4);
  expect(engine.rows).toBe(4);
  expect(engine.gameOver).toBe(false);
});

test("turns the snake", () => {
  const engine = new SnakeEngine({ cols: 10, rows: 10 });
  engine.setDirection("up");
  engine.step();
  expect(engine.snake[0]!.y).toBe(engine.snake[1]!.y - 1);
});

test("ends the game on wall collision", () => {
  const engine = new SnakeEngine({ cols: 10, rows: 10 });
  for (let i = 0; i < 10 && !engine.gameOver; i++) engine.step();
  expect(engine.gameOver).toBe(true);
});

test("eating food grows the snake and scores", () => {
  const engine = new SnakeEngine({ cols: 10, rows: 10 });
  engine.food = { x: engine.snake[0]!.x + 1, y: engine.snake[0]!.y };
  engine.step();
  expect(engine.score).toBe(1);
  expect(engine.snake).toHaveLength(4);
});

test("food never spawns on the snake", () => {
  const engine = new SnakeEngine({ cols: 4, rows: 4, random: () => 0 });
  engine.snake = [
    { x: 0, y: 1 },
    { x: 0, y: 0 },
    { x: 1, y: 0 },
    { x: 2, y: 0 },
    { x: 3, y: 0 },
    { x: 3, y: 1 },
    { x: 2, y: 1 },
  ];
  engine.food = { x: 1, y: 1 };
  engine.step();
  expect(engine.score).toBe(1);
  expect(engine.snake.some((cell) => cell.x === engine.food.x && cell.y === engine.food.y)).toBe(
    false,
  );
  expect(engine.food).toEqual({ x: 0, y: 2 });
});

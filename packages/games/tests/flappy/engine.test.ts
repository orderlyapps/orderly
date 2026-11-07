import { expect, test } from "vite-plus/test";
import { FlappyEngine } from "../../src/index.ts";

test("does nothing until the first flap", () => {
  const engine = new FlappyEngine({ random: () => 0.5 });
  const y = engine.birdY;
  engine.step();
  engine.step();
  expect(engine.started).toBe(false);
  expect(engine.birdY).toBe(y);
  expect(engine.pipes).toHaveLength(0);
});

test("flapping lifts the bird and starts the run", () => {
  const engine = new FlappyEngine({ random: () => 0.5 });
  const y = engine.birdY;
  engine.flap();
  engine.step();
  expect(engine.started).toBe(true);
  expect(engine.birdY).toBeLessThan(y);
});

test("gravity pulls the bird back down", () => {
  const engine = new FlappyEngine({ random: () => 0.5 });
  engine.flap();
  let apex = engine.birdY;
  for (let i = 0; i < 30 && !engine.gameOver; i++) {
    engine.step();
    apex = Math.min(apex, engine.birdY);
  }
  expect(engine.birdY).toBeGreaterThan(apex);
});

test("pipes scroll left while running", () => {
  const engine = new FlappyEngine({ random: () => 0.5 });
  engine.flap();
  engine.step();
  const pipe = engine.pipes[0]!;
  const x = pipe.x;
  engine.step();
  expect(pipe.x).toBeCloseTo(x - engine.pipeSpeed);
});

test("gap placement respects the margins", () => {
  const low = new FlappyEngine({ random: () => 0 });
  low.flap();
  low.step();
  expect(low.pipes[0]!.gapY).toBe(low.gapMargin);

  const high = new FlappyEngine({ random: () => 1 });
  high.flap();
  high.step();
  expect(high.pipes[0]!.gapY).toBe(high.floorY - high.pipeGap - high.gapMargin);
});

test("hitting the ground ends the game", () => {
  const engine = new FlappyEngine({ random: () => 0.5 });
  engine.flap();
  for (let i = 0; i < 500 && !engine.gameOver; i++) engine.step();
  expect(engine.gameOver).toBe(true);
  expect(engine.birdY + engine.birdRadius).toBeCloseTo(engine.floorY);
});

test("the ceiling clamps the bird instead of ending the game", () => {
  const engine = new FlappyEngine({ flapVelocity: 50, random: () => 0.5 });
  engine.flap();
  engine.step();
  expect(engine.gameOver).toBe(false);
  expect(engine.birdY).toBe(engine.birdRadius);
  expect(engine.birdVelocity).toBe(0);
});

test("hitting a pipe ends the game", () => {
  const engine = new FlappyEngine({ random: () => 0.5 });
  engine.flap();
  engine.pipes = [{ x: engine.birdX, gapY: 0, passed: false }];
  engine.step();
  expect(engine.gameOver).toBe(true);
});

test("passing a pipe scores", () => {
  const engine = new FlappyEngine({ pipeGap: 60, random: () => 0.5 });
  engine.flap();
  engine.pipes = [{ x: engine.birdX + engine.birdRadius + 0.5, gapY: 10, passed: false }];
  for (let i = 0; i < 200 && engine.score === 0 && !engine.gameOver; i++) {
    if (engine.birdY > 50) engine.flap();
    engine.step();
  }
  expect(engine.score).toBe(1);
  expect(engine.gameOver).toBe(false);
});

test("reset restores the initial state", () => {
  const engine = new FlappyEngine({ random: () => 0.5 });
  engine.flap();
  for (let i = 0; i < 500 && !engine.gameOver; i++) engine.step();
  expect(engine.gameOver).toBe(true);
  engine.reset();
  expect(engine.gameOver).toBe(false);
  expect(engine.started).toBe(false);
  expect(engine.score).toBe(0);
  expect(engine.pipes).toHaveLength(0);
  expect(engine.birdY).toBe(engine.floorY * 0.5);
});

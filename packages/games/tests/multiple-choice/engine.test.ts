import { expect, test } from "vite-plus/test";
import { MultipleChoiceEngine, type MultipleChoiceQuestion } from "../../src/index.ts";

function question(
  id: string,
  overrides: Partial<MultipleChoiceQuestion> = {},
): MultipleChoiceQuestion {
  return {
    id,
    prompt: `Question ${id}?`,
    answers: [
      { text: "wrong", correct: false },
      { text: "right", correct: true },
      { text: "also wrong", correct: false },
    ],
    references: [],
    tags: [],
    difficulty: 3,
    ...overrides,
  };
}

test("serves every question exactly once", () => {
  const engine = new MultipleChoiceEngine({
    questions: [question("a"), question("b"), question("c")],
    random: () => 0,
  });
  const seen: string[] = [];
  while (engine.current) {
    seen.push(engine.current.question.id);
    engine.answer(0);
    engine.advance();
  }
  expect(seen).toHaveLength(3);
  expect(new Set(seen).size).toBe(3);
  expect(engine.done).toBe(true);
});

test("answer scores correct picks only", () => {
  const engine = new MultipleChoiceEngine({
    questions: [question("a"), question("b")],
    random: () => 0,
  });
  const wrongIndex = engine.current!.answers.findIndex((answer) => !answer.correct);
  expect(engine.answer(wrongIndex)).toBe(false);
  expect(engine.score).toBe(0);
  engine.advance();
  const rightIndex = engine.current!.answers.findIndex((answer) => answer.correct);
  expect(engine.answer(rightIndex)).toBe(true);
  expect(engine.score).toBe(1);
});

test("answer is locked after the first pick", () => {
  const engine = new MultipleChoiceEngine({ questions: [question("a")], random: () => 0 });
  const wrongIndex = engine.current!.answers.findIndex((answer) => !answer.correct);
  engine.answer(wrongIndex);
  const rightIndex = engine.current!.answers.findIndex((answer) => answer.correct);
  expect(engine.answer(rightIndex)).toBeNull();
  expect(engine.score).toBe(0);
});

test("answer rejects out-of-range choices", () => {
  const engine = new MultipleChoiceEngine({ questions: [question("a")], random: () => 0 });
  expect(engine.answer(99)).toBeNull();
  expect(engine.answered).toBe(false);
});

test("shuffles answers within a round", () => {
  const engine = new MultipleChoiceEngine({
    questions: [question("a")],
    random: () => 0,
  });
  const answers = engine.current!.answers;
  expect(answers).toHaveLength(3);
  expect(answers.map((answer) => answer.text)).toEqual(["right", "also wrong", "wrong"]);
  expect(answers.filter((answer) => answer.correct)).toHaveLength(1);
});

test("tags filter the question pool", () => {
  const engine = new MultipleChoiceEngine({
    questions: [
      question("a", { tags: ["math"] }),
      question("b", { tags: ["science"] }),
      question("c", { tags: ["Math", "science"] }),
      question("d"),
    ],
    tags: ["math"],
    random: () => 0,
  });
  const ids: string[] = [];
  while (engine.current) {
    ids.push(engine.current.question.id);
    engine.advance();
  }
  expect(new Set(ids)).toEqual(new Set(["a", "c"]));
});

test("attempts record per-question results", () => {
  const engine = new MultipleChoiceEngine({
    questions: [question("a"), question("b")],
    random: () => 0,
  });
  const firstId = engine.current!.question.id;
  engine.answer(engine.current!.answers.findIndex((answer) => answer.correct));
  engine.advance();
  const secondId = engine.current!.question.id;
  engine.answer(engine.current!.answers.findIndex((answer) => !answer.correct));
  expect(engine.attempts).toEqual([
    { question: expect.objectContaining({ id: firstId }), correct: true },
    { question: expect.objectContaining({ id: secondId }), correct: false },
  ]);
});

test("reset reshuffles and clears progress", () => {
  const engine = new MultipleChoiceEngine({
    questions: [question("a"), question("b")],
    random: () => 0,
  });
  engine.answer(0);
  engine.advance();
  engine.reset();
  expect(engine.score).toBe(0);
  expect(engine.position).toBe(0);
  expect(engine.attempts).toHaveLength(0);
  expect(engine.total).toBe(2);
});

test("an empty pool has no current round", () => {
  const engine = new MultipleChoiceEngine();
  expect(engine.current).toBeNull();
  expect(engine.exhausted).toBe(true);
  expect(engine.answer(0)).toBeNull();
});

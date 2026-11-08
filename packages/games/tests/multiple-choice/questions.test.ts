import { expect, test } from "vite-plus/test";
import {
  createMultipleChoiceQuestion,
  isMultipleChoiceQuestion,
  normalizeMultipleChoiceDifficulty,
  normalizeMultipleChoiceQuestion,
  normalizeMultipleChoiceTags,
  type MultipleChoiceQuestionInput,
} from "../../src/index.ts";

function validInput(overrides: Partial<MultipleChoiceQuestionInput> = {}) {
  return {
    prompt: "What is 2 + 2?",
    answers: [
      { text: "3", correct: false },
      { text: "4", correct: true },
    ],
    references: [],
    tags: [],
    difficulty: 3,
    ...overrides,
  };
}

test("createMultipleChoiceQuestion returns a normalized question with an id", () => {
  const question = createMultipleChoiceQuestion(
    validInput({
      prompt: "  What is  2 + 2? ",
      answers: [
        { text: " 3 ", correct: false },
        { text: "4", correct: true },
        { text: "4", correct: false },
        { text: "", correct: false },
      ],
      references: [" https://example.com ", "https://example.com", ""],
      tags: [" Math ", "math", "Basics", ""],
      difficulty: 9,
    }),
  );
  expect(question.id).toBeTruthy();
  expect(question.prompt).toBe("What is 2 + 2?");
  expect(question.answers).toEqual([
    { text: "3", correct: false },
    { text: "4", correct: true },
  ]);
  expect(question.references).toEqual(["https://example.com"]);
  expect(question.tags).toEqual(["Math", "Basics"]);
  expect(question.difficulty).toBe(5);
});

test("createMultipleChoiceQuestion keeps the provided id", () => {
  const question = createMultipleChoiceQuestion(validInput(), "fixed-id");
  expect(question.id).toBe("fixed-id");
});

test("createMultipleChoiceQuestion rejects an empty prompt", () => {
  expect(() => createMultipleChoiceQuestion(validInput({ prompt: "  " }))).toThrow(
    "Question needs a prompt",
  );
});

test("createMultipleChoiceQuestion requires at least two answers", () => {
  expect(() =>
    createMultipleChoiceQuestion(validInput({ answers: [{ text: "4", correct: true }] })),
  ).toThrow("Question needs at least two answers");
});

test("createMultipleChoiceQuestion requires exactly one correct answer", () => {
  expect(() =>
    createMultipleChoiceQuestion(
      validInput({
        answers: [
          { text: "3", correct: false },
          { text: "4", correct: false },
        ],
      }),
    ),
  ).toThrow("Question needs exactly one correct answer");
  expect(() =>
    createMultipleChoiceQuestion(
      validInput({
        answers: [
          { text: "3", correct: true },
          { text: "4", correct: true },
        ],
      }),
    ),
  ).toThrow("Question needs exactly one correct answer");
});

test("normalizeMultipleChoiceTags trims and dedupes case-insensitively", () => {
  expect(normalizeMultipleChoiceTags([" Science ", "science", "Math", ""])).toEqual([
    "Science",
    "Math",
  ]);
});

test("normalizeMultipleChoiceDifficulty clamps to the 1-5 range", () => {
  expect(normalizeMultipleChoiceDifficulty(0)).toBe(1);
  expect(normalizeMultipleChoiceDifficulty(3.6)).toBe(4);
  expect(normalizeMultipleChoiceDifficulty(10)).toBe(5);
  expect(normalizeMultipleChoiceDifficulty(Number.NaN)).toBe(3);
});

test("normalizeMultipleChoiceQuestion keeps a default difficulty for invalid input", () => {
  const normalized = normalizeMultipleChoiceQuestion(
    validInput({ difficulty: Number.POSITIVE_INFINITY }),
  );
  expect(normalized.difficulty).toBe(3);
});

test("isMultipleChoiceQuestion validates stored entries", () => {
  const question = createMultipleChoiceQuestion(validInput());
  expect(isMultipleChoiceQuestion(question)).toBe(true);
  expect(isMultipleChoiceQuestion({ ...question, id: 42 })).toBe(false);
  expect(isMultipleChoiceQuestion({ ...question, tags: "math" })).toBe(false);
  expect(isMultipleChoiceQuestion({ ...question, answers: [{ text: "4" }] })).toBe(false);
  expect(isMultipleChoiceQuestion(null)).toBe(false);
});

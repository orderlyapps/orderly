import { expect, test } from "vite-plus/test";
import {
  MultipleChoiceStore,
  type MultipleChoiceQuestionInput,
  type MultipleChoiceStorage,
} from "../../src/index.ts";

function createStorage(): MultipleChoiceStorage {
  const map = new Map<string, string>();
  return {
    getItem: (key) => map.get(key) ?? null,
    setItem: (key, value) => {
      map.set(key, value);
    },
    removeItem: (key) => {
      map.delete(key);
    },
  };
}

function createStore() {
  return new MultipleChoiceStore({ storage: createStorage() });
}

function input(overrides: Partial<MultipleChoiceQuestionInput> = {}) {
  return {
    prompt: "What is 2 + 2?",
    answers: [
      { text: "3", correct: false },
      { text: "4", correct: true },
    ],
    references: ["https://example.com/math"],
    tags: ["math"],
    difficulty: 2,
    ...overrides,
  };
}

test("saves and lists questions with generated ids", () => {
  const store = createStore();
  store.saveQuestion(input({ prompt: "First?" }));
  store.saveQuestion(input({ prompt: "Second?", tags: ["science"], difficulty: 4 }));
  const questions = store.listQuestions();
  expect(questions).toHaveLength(2);
  expect(questions[0]!.prompt).toBe("First?");
  expect(questions[1]!.prompt).toBe("Second?");
  expect(questions[0]!.id).not.toBe(questions[1]!.id);
  expect(questions[0]!.references).toEqual(["https://example.com/math"]);
});

test("updateQuestion replaces a question in place", () => {
  const store = createStore();
  store.saveQuestion(input({ prompt: "First?" }));
  store.saveQuestion(input({ prompt: "Second?" }));
  const id = store.listQuestions()[0]!.id;
  store.updateQuestion(id, input({ prompt: "Updated?", difficulty: 5 }));
  const questions = store.listQuestions();
  expect(questions[0]).toMatchObject({ id, prompt: "Updated?", difficulty: 5 });
  expect(questions[1]!.prompt).toBe("Second?");
});

test("updateQuestion adds the question when the id is missing", () => {
  const store = createStore();
  store.updateQuestion("ghost", input({ prompt: "New?" }));
  expect(store.listQuestions()).toMatchObject([{ id: "ghost", prompt: "New?" }]);
});

test("updateQuestion throws on invalid input without writing", () => {
  const store = createStore();
  store.saveQuestion(input({ prompt: "First?" }));
  const id = store.listQuestions()[0]!.id;
  expect(() => store.updateQuestion(id, input({ prompt: "" }))).toThrow("Question needs a prompt");
  expect(store.listQuestions()[0]!.prompt).toBe("First?");
});

test("removeQuestion deletes by id", () => {
  const store = createStore();
  store.saveQuestion(input({ prompt: "First?" }));
  store.saveQuestion(input({ prompt: "Second?" }));
  const id = store.listQuestions()[0]!.id;
  store.removeQuestion(id);
  expect(store.listQuestions()).toHaveLength(1);
  expect(store.listQuestions()[0]!.prompt).toBe("Second?");
});

test("listTags returns sorted unique tags across questions", () => {
  const store = createStore();
  store.saveQuestion(input({ tags: ["Math", "basics"] }));
  store.saveQuestion(input({ tags: ["science", "Math"] }));
  expect(store.listTags()).toEqual(["basics", "Math", "science"]);
});

test("corrupted storage reads as an empty list", () => {
  const storage = createStorage();
  storage.setItem("multiple-choice:questions", "{oops");
  const store = new MultipleChoiceStore({ storage });
  expect(store.listQuestions()).toEqual([]);
  expect(store.listTags()).toEqual([]);
});

test("clear removes stored questions", () => {
  const store = createStore();
  store.saveQuestion(input());
  store.clear();
  expect(store.listQuestions()).toEqual([]);
});

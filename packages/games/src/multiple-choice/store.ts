import {
  createMultipleChoiceQuestion,
  isMultipleChoiceQuestion,
  normalizeMultipleChoiceQuestion,
  type MultipleChoiceQuestion,
  type MultipleChoiceQuestionInput,
} from "./questions.ts";

export interface MultipleChoiceStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

export interface MultipleChoiceStoreOptions {
  storageKey?: string;
  storage?: MultipleChoiceStorage;
}

export const MULTIPLE_CHOICE_STORAGE_KEY = "multiple-choice:questions";

function createMemoryStorage(): MultipleChoiceStorage {
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

const fallbackMemoryStorage = createMemoryStorage();

function getDefaultStorage(): MultipleChoiceStorage {
  try {
    if (typeof localStorage !== "undefined") return localStorage;
  } catch {
    // Fall back to in-memory storage when localStorage is unavailable or restricted
  }
  return fallbackMemoryStorage;
}

export class MultipleChoiceStore {
  private readonly storage: MultipleChoiceStorage;
  private readonly storageKey: string;

  constructor(options: MultipleChoiceStoreOptions = {}) {
    this.storageKey = options.storageKey ?? MULTIPLE_CHOICE_STORAGE_KEY;
    this.storage = options.storage ?? getDefaultStorage();
  }

  listQuestions(): MultipleChoiceQuestion[] {
    let raw: string | null = null;
    try {
      raw = this.storage.getItem(this.storageKey);
      if (!raw) return [];
      const parsed: unknown = JSON.parse(raw);
      if (!Array.isArray(parsed)) return [];
      const questions: MultipleChoiceQuestion[] = [];
      for (const entry of parsed) {
        if (!isMultipleChoiceQuestion(entry)) continue;
        const normalized = normalizeMultipleChoiceQuestion(entry);
        if (normalized.prompt && normalized.answers.length > 0) {
          questions.push({ id: entry.id, ...normalized });
        }
      }
      return questions;
    } catch {
      return [];
    }
  }

  /** Returns every tag used by stored questions, sorted alphabetically. */
  listTags(): string[] {
    const seen = new Map<string, string>();
    for (const question of this.listQuestions()) {
      for (const tag of question.tags) {
        const key = tag.toLowerCase();
        if (!seen.has(key)) seen.set(key, tag);
      }
    }
    return [...seen.values()].sort((a, b) => a.localeCompare(b));
  }

  /** Adds a question with a freshly generated id. */
  saveQuestion(input: MultipleChoiceQuestionInput): MultipleChoiceQuestion[] {
    const question = createMultipleChoiceQuestion(input);
    const questions = this.listQuestions();
    questions.push(question);
    this.write(questions);
    return questions;
  }

  /** Replaces the question identified by id, keeping its position in the list. */
  updateQuestion(id: string, input: MultipleChoiceQuestionInput): MultipleChoiceQuestion[] {
    const question = createMultipleChoiceQuestion(input, id);
    const questions = this.listQuestions();
    const index = questions.findIndex((entry) => entry.id === id);
    if (index === -1) {
      questions.push(question);
    } else {
      questions[index] = question;
    }
    this.write(questions);
    return questions;
  }

  removeQuestion(id: string): MultipleChoiceQuestion[] {
    const questions = this.listQuestions().filter((question) => question.id !== id);
    this.write(questions);
    return questions;
  }

  clear(): void {
    this.storage.removeItem(this.storageKey);
  }

  private write(questions: MultipleChoiceQuestion[]): void {
    this.storage.setItem(this.storageKey, JSON.stringify(questions));
  }
}

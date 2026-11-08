export interface MultipleChoiceAnswer {
  /** Answer text shown to the player. */
  text: string;
  /** Exactly one answer per question must be correct. */
  correct: boolean;
}

export const MULTIPLE_CHOICE_MIN_DIFFICULTY = 1;
export const MULTIPLE_CHOICE_MAX_DIFFICULTY = 5;
export const MULTIPLE_CHOICE_DEFAULT_DIFFICULTY = 3;

export interface MultipleChoiceQuestionInput {
  /** The question prompt. */
  prompt: string;
  /** Candidate answers; exactly one must be marked correct. */
  answers: MultipleChoiceAnswer[];
  /** Reference links backing up the answer. */
  references: string[];
  /** Tags grouping this question. */
  tags: string[];
  /** Difficulty rating from 1 (easiest) to 5 (hardest). */
  difficulty: number;
}

export interface MultipleChoiceQuestion extends MultipleChoiceQuestionInput {
  /** Stable identifier generated when the question is created. */
  id: string;
}

function normalizeText(value: string): string {
  return value.trim().replace(/\s+/g, " ");
}

/** Trims, dedupes (case-insensitive) and drops empty tags. */
export function normalizeMultipleChoiceTags(tags: string[]): string[] {
  const seen = new Set<string>();
  const normalized: string[] = [];
  for (const raw of tags) {
    const tag = normalizeText(raw);
    const key = tag.toLowerCase();
    if (!tag || seen.has(key)) continue;
    seen.add(key);
    normalized.push(tag);
  }
  return normalized;
}

/** Clamps a difficulty rating to the 1-5 range, defaulting when not a number. */
export function normalizeMultipleChoiceDifficulty(difficulty: number): number {
  if (!Number.isFinite(difficulty)) return MULTIPLE_CHOICE_DEFAULT_DIFFICULTY;
  return Math.min(
    MULTIPLE_CHOICE_MAX_DIFFICULTY,
    Math.max(MULTIPLE_CHOICE_MIN_DIFFICULTY, Math.round(difficulty)),
  );
}

function normalizeReferences(references: string[]): string[] {
  const seen = new Set<string>();
  const normalized: string[] = [];
  for (const raw of references) {
    const reference = normalizeText(raw);
    if (!reference || seen.has(reference)) continue;
    seen.add(reference);
    normalized.push(reference);
  }
  return normalized;
}

/** Trims, dedupes (case-insensitive) and drops empty answers and references. */
export function normalizeMultipleChoiceQuestion(
  input: MultipleChoiceQuestionInput,
): MultipleChoiceQuestionInput {
  const answers: MultipleChoiceAnswer[] = [];
  const seenAnswers = new Set<string>();
  for (const raw of input.answers) {
    const text = normalizeText(raw.text);
    const key = text.toLowerCase();
    if (!text || seenAnswers.has(key)) continue;
    seenAnswers.add(key);
    answers.push({ text, correct: raw.correct === true });
  }
  return {
    prompt: normalizeText(input.prompt),
    answers,
    references: normalizeReferences(input.references),
    tags: normalizeMultipleChoiceTags(input.tags),
    difficulty: normalizeMultipleChoiceDifficulty(input.difficulty),
  };
}

export function createMultipleChoiceQuestionId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `q-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

/** Validates input and returns a normalized question. Throws when unusable. */
export function createMultipleChoiceQuestion(
  input: MultipleChoiceQuestionInput,
  id: string = createMultipleChoiceQuestionId(),
): MultipleChoiceQuestion {
  const question = normalizeMultipleChoiceQuestion(input);
  if (!question.prompt) throw new Error("Question needs a prompt");
  if (question.answers.length < 2) {
    throw new Error("Question needs at least two answers");
  }
  const correctCount = question.answers.filter((answer) => answer.correct).length;
  if (correctCount !== 1) {
    throw new Error("Question needs exactly one correct answer");
  }
  return { id, ...question };
}

export function isMultipleChoiceQuestion(value: unknown): value is MultipleChoiceQuestion {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return false;
  const record = value as Record<string, unknown>;
  return (
    typeof record.id === "string" &&
    typeof record.prompt === "string" &&
    Array.isArray(record.answers) &&
    record.answers.every(
      (answer) =>
        typeof answer === "object" &&
        answer !== null &&
        typeof (answer as Record<string, unknown>).text === "string" &&
        typeof (answer as Record<string, unknown>).correct === "boolean",
    ) &&
    Array.isArray(record.references) &&
    record.references.every((entry) => typeof entry === "string") &&
    Array.isArray(record.tags) &&
    record.tags.every((entry) => typeof entry === "string") &&
    typeof record.difficulty === "number"
  );
}

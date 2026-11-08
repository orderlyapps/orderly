import type { MultipleChoiceAnswer, MultipleChoiceQuestion } from "./questions.ts";

export interface MultipleChoiceEngineOptions {
  questions?: MultipleChoiceQuestion[];
  /** When non-empty, only questions carrying at least one of these tags are used. */
  tags?: string[];
  random?: () => number;
}

export interface MultipleChoiceRound {
  question: MultipleChoiceQuestion;
  /** Answers in shuffled display order. */
  answers: MultipleChoiceAnswer[];
}

export interface MultipleChoiceAttempt {
  question: MultipleChoiceQuestion;
  correct: boolean;
}

export class MultipleChoiceEngine {
  score = 0;
  readonly attempts: MultipleChoiceAttempt[] = [];
  private questions: MultipleChoiceQuestion[];
  private rounds: MultipleChoiceRound[] = [];
  private index = 0;
  private answeredCurrent = false;
  private readonly tags: string[];
  private readonly random: () => number;

  constructor(options: MultipleChoiceEngineOptions = {}) {
    this.questions = [...(options.questions ?? [])];
    this.tags = (options.tags ?? []).map((tag) => tag.toLowerCase());
    this.random = options.random ?? Math.random;
    this.reset();
  }

  get total(): number {
    return this.rounds.length;
  }

  /** Index of the current round within the quiz. */
  get position(): number {
    return Math.min(this.index, this.rounds.length);
  }

  get done(): boolean {
    return this.index >= this.rounds.length;
  }

  get current(): MultipleChoiceRound | null {
    return this.rounds[this.index] ?? null;
  }

  /** Whether the current round has been answered. */
  get answered(): boolean {
    return this.answeredCurrent;
  }

  get exhausted(): boolean {
    return this.rounds.length === 0;
  }

  setQuestions(questions: MultipleChoiceQuestion[]): void {
    this.questions = [...questions];
    this.reset();
  }

  reset(): void {
    const tagSet = new Set(this.tags);
    const pool =
      tagSet.size === 0
        ? this.questions
        : this.questions.filter((question) =>
            question.tags.some((tag) => tagSet.has(tag.toLowerCase())),
          );
    this.rounds = this.shuffled(pool).map((question) => ({
      question,
      answers: this.shuffled(question.answers),
    }));
    this.index = 0;
    this.score = 0;
    this.answeredCurrent = false;
    this.attempts.length = 0;
  }

  /**
   * Locks in an answer for the current round. Returns whether it was correct,
   * or null when there is nothing to answer or the round was already answered.
   */
  answer(choice: number): boolean | null {
    const round = this.current;
    if (!round || this.answeredCurrent) return null;
    const picked = round.answers[choice];
    if (!picked) return null;
    this.answeredCurrent = true;
    const correct = picked.correct;
    if (correct) this.score += 1;
    this.attempts.push({ question: round.question, correct });
    return correct;
  }

  /** Moves to the next round. Returns the new current round, or null when finished. */
  advance(): MultipleChoiceRound | null {
    if (!this.current) return null;
    this.index += 1;
    this.answeredCurrent = false;
    return this.current;
  }

  private shuffled<T>(items: T[]): T[] {
    const shuffled = [...items];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.min(i, Math.floor(this.random() * (i + 1)));
      [shuffled[i], shuffled[j]] = [shuffled[j]!, shuffled[i]!];
    }
    return shuffled;
  }
}

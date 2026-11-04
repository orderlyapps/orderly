const WEEK_ID_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const DAY_MS = 86_400_000;

export function isWeekId(value: unknown): value is string {
  return typeof value === "string" && WEEK_ID_PATTERN.test(value);
}

/** Parses a "YYYY-MM-DD" week id as a local date. Returns null for invalid input. */
export function parseWeekId(weekId: string): Date | null {
  if (!isWeekId(weekId)) {
    return null;
  }
  const [year, month, day] = weekId.split("-").map(Number);
  const date = new Date(year, month - 1, day);
  const matchesInput =
    date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day;
  return matchesInput ? date : null;
}

/** Formats a local date as a "YYYY-MM-DD" week id. */
export function formatWeekId(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/** Monday of the week containing the given date. */
export function mondayOf(date: Date): Date {
  const day = date.getDay();
  const offset = day === 0 ? -6 : 1 - day;
  return new Date(date.getFullYear(), date.getMonth(), date.getDate() + offset);
}

/** Week id ("YYYY-MM-DD", always a Monday) of the week containing the given date. */
export function weekIdOf(date: Date): string {
  return formatWeekId(mondayOf(date));
}

export function currentWeekId(now: Date = new Date()): string {
  return weekIdOf(now);
}

/** Returns the week id `weeks` weeks away from `weekId` (negative for the past). */
export function shiftWeekId(weekId: string, weeks: number): string {
  const date = parseWeekId(weekId) ?? new Date();
  return formatWeekId(new Date(date.getFullYear(), date.getMonth(), date.getDate() + weeks * 7));
}

/** Difference in whole weeks between two week ids. */
export function weeksBetween(fromWeekId: string, toWeekId: string): number {
  const from = parseWeekId(fromWeekId);
  const to = parseWeekId(toWeekId);
  if (!from || !to) {
    return 0;
  }
  return Math.round((to.getTime() - from.getTime()) / (7 * DAY_MS));
}

function monthName(date: Date, style: "long" | "short"): string {
  return date.toLocaleDateString(undefined, { month: style });
}

/**
 * Human readable week range, e.g. "November 3–9, 2025" or "Sep 29 – Oct 5, 2025"
 * when the week crosses a month boundary.
 */
export function weekRangeLabel(weekId: string): string {
  const start = parseWeekId(weekId);
  if (!start) {
    return weekId;
  }
  const end = new Date(start.getFullYear(), start.getMonth(), start.getDate() + 6);
  const sameMonth = start.getMonth() === end.getMonth();
  const startLabel = `${monthName(start, sameMonth ? "long" : "short")} ${start.getDate()}`;
  const endLabel = sameMonth
    ? `${end.getDate()}, ${end.getFullYear()}`
    : `${monthName(end, "short")} ${end.getDate()}, ${end.getFullYear()}`;
  return `${startLabel} – ${endLabel}`;
}

/** "This week" / "Next week" / "Last week", or undefined when further away. */
export function relativeWeekLabel(weekId: string, now: Date = new Date()): string | undefined {
  const offset = weeksBetween(currentWeekId(now), weekId);
  if (offset === 0) {
    return "This week";
  }
  if (offset === 1) {
    return "Next week";
  }
  if (offset === -1) {
    return "Last week";
  }
  return undefined;
}

function parseLocalDate(isoDate: string): Date | null {
  if (!isoDate) {
    return null;
  }
  const [year, month, day] = isoDate.split("T")[0].split("-").map(Number);
  if (!year || !month || !day) {
    return null;
  }
  return new Date(year, month - 1, day);
}

/**
 * Whether any day between `startDate` and `endDate` (inclusive, ISO date strings)
 * falls inside the Monday–Sunday week identified by `weekId`.
 */
export function dateRangeOverlapsWeek(
  weekId: string,
  startDate: string,
  endDate?: string | null,
): boolean {
  const weekStart = parseWeekId(weekId);
  const start = parseLocalDate(startDate);
  if (!weekStart || !start) {
    return false;
  }
  const weekEnd = new Date(weekStart.getFullYear(), weekStart.getMonth(), weekStart.getDate() + 6);
  const end = parseLocalDate(endDate ?? "") ?? start;
  return start.getTime() <= weekEnd.getTime() && end.getTime() >= weekStart.getTime();
}

const MONTH_ID_PATTERN = /^\d{4}-\d{2}$/;

export function isMonthId(value: unknown): value is string {
  return typeof value === "string" && MONTH_ID_PATTERN.test(value);
}

/** Parses a "YYYY-MM" month id as a local date (the first of the month). Returns null for invalid input. */
export function parseMonthId(monthId: string): Date | null {
  if (!isMonthId(monthId)) {
    return null;
  }
  const [year, month] = monthId.split("-").map(Number);
  const date = new Date(year, month - 1, 1);
  const matchesInput = date.getFullYear() === year && date.getMonth() === month - 1;
  return matchesInput ? date : null;
}

/** Formats a local date as a "YYYY-MM" month id. */
export function formatMonthId(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  return `${year}-${month}`;
}

/** Month id ("YYYY-MM") of the month containing the given date. */
export function monthIdOf(date: Date): string {
  return formatMonthId(date);
}

export function currentMonthId(now: Date = new Date()): string {
  return monthIdOf(now);
}

/** Month id of the month before the month containing the given date. */
export function previousMonthId(now: Date = new Date()): string {
  return shiftMonthId(currentMonthId(now), -1);
}

/** Returns the month id `months` months away from `monthId` (negative for the past). */
export function shiftMonthId(monthId: string, months: number): string {
  const date = parseMonthId(monthId) ?? new Date();
  return formatMonthId(new Date(date.getFullYear(), date.getMonth() + months, 1));
}

/** Difference in whole months between two month ids. */
export function monthsBetween(fromMonthId: string, toMonthId: string): number {
  const from = parseMonthId(fromMonthId);
  const to = parseMonthId(toMonthId);
  if (!from || !to) {
    return 0;
  }
  return (to.getFullYear() - from.getFullYear()) * 12 + (to.getMonth() - from.getMonth());
}

/** Human readable month, e.g. "November 2025". */
export function monthLabel(monthId: string): string {
  const date = parseMonthId(monthId);
  if (!date) {
    return monthId;
  }
  return date.toLocaleDateString(undefined, { month: "long", year: "numeric" });
}

/** "This month" / "Next month" / "Last month", or undefined when further away. */
export function relativeMonthLabel(monthId: string, now: Date = new Date()): string | undefined {
  const offset = monthsBetween(currentMonthId(now), monthId);
  if (offset === 0) {
    return "This month";
  }
  if (offset === 1) {
    return "Next month";
  }
  if (offset === -1) {
    return "Last month";
  }
  return undefined;
}

/** The `count` most recent completed month ids, newest first. */
export function previousMonthIds(count: number, now: Date = new Date()): string[] {
  const latest = previousMonthId(now);
  return Array.from({ length: count }, (_, index) => shiftMonthId(latest, -index));
}

import { currentWeekId, isWeekId, parseWeekId, shiftWeekId, weekIdOf } from "../../util/week.ts";
import type { CleaningAssignmentRow, GroupRow } from "./schema.ts";

export interface CleaningWeek {
  weekId: string;
  majorGroupName: string | null;
  minorGroupName: string | null;
}

export interface CleaningMonth {
  /** "YYYY-MM" key, stable for ordering. */
  key: string;
  /** "November" in the current year, "November 2027" otherwise. */
  label: string;
  weeks: CleaningWeek[];
}

function monthLabel(monthKey: string, currentYear: number): string {
  const date = parseWeekId(`${monthKey}-01`);
  if (!date) {
    return monthKey;
  }
  const month = date.toLocaleDateString(undefined, { month: "long" });
  return date.getFullYear() === currentYear ? month : `${month} ${date.getFullYear()}`;
}

function toGroupNames(rows: CleaningAssignmentRow[], groups: Map<string, string>) {
  const names = new Map<string, string>();
  for (const row of rows) {
    const name = groups.get(row.group_id);
    if (name) {
      names.set(row.week_id, name);
    }
  }
  return names;
}

/**
 * Builds the forward-looking cleaning schedule: every week from the current
 * week through the end of the year (extended at most through the end of next
 * year when assignments reach that far), bucketed by the month of each week's
 * Monday. Returns an empty list when nothing is scheduled at all.
 */
export function buildCleaningSchedule(
  major: CleaningAssignmentRow[],
  minor: CleaningAssignmentRow[],
  groups: GroupRow[],
  now: Date = new Date(),
): CleaningMonth[] {
  if (major.length === 0 && minor.length === 0) {
    return [];
  }

  const groupNames = new Map(groups.map((group) => [group.id, group.name]));
  const majorNames = toGroupNames(major, groupNames);
  const minorNames = toGroupNames(minor, groupNames);

  const firstWeekId = currentWeekId(now);
  const latestWeekId = [...major, ...minor]
    .map((row) => row.week_id)
    .filter((weekId) => isWeekId(weekId) && weekId >= firstWeekId)
    .sort()
    .pop();
  const latestYear = latestWeekId ? Number(latestWeekId.slice(0, 4)) : now.getFullYear();
  const endYear = Math.min(Math.max(latestYear, now.getFullYear()), now.getFullYear() + 1);
  const lastWeekId = weekIdOf(new Date(endYear, 11, 31));

  const months = new Map<string, CleaningMonth>();
  for (let weekId = firstWeekId; weekId <= lastWeekId; weekId = shiftWeekId(weekId, 1)) {
    const monthKey = weekId.slice(0, 7);
    let month = months.get(monthKey);
    if (!month) {
      month = { key: monthKey, label: monthLabel(monthKey, now.getFullYear()), weeks: [] };
      months.set(monthKey, month);
    }
    month.weeks.push({
      weekId,
      majorGroupName: majorNames.get(weekId) ?? null,
      minorGroupName: minorNames.get(weekId) ?? null,
    });
  }
  return [...months.values()];
}

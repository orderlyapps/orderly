import { expect, test } from "vite-plus/test";

import {
  buildCleaningSchedule,
  type CleaningAssignmentRow,
  type GroupRow,
} from "../src/feature/cleaning/index.ts";

const congregationId = "7b15d4e5-d4fa-4eb4-a276-3790b7c4897b";
const groupOne = "11111111-1111-4111-8111-111111111111";
const groupTwo = "22222222-2222-4222-8222-222222222222";

const groups: GroupRow[] = [
  { id: groupOne, congregation_id: congregationId, name: "Group 1" },
  { id: groupTwo, congregation_id: congregationId, name: "Group 2" },
];

function assignment(weekId: string, groupId: string): CleaningAssignmentRow {
  return { week_id: weekId, congregation_id: congregationId, group_id: groupId };
}

// Wednesday, November 5, 2025 → current week starts Monday, November 3.
const now = new Date(2025, 10, 5);

test("buildCleaningSchedule returns nothing when no assignments exist", () => {
  expect(buildCleaningSchedule([], [], groups, now)).toEqual([]);
});

test("buildCleaningSchedule lists weeks from the current week grouped by month", () => {
  const months = buildCleaningSchedule([assignment("2025-11-10", groupOne)], [], groups, now);
  expect(months.map((month) => month.label)).toEqual(["November", "December"]);
  expect(months[0].weeks.map((week) => week.weekId)).toEqual([
    "2025-11-03",
    "2025-11-10",
    "2025-11-17",
    "2025-11-24",
  ]);
  expect(months[1].weeks[0].weekId).toBe("2025-12-01");
  expect(months[1].weeks[months[1].weeks.length - 1].weekId).toBe("2025-12-29");
});

test("buildCleaningSchedule resolves group names for both clean types", () => {
  const months = buildCleaningSchedule(
    [assignment("2025-11-10", groupOne)],
    [assignment("2025-11-10", groupTwo), assignment("2025-11-17", groupTwo)],
    groups,
    now,
  );
  const week = months[0].weeks.find((entry) => entry.weekId === "2025-11-10");
  expect(week?.majorGroupName).toBe("Group 1");
  expect(week?.minorGroupName).toBe("Group 2");
  const unassigned = months[0].weeks.find((entry) => entry.weekId === "2025-11-03");
  expect(unassigned?.majorGroupName).toBeNull();
  expect(unassigned?.minorGroupName).toBeNull();
});

test("buildCleaningSchedule treats unknown group ids as unassigned", () => {
  const months = buildCleaningSchedule(
    [assignment("2025-11-10", "99999999-9999-4999-8999-999999999999")],
    [],
    groups,
    now,
  );
  const week = months[0].weeks.find((entry) => entry.weekId === "2025-11-10");
  expect(week?.majorGroupName).toBeNull();
});

test("buildCleaningSchedule extends into the next year when assignments reach it", () => {
  const months = buildCleaningSchedule([assignment("2026-01-05", groupOne)], [], groups, now);
  const labels = months.map((month) => month.label);
  expect(labels).toContain("December");
  expect(labels).toContain("January 2026");
  expect(labels).toContain("December 2026");
  const january = months.find((month) => month.label === "January 2026");
  const week = january?.weeks.find((entry) => entry.weekId === "2026-01-05");
  expect(week?.majorGroupName).toBe("Group 1");
});

test("buildCleaningSchedule skips malformed week ids", () => {
  const months = buildCleaningSchedule(
    [assignment("not-a-week", groupOne), assignment("2025-11-10", groupTwo)],
    [],
    groups,
    now,
  );
  expect(months.map((month) => month.label)).toEqual(["November", "December"]);
  const weekIds = months.flatMap((month) => month.weeks.map((week) => week.weekId));
  expect(weekIds).not.toContain("not-a-week");
});

test("buildCleaningSchedule caps the schedule horizon at the end of next year", () => {
  const months = buildCleaningSchedule([assignment("2100-06-05", groupOne)], [], groups, now);
  const last = months[months.length - 1];
  expect(last.label).toBe("December 2026");
  expect(last.weeks[last.weeks.length - 1].weekId).toBe("2026-12-28");
});

test("buildCleaningSchedule ignores past weeks", () => {
  const months = buildCleaningSchedule(
    [assignment("2025-10-27", groupOne), assignment("2025-11-03", groupTwo)],
    [],
    groups,
    now,
  );
  const weekIds = months.flatMap((month) => month.weeks.map((week) => week.weekId));
  expect(weekIds).not.toContain("2025-10-27");
  const current = months[0].weeks.find((entry) => entry.weekId === "2025-11-03");
  expect(current?.majorGroupName).toBe("Group 2");
});

import { expect, test } from "vite-plus/test";

import {
  currentMonthId,
  formatMonthId,
  isMonthId,
  monthIdOf,
  monthLabel,
  monthsBetween,
  parseMonthId,
  previousMonthId,
  previousMonthIds,
  relativeMonthLabel,
  shiftMonthId,
} from "../src/util/month.ts";

test("month ids are zero-padded YYYY-MM strings", () => {
  expect(isMonthId("2025-11")).toBe(true);
  expect(isMonthId("2025-11-03")).toBe(false);
  expect(isMonthId("2025-1")).toBe(false);
  expect(isMonthId(202511)).toBe(false);
  expect(formatMonthId(new Date(2025, 0, 15))).toBe("2025-01");
  expect(monthIdOf(new Date(2025, 10, 30))).toBe("2025-11");
  expect(currentMonthId(new Date(2025, 10, 19))).toBe("2025-11");
});

test("shiftMonthId moves by whole months and monthsBetween counts the gap", () => {
  expect(shiftMonthId("2025-11", 1)).toBe("2025-12");
  expect(shiftMonthId("2025-01", -1)).toBe("2024-12");
  expect(shiftMonthId("2025-11", 0)).toBe("2025-11");
  expect(monthsBetween("2025-08", "2025-11")).toBe(3);
  expect(monthsBetween("2025-11", "2025-08")).toBe(-3);
  expect(monthsBetween("2024-11", "2025-11")).toBe(12);
});

test("parseMonthId returns the first of the month or null for invalid ids", () => {
  expect(parseMonthId("2025-11")).toEqual(new Date(2025, 10, 1));
  expect(parseMonthId("2025-13")).toBeNull();
  expect(parseMonthId("2025-00")).toBeNull();
  // Years 0-99 would silently map to 1900-1999 in `new Date()`.
  expect(parseMonthId("0050-01")).toBeNull();
  expect(parseMonthId("2025-11-03")).toBeNull();
  expect(parseMonthId("junk")).toBeNull();
});

test("month labels are human readable", () => {
  expect(monthLabel("2025-11")).toBe("November 2025");
  expect(monthLabel("junk")).toBe("junk");
  const now = new Date(2025, 10, 19);
  expect(relativeMonthLabel("2025-11", now)).toBe("This month");
  expect(relativeMonthLabel("2025-12", now)).toBe("Next month");
  expect(relativeMonthLabel("2025-10", now)).toBe("Last month");
  expect(relativeMonthLabel("2025-08", now)).toBeUndefined();
});

test("previousMonthId and previousMonthIds list completed months, newest first", () => {
  const now = new Date(2025, 10, 19);
  expect(previousMonthId(now)).toBe("2025-10");
  expect(previousMonthId(new Date(2025, 0, 15))).toBe("2024-12");
  expect(previousMonthIds(3, now)).toEqual(["2025-10", "2025-09", "2025-08"]);
  expect(previousMonthIds(0, now)).toEqual([]);
});

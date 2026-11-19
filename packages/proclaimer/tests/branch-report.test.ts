import { expect, test } from "vite-plus/test";

import {
  activePublisherIds,
  resolveActivePublishers,
  type Report,
} from "../src/feature/branch-report/index.ts";
import type { Publisher } from "../src/feature/publisher/index.ts";
import type { PublisherLocal } from "../src/feature/publisher-local/index.ts";
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

const congregationId = "7b15d4e5-d4fa-4eb4-a276-3790b7c4897b";

function report(publisherId: string, date: string, active: boolean): Report {
  return {
    confidential_id: publisherId,
    congregation_id: congregationId,
    date,
    active,
    hours: null,
    bible_studies: null,
  };
}

test("activePublisherIds counts a publisher once when active in any month of the window", () => {
  const a = "00000000-0000-0000-0000-00000000000a";
  const b = "00000000-0000-0000-0000-00000000000b";
  const c = "00000000-0000-0000-0000-00000000000c";

  const reports = [
    report(a, "2025-11-01", true),
    report(a, "2025-10-01", true), // duplicate months still count once
    report(b, "2025-06-01", true), // 5 months prior — earliest month in the window
    report(c, "2025-05-01", true), // 6 months prior — outside the window
  ];

  expect(activePublisherIds(reports, "2025-11").sort()).toEqual([a, b].sort());
});

test("activePublisherIds ignores inactive reports and reports after the month", () => {
  const a = "00000000-0000-0000-0000-00000000000a";
  const b = "00000000-0000-0000-0000-00000000000b";

  const reports = [
    report(a, "2025-10-01", false),
    report(b, "2025-12-01", true), // later than the selected month
  ];

  expect(activePublisherIds(reports, "2025-11")).toEqual([]);
});

test("activePublisherIds ignores malformed report dates", () => {
  const a = "00000000-0000-0000-0000-00000000000a";
  expect(activePublisherIds([report(a, "junk", true)], "2025-11")).toEqual([]);
  expect(activePublisherIds([report(a, "2025-11-01", true)], "2025-11")).toEqual([a]);
});

function publisher(id: string, lastName = "Publisher"): Publisher {
  return { id, first_name: "Test", last_name: lastName, congregation_id: congregationId };
}

function localRecord(publisherId: string, confidentialId: string): PublisherLocal {
  return {
    publisher_id: publisherId,
    confidential_id: confidentialId,
    version: { created_by: "", updated_by: "", created_at: 0, updated_at: 0 },
  };
}

test("resolveActivePublishers maps confidential ids through local records", () => {
  const pubA = publisher("pub-a", "Alpha");
  const pubB = publisher("pub-b", "Beta");
  const records = [localRecord("pub-a", "conf-a"), localRecord("pub-b", "conf-b")];

  const result = resolveActivePublishers(["conf-a", "conf-b"], [pubA, pubB], records);

  expect(result.publishers).toEqual([pubA, pubB]);
  expect(result.unresolvedCount).toBe(0);
});

test("resolveActivePublishers resolves self-report ids directly and dedupes", () => {
  const pubA = publisher("pub-a");
  const records = [localRecord("pub-a", "conf-a")];

  // "pub-a" is a self-report (confidential_id === publisher.id) and "conf-a" is
  // the same publisher's secretary-entered id — the publisher counts once.
  const result = resolveActivePublishers(["pub-a", "conf-a"], [pubA], records);

  expect(result.publishers).toEqual([pubA]);
  expect(result.unresolvedCount).toBe(0);
});

test("resolveActivePublishers counts ids with no matching publisher as unresolved", () => {
  const pubA = publisher("pub-a");
  const records = [
    localRecord("pub-a", "conf-a"),
    // Local record pointing at a publisher that no longer exists
    localRecord("pub-gone", "conf-gone"),
  ];

  const result = resolveActivePublishers(["conf-a", "conf-unknown", "conf-gone"], [pubA], records);

  expect(result.publishers).toEqual([pubA]);
  expect(result.unresolvedCount).toBe(2);
});

test("resolveActivePublishers drops archived publishers without counting them unresolved", () => {
  const pubA = publisher("pub-a", "Alpha");
  const archived = { ...publisher("pub-b", "Beta"), archived_at: "2025-09-01T00:00:00+00:00" };
  const records = [localRecord("pub-a", "conf-a"), localRecord("pub-b", "conf-b")];

  const result = resolveActivePublishers(["conf-a", "conf-b", "pub-b"], [pubA, archived], records);

  expect(result.publishers).toEqual([pubA]);
  expect(result.unresolvedCount).toBe(0);
});

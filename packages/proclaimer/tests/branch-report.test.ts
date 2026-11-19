import { expect, test } from "vite-plus/test";

import {
  activePublisherIds,
  monthReportStats,
  PUBLISHER_REPORT_WINDOW_MONTHS,
  publisherConfidentialIds,
  publisherReportMonthIds,
  publisherReportsByMonth,
  reportInsertConfidentialId,
  reportKey,
  resolveActivePublishers,
  weekendAttendanceAverage,
  weekendAttendanceWeeks,
  type Report,
} from "../src/feature/branch-report/index.ts";
import type { MeetingAttendance } from "../src/feature/meeting-attendance/index.ts";
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

function report(
  publisherId: string,
  date: string,
  active: boolean,
  overrides: Partial<Report> = {},
): Report {
  return {
    confidential_id: publisherId,
    congregation_id: congregationId,
    date,
    active,
    hours: null,
    bible_studies: null,
    aux_pio: false,
    reg_pio: false,
    spe_pio: false,
    reported_elsewhere: false,
    ...overrides,
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

test("activePublisherIds ignores reports submitted elsewhere or as a special pioneer", () => {
  const a = "00000000-0000-0000-0000-00000000000a";
  const b = "00000000-0000-0000-0000-00000000000b";
  const c = "00000000-0000-0000-0000-00000000000c";

  const reports = [
    report(a, "2025-11-01", true, { reported_elsewhere: true }),
    report(b, "2025-11-01", true),
    report(c, "2025-11-01", true, { spe_pio: true }),
  ];

  expect(activePublisherIds(reports, "2025-11")).toEqual([b]);
});

test("activePublisherIds ignores malformed report dates", () => {
  const a = "00000000-0000-0000-0000-00000000000a";
  expect(activePublisherIds([report(a, "junk", true)], "2025-11")).toEqual([]);
  expect(activePublisherIds([report(a, "2025-11-01", true)], "2025-11")).toEqual([a]);
});

function publisher(id: string, lastName = "Publisher", type = "publisher"): Publisher {
  return { id, first_name: "Test", last_name: lastName, congregation_id: congregationId, type };
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

function attendance(
  weekId: string,
  inPerson: number | null,
  remote: number | null,
): MeetingAttendance {
  return {
    week_id: weekId,
    congregation_id: congregationId,
    weekend_in_person_count: inPerson,
    weekend_remote_count: remote,
    midweek_in_person_count: null,
    midweek_remote_count: null,
  };
}

test("weekendAttendanceAverage averages weeks whose Monday starts in the month", () => {
  const rows = [
    attendance("2025-11-03", 80, 10), // 90
    attendance("2025-11-10", 95, null), // 95
    attendance("2025-11-24", 70, 15), // 85
    attendance("2025-10-27", 200, 0), // week ends in November but starts in October
    attendance("2025-12-01", 50, 50), // starts in the next month
  ];

  const result = weekendAttendanceAverage(rows, "2025-11");

  expect(result.weekCount).toBe(3);
  expect(result.average).toBe(90);
});

test("weekendAttendanceAverage skips weeks with no recorded count", () => {
  const rows = [attendance("2025-11-03", null, null), attendance("2025-11-10", 60, 20)];

  const result = weekendAttendanceAverage(rows, "2025-11");

  expect(result.weekCount).toBe(1);
  expect(result.average).toBe(80);
});

test("weekendAttendanceAverage returns a null average when no week has data", () => {
  const result = weekendAttendanceAverage([attendance("2025-10-27", 90, 5)], "2025-11");

  expect(result.weekCount).toBe(0);
  expect(result.average).toBeNull();
});

test("weekendAttendanceWeeks lists the counted weeks oldest first with totals", () => {
  const rows = [
    attendance("2025-11-24", 70, 15),
    attendance("2025-11-03", 80, null),
    attendance("2025-11-10", null, null),
    attendance("2025-10-27", 200, 0),
  ];

  expect(weekendAttendanceWeeks(rows, "2025-11")).toEqual([
    { weekId: "2025-11-03", inPerson: 80, remote: 0, attendance: 80 },
    { weekId: "2025-11-24", inPerson: 70, remote: 15, attendance: 85 },
  ]);
});

test("monthReportStats counts only type-publisher reporters in the selected month", () => {
  const pubA = publisher("pub-a", "Alpha");
  const pioneer = publisher("pub-b", "Beta", "regular_pioneer");
  const records = [
    localRecord("pub-a", "conf-a"),
    localRecord("pub-b", "conf-b"),
    localRecord("pub-c", "conf-c"),
  ];

  const reports = [
    report("conf-a", "2025-11-01", true),
    report("conf-b", "2025-11-01", true), // regular pioneer — excluded
    report("conf-c", "2025-11-01", false), // did not report activity — excluded
    report("conf-unknown", "2025-11-01", true), // resolvable to no publisher
    report("conf-a", "2025-10-01", true), // earlier month — excluded
  ];

  const result = monthReportStats(reports, [pubA, pioneer], records, "2025-11", "publisher");

  expect(result.reports.entries.map((entry) => entry.publisher.id)).toEqual(["pub-a"]);
  // conf-c resolves to a publisher but is inactive — it is not counted as unresolved.
  expect(result.reports.unresolvedCount).toBe(1);
});

test("monthReportStats excludes auxiliary pioneer and reported-elsewhere reports", () => {
  const pubA = publisher("pub-a", "Alpha");
  const pubB = publisher("pub-b", "Beta");
  const pubC = publisher("pub-c", "Carol");
  const records = [
    localRecord("pub-a", "conf-a"),
    localRecord("pub-b", "conf-b"),
    localRecord("pub-c", "conf-c"),
  ];

  const reports = [
    report("conf-a", "2025-11-01", true),
    report("conf-b", "2025-11-01", true, { aux_pio: true }), // aux report — excluded
    report("conf-c", "2025-11-01", true, { reported_elsewhere: true }), // excluded
    report("conf-aux", "2025-11-01", true, { aux_pio: true }), // aux report — not unresolved
    report("conf-elsewhere", "2025-11-01", true, { reported_elsewhere: true }), // not unresolved
    report("conf-unknown", "2025-11-01", true), // unresolved
  ];

  const result = monthReportStats(reports, [pubA, pubB, pubC], records, "2025-11", "publisher");

  expect(result.reports.entries.map((entry) => entry.publisher.id)).toEqual(["pub-a"]);
  expect(result.reports.unresolvedCount).toBe(1);
});

test("monthReportStats excludes archived publishers without counting them unresolved", () => {
  const pubA = publisher("pub-a", "Alpha");
  const archived = { ...publisher("pub-b", "Beta"), archived_at: "2025-12-01T00:00:00+00:00" };
  const records = [localRecord("pub-a", "conf-a"), localRecord("pub-b", "conf-b")];

  const reports = [report("conf-a", "2025-11-01", true), report("conf-b", "2025-11-01", true)];

  const result = monthReportStats(reports, [pubA, archived], records, "2025-11", "publisher");

  expect(result.reports.entries.map((entry) => entry.publisher.id)).toEqual(["pub-a"]);
  expect(result.reports.unresolvedCount).toBe(0);
});

test("monthReportStats resolves self-reports and counts each publisher once", () => {
  const pubA = publisher("pub-a");
  const records = [localRecord("pub-a", "conf-a")];

  // Self-report (confidential_id === publisher.id) plus a secretary-entered
  // report for the same month — the publisher counts once.
  const reports = [report("pub-a", "2025-11-01", true), report("conf-a", "2025-11-01", true)];

  const result = monthReportStats(reports, [pubA], records, "2025-11", "publisher");

  expect(result.reports.entries.map((entry) => entry.publisher.id)).toEqual(["pub-a"]);
  expect(result.reports.unresolvedCount).toBe(0);
});

test("monthReportStats sums bible studies, excluding auxiliary pioneer reports", () => {
  const pubA = publisher("pub-a", "Alpha");
  const pubB = publisher("pub-b", "Beta");
  const pubC = publisher("pub-c", "Carol");
  const pioneer = publisher("pub-d", "Delta", "regular_pioneer");
  const records = [
    localRecord("pub-a", "conf-a"),
    localRecord("pub-b", "conf-b"),
    localRecord("pub-c", "conf-c"),
    localRecord("pub-d", "conf-d"),
  ];

  const reports = [
    report("conf-a", "2025-11-01", true, { bible_studies: 2 }),
    report("conf-b", "2025-11-01", true, { bible_studies: 3, aux_pio: true }), // aux report — excluded
    report("conf-c", "2025-11-01", true), // no studies — not listed
    report("conf-d", "2025-11-01", true, { bible_studies: 4 }), // pioneer — excluded
    report("conf-unknown", "2025-11-01", true, { bible_studies: 5 }), // unresolved
    report("conf-elsewhere", "2025-11-01", true, {
      bible_studies: 6,
      reported_elsewhere: true,
    }), // reported elsewhere — excluded entirely
    report("conf-a", "2025-10-01", true, { bible_studies: 7 }), // earlier month — excluded
  ];

  const result = monthReportStats(
    reports,
    [pubA, pubB, pubC, pioneer],
    records,
    "2025-11",
    "publisher",
  ).bibleStudies;

  expect(result.total).toBe(2);
  expect(result.entries.map((entry) => entry.publisher.id)).toEqual(["pub-a"]);
  expect(result.unresolvedCount).toBe(1);
});

test("monthReportStats counts zero and null bible studies as no studies", () => {
  const pubA = publisher("pub-a");
  const pubB = publisher("pub-b", "Beta");
  const records = [localRecord("pub-a", "conf-a"), localRecord("pub-b", "conf-b")];

  const reports = [
    report("conf-a", "2025-11-01", true, { bible_studies: 0 }),
    report("conf-b", "2025-11-01", true, { bible_studies: null }),
  ];

  const result = monthReportStats(
    reports,
    [pubA, pubB],
    records,
    "2025-11",
    "publisher",
  ).bibleStudies;

  expect(result.total).toBe(0);
  expect(result.entries).toEqual([]);
  expect(result.unresolvedCount).toBe(0);
});

test("monthReportStats routes aux_pio reports to the auxiliary pioneer category", () => {
  const pubA = publisher("pub-a", "Alpha");
  const pubB = publisher("pub-b", "Beta");
  const pioneer = publisher("pub-c", "Carol", "regular_pioneer");
  const records = [
    localRecord("pub-a", "conf-a"),
    localRecord("pub-b", "conf-b"),
    localRecord("pub-c", "conf-c"),
  ];

  const reports = [
    report("conf-a", "2025-11-01", true, { hours: 1, bible_studies: 2, aux_pio: true }),
    report("conf-b", "2025-11-01", true, { hours: 5, bible_studies: 1 }),
    // A regular pioneer's report is auxiliary when flagged aux_pio.
    report("conf-c", "2025-11-01", true, { hours: 10, aux_pio: true }),
    report("conf-aux", "2025-11-01", true, { hours: 3, bible_studies: 4, aux_pio: true }),
  ];

  const publishers = [pubA, pubB, pioneer];
  const aux = monthReportStats(reports, publishers, records, "2025-11", "auxiliary_pioneer");
  const regular = monthReportStats(reports, publishers, records, "2025-11", "publisher");

  expect(aux.reports.entries.map((entry) => entry.publisher.id)).toEqual(["pub-a", "pub-c"]);
  expect(aux.reports.unresolvedCount).toBe(1);
  expect(aux.hours.total).toBe(11);
  expect(aux.hours.unresolvedCount).toBe(1);
  expect(aux.bibleStudies.total).toBe(2);
  expect(aux.bibleStudies.unresolvedCount).toBe(1);

  expect(regular.reports.entries.map((entry) => entry.publisher.id)).toEqual(["pub-b"]);
  expect(regular.reports.unresolvedCount).toBe(0);
  expect(regular.hours.total).toBe(5);
  expect(regular.bibleStudies.total).toBe(1);
});

test("monthReportStats categorizes regular pioneer reports by type, not reg_pio", () => {
  const pubA = publisher("pub-a", "Alpha");
  const pioneer = publisher("pub-b", "Beta", "regular_pioneer");
  const flagged = publisher("pub-c", "Carol"); // reg_pio report — still a publisher
  const special = publisher("pub-d", "Delta", "special_pioneer");
  const records = [
    localRecord("pub-a", "conf-a"),
    localRecord("pub-b", "conf-b"),
    localRecord("pub-c", "conf-c"),
    localRecord("pub-d", "conf-d"),
  ];

  const reports = [
    report("conf-a", "2025-11-01", true, { hours: 2, bible_studies: 1 }),
    report("conf-b", "2025-11-01", true, { hours: 50, bible_studies: 3 }),
    report("conf-c", "2025-11-01", true, { hours: 40, reg_pio: true }),
    // A special pioneer's report never counts under regular pioneers, flag or not.
    report("conf-d", "2025-11-01", true, { hours: 60, reg_pio: true }),
    report("conf-reg", "2025-11-01", true, { hours: 30, bible_studies: 2, reg_pio: true }),
  ];

  const publishers = [pubA, pioneer, flagged, special];
  const reg = monthReportStats(reports, publishers, records, "2025-11", "regular_pioneer");
  const regular = monthReportStats(reports, publishers, records, "2025-11", "publisher");

  expect(reg.reports.entries.map((entry) => entry.publisher.id)).toEqual(["pub-b"]);
  expect(reg.reports.unresolvedCount).toBe(1);
  expect(reg.hours.total).toBe(50);
  expect(reg.hours.unresolvedCount).toBe(1);
  expect(reg.bibleStudies.total).toBe(3);
  expect(reg.bibleStudies.unresolvedCount).toBe(1);

  // Type decides resolved reports: flagged type-publisher reports count as
  // publishers, flagged unresolved reports still route to regular pioneers.
  expect(regular.reports.entries.map((entry) => entry.publisher.id)).toEqual(["pub-a", "pub-c"]);
  expect(regular.reports.unresolvedCount).toBe(0);
});

test("monthReportStats hours counts zero and null hours as no hours", () => {
  const pubA = publisher("pub-a");
  const pubB = publisher("pub-b", "Beta", "regular_pioneer");
  const records = [localRecord("pub-a", "conf-a"), localRecord("pub-b", "conf-b")];

  const reports = [
    report("conf-a", "2025-11-01", true, { hours: 0 }),
    report("conf-b", "2025-11-01", true, { hours: null }),
    report("conf-reg", "2025-11-01", true, { hours: null, reg_pio: true }),
  ];

  const result = monthReportStats(reports, [pubA, pubB], records, "2025-11", "regular_pioneer");

  expect(result.reports.entries.map((entry) => entry.publisher.id)).toEqual(["pub-b"]);
  expect(result.reports.unresolvedCount).toBe(1);
  expect(result.hours.total).toBe(0);
  expect(result.hours.entries).toEqual([]);
  expect(result.hours.unresolvedCount).toBe(0);
});

test("publisherConfidentialIds includes the publisher id and its local record ids", () => {
  const pubA = publisher("pub-a");
  const records = [
    localRecord("pub-a", "conf-a"),
    localRecord("pub-b", "conf-b"), // another publisher — excluded
  ];

  expect(publisherConfidentialIds(pubA, records).sort()).toEqual(["conf-a", "pub-a"].sort());
  expect(publisherConfidentialIds(pubA, [])).toEqual(["pub-a"]);
});

test("publisherConfidentialIds returns empty for a missing or id-less publisher", () => {
  expect(publisherConfidentialIds(null, [localRecord("pub-a", "conf-a")])).toEqual([]);
  expect(publisherConfidentialIds({ first_name: "Test", last_name: "Publisher" }, [])).toEqual([]);
});

test("reportInsertConfidentialId prefers the local-record id over the publisher's own id", () => {
  const pubA = publisher("7b15d4e5-d4fa-4eb4-a276-3790b7c4897a");
  const records = [localRecord(pubA.id!, "7b15d4e5-d4fa-4eb4-a276-3790b7c4897c")];

  expect(reportInsertConfidentialId(pubA, records)).toBe("7b15d4e5-d4fa-4eb4-a276-3790b7c4897c");
});

test("reportInsertConfidentialId falls back to the publisher id", () => {
  const pubA = publisher("7b15d4e5-d4fa-4eb4-a276-3790b7c4897a");

  expect(reportInsertConfidentialId(pubA, [])).toBe(pubA.id);
});

test("reportInsertConfidentialId skips ids that aren't uuids", () => {
  const pubA = publisher("pub-a");
  const records = [localRecord("pub-a", "conf-a")];

  expect(reportInsertConfidentialId(pubA, records)).toBeNull();
  expect(reportInsertConfidentialId(null, records)).toBeNull();
});

test("reportKey matches the report collection's composite getKey", () => {
  expect(reportKey("conf-a", "cong-b", "2025-11-01")).toBe('["conf-a","cong-b","2025-11-01"]');
});

test("publisherReportMonthIds lists the window's months ending at monthId, newest first", () => {
  const ids = publisherReportMonthIds("2025-11");

  expect(ids).toHaveLength(PUBLISHER_REPORT_WINDOW_MONTHS);
  expect(ids[0]).toBe("2025-11");
  expect(ids[PUBLISHER_REPORT_WINDOW_MONTHS - 1]).toBe("2023-12");
});

test("publisherReportsByMonth keeps one report per month, preferring the active one", () => {
  const reports = [
    report("conf-a", "2025-11-01", false),
    report("pub-a", "2025-11-01", true, { hours: 3 }),
    report("conf-a", "2025-10-01", false),
    report("conf-a", "junk", true), // malformed date — dropped
  ];

  const byMonth = publisherReportsByMonth(reports);

  expect(byMonth.size).toBe(2);
  expect(byMonth.get("2025-11")?.active).toBe(true);
  expect(byMonth.get("2025-11")?.hours).toBe(3);
  expect(byMonth.get("2025-10")?.active).toBe(false);
});

test("monthReportStats excludes spe_pio reports from every category", () => {
  const pubA = publisher("pub-a", "Alpha");
  const pioneer = publisher("pub-b", "Beta", "regular_pioneer");
  const records = [localRecord("pub-a", "conf-a"), localRecord("pub-b", "conf-b")];

  const reports = [
    report("conf-a", "2025-11-01", true, { hours: 2, bible_studies: 1 }),
    report("conf-b", "2025-11-01", true, { hours: 70, bible_studies: 4, spe_pio: true }),
    report("conf-spe", "2025-11-01", true, { hours: 70, bible_studies: 5, spe_pio: true }),
  ];

  const publishers = [pubA, pioneer];
  for (const category of ["publisher", "auxiliary_pioneer", "regular_pioneer"] as const) {
    const result = monthReportStats(reports, publishers, records, "2025-11", category);
    expect(result.reports.entries.map((entry) => entry.publisher.id)).toEqual(
      category === "publisher" ? ["pub-a"] : [],
    );
    expect(result.reports.unresolvedCount).toBe(0);
    expect(result.hours.total).toBe(category === "publisher" ? 2 : 0);
    expect(result.hours.unresolvedCount).toBe(0);
    expect(result.bibleStudies.total).toBe(category === "publisher" ? 1 : 0);
    expect(result.bibleStudies.unresolvedCount).toBe(0);
  }
});

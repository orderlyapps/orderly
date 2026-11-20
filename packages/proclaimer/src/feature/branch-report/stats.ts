import { isMonthId, shiftMonthId } from "../../util/month.ts";
import type { MeetingAttendance } from "../meeting-attendance/schema.ts";
import type { PublisherLocal } from "../publisher-local/schema.ts";
import { isArchived } from "../publisher/presentation.ts";
import type { Publisher } from "../publisher/schema.ts";
import {
  CREDIT_HOUR_FIELDS,
  CREDIT_HOUR_LABELS,
  LEGACY_SCHOOL_CREDIT,
  reportSchema,
  type CreditHours,
  type Report,
} from "./schema.ts";

/**
 * Size of the activity window for the branch report: the selected month plus
 * the five months before it.
 */
export const ACTIVE_PUBLISHER_WINDOW_MONTHS = 6;

/** Months of history shown on a publisher's report page, ending at the viewed month. */
export const PUBLISHER_REPORT_WINDOW_MONTHS = 24;

/**
 * Distinct publisher ids (report `confidential_id`) with at least one `active`
 * report dated in `monthId` or the months covered by
 * `ACTIVE_PUBLISHER_WINDOW_MONTHS` leading up to it. Reports flagged
 * `reported_elsewhere` are excluded — they count toward another
 * congregation's report, not this one — as are `spe_pio` reports, since
 * special pioneers are not counted in these stats.
 */
export function activePublisherIds(reports: Report[], monthId: string): string[] {
  const windowStart = shiftMonthId(monthId, -(ACTIVE_PUBLISHER_WINDOW_MONTHS - 1));
  const ids = new Set<string>();
  for (const report of reports) {
    if (!report.active || report.reported_elsewhere || report.spe_pio) {
      continue;
    }
    const reportMonth = report.date.slice(0, 7);
    if (!isMonthId(reportMonth) || reportMonth < windowStart || reportMonth > monthId) {
      continue;
    }
    ids.add(report.confidential_id);
  }
  return [...ids];
}

export interface WeekendAttendanceWeek {
  /** The week's `week_id` — the Monday it starts on. */
  weekId: string;
  inPerson: number;
  remote: number;
  /** Total attendance: `inPerson + remote`. */
  attendance: number;
}

/**
 * Weeks counted toward `monthId`'s weekend attendance stat, oldest first. A
 * week counts toward the month its Monday (`week_id`) falls in — weeks
 * spanning a boundary count in the month they start. Weeks with no recorded
 * count are excluded.
 */
export function weekendAttendanceWeeks(
  attendances: MeetingAttendance[],
  monthId: string,
): WeekendAttendanceWeek[] {
  const weeks: WeekendAttendanceWeek[] = [];
  for (const row of attendances) {
    if (row.week_id.slice(0, 7) !== monthId) {
      continue;
    }
    const inPerson = row.weekend_in_person_count;
    const remote = row.weekend_remote_count;
    if (inPerson == null && remote == null) {
      continue;
    }
    weeks.push({
      weekId: row.week_id,
      inPerson: inPerson ?? 0,
      remote: remote ?? 0,
      attendance: (inPerson ?? 0) + (remote ?? 0),
    });
  }
  weeks.sort((a, b) => a.weekId.localeCompare(b.weekId));
  return weeks;
}

export interface WeekendAttendanceStat {
  /** Mean total attendance (in-person + remote) per counted week. */
  average: number | null;
  /** Weeks starting in the month with at least one recorded count. */
  weekCount: number;
}

/**
 * Average weekend meeting attendance for `monthId` across the weeks returned
 * by `weekendAttendanceWeeks`; `average` is null when no week has data.
 */
export function weekendAttendanceAverage(
  attendances: MeetingAttendance[],
  monthId: string,
): WeekendAttendanceStat {
  const weeks = weekendAttendanceWeeks(attendances, monthId);
  const total = weeks.reduce((sum, week) => sum + week.attendance, 0);
  return { average: weeks.length === 0 ? null : total / weeks.length, weekCount: weeks.length };
}

/**
 * Maps each publisher-local `confidential_id` to its `publisher_id`, used to
 * resolve report `confidential_id` values to publisher rows.
 */
function confidentialPublisherIds(localRecords: PublisherLocal[]): Map<string, string> {
  const confidentialToPublisher = new Map<string, string>();
  for (const record of localRecords) {
    if (record.confidential_id) {
      confidentialToPublisher.set(record.confidential_id, record.publisher_id);
    }
  }
  return confidentialToPublisher;
}

export interface ResolvedActivePublishers {
  /** Publisher rows matching the active ids, in the order `publishers` was given. */
  publishers: Publisher[];
  /** Active confidential ids that could not be resolved to a publisher row. */
  unresolvedCount: number;
}

/**
 * Resolves active report ids (`confidential_id`) to publisher rows. A report's
 * `confidential_id` is normally the pseudonymous id stored in the publisher's
 * on-device local record (`publisher-local`), except self-reports which store
 * the publisher id directly. Each publisher counts once even when reachable
 * through multiple ids; ids resolving to nothing are surfaced via
 * `unresolvedCount` rather than dropped. Archived publishers are resolved but
 * excluded from the result — they are not counted as unresolved.
 */
export function resolveActivePublishers(
  activeIds: Iterable<string>,
  publishers: Publisher[],
  localRecords: PublisherLocal[],
): ResolvedActivePublishers {
  const publisherIds = new Set(
    publishers.map((p) => p.id).filter((id): id is string => id != null),
  );
  const confidentialToPublisher = confidentialPublisherIds(localRecords);

  const resolvedIds = new Set<string>();
  let unresolvedCount = 0;
  for (const id of activeIds) {
    const mapped = confidentialToPublisher.get(id);
    if (mapped != null && publisherIds.has(mapped)) {
      resolvedIds.add(mapped);
    } else if (publisherIds.has(id)) {
      resolvedIds.add(id);
    } else {
      unresolvedCount += 1;
    }
  }

  return {
    publishers: publishers.filter((p) => p.id != null && resolvedIds.has(p.id) && !isArchived(p)),
    unresolvedCount,
  };
}

/**
 * The `confidential_id` values a publisher's reports may be filed under: the
 * publisher's own id (self-reports store it directly, matching
 * `resolveActiveMonthReports`) plus the `confidential_id` of each on-device
 * local record for that publisher.
 */
export function publisherConfidentialIds(
  publisher: Publisher | null | undefined,
  localRecords: PublisherLocal[],
): string[] {
  if (publisher?.id == null) {
    return [];
  }
  const ids = new Set<string>([publisher.id]);
  for (const record of localRecords) {
    if (record.publisher_id === publisher.id && record.confidential_id) {
      ids.add(record.confidential_id);
    }
  }
  return [...ids];
}

/**
 * The confidential id a newly entered report for `publisher` should be filed
 * under: the first local-record confidential id (the pseudonymous id
 * secretary-entered reports use), falling back to the publisher's own id
 * (self-reports store it directly). Ids that fail the uuid check are skipped —
 * the report column is a uuid — and null is returned when no valid id exists.
 */
export function reportInsertConfidentialId(
  publisher: Publisher | null | undefined,
  localRecords: PublisherLocal[],
): string | null {
  const ids = publisherConfidentialIds(publisher, localRecords);
  const localIds = ids.filter((id) => id !== publisher?.id);
  for (const id of [...localIds, ...ids]) {
    if (reportSchema.shape.confidential_id.safeParse(id).success) {
      return id;
    }
  }
  return null;
}

/** The `PUBLISHER_REPORT_WINDOW_MONTHS` month ids ending at `monthId`, newest first. */
export function publisherReportMonthIds(monthId: string): string[] {
  return Array.from({ length: PUBLISHER_REPORT_WINDOW_MONTHS }, (_, index) =>
    shiftMonthId(monthId, -index),
  );
}

/**
 * One report per month ("YYYY-MM") for a publisher's report set. When
 * duplicate reports exist for a month (e.g. a self-report plus a
 * secretary-entered report under different confidential ids) the active
 * report wins; otherwise the first wins.
 */
export function publisherReportsByMonth(reports: Report[]): Map<string, Report> {
  const byMonth = new Map<string, Report>();
  for (const report of reports) {
    const monthId = report.date.slice(0, 7);
    if (!isMonthId(monthId)) {
      continue;
    }
    const existing = byMonth.get(monthId);
    if (existing == null || (!existing.active && report.active)) {
      byMonth.set(monthId, report);
    }
  }
  return byMonth;
}

/**
 * Total reported hours across the given months — the service-year hour total
 * shown on a regular pioneer's report history. Only `active` reports count;
 * `reported_elsewhere` reports still do, since the hours belong to the
 * publisher's personal total for the year even though another congregation
 * counted them.
 */
export function serviceYearHours(byMonth: Map<string, Report>, monthIds: Iterable<string>): number {
  let total = 0;
  for (const id of monthIds) {
    const report = byMonth.get(id);
    if (report?.active) {
      total += report.hours ?? 0;
    }
  }
  return total;
}

/** Maximum hours creditable to a pioneer's annual requirement in one month. */
export const MONTHLY_CREDIT_CAP = 55;

/**
 * Hours a report counts toward the pioneer's annual requirement: `hours` plus
 * `credit_hours`, capped at `MONTHLY_CREDIT_CAP` for the month. Credits only
 * top a month up to the cap — a report of 60 hours and 10 credits counts 60,
 * while 50 hours and 10 credits counts 55.
 */
export function creditedHours(report: Pick<Report, "hours" | "credit_hours">): number {
  if (report.hours == null) {
    return 0;
  }
  if (report.hours >= MONTHLY_CREDIT_CAP) {
    return report.hours;
  }
  const credits = Object.entries(report.credit_hours ?? {}).reduce(
    (sum, [key, hours]) => (key === LEGACY_SCHOOL_CREDIT ? sum : sum + (hours ?? 0)),
    0,
  );
  return Math.min(MONTHLY_CREDIT_CAP, report.hours + credits);
}

/**
 * `serviceYearHours` with each month's `credit_hours` applied under the
 * `MONTHLY_CREDIT_CAP` cap — the total a regular pioneer can actually claim
 * for the year.
 */
export function serviceYearCreditedHours(
  byMonth: Map<string, Report>,
  monthIds: Iterable<string>,
): number {
  let total = 0;
  for (const id of monthIds) {
    const report = byMonth.get(id);
    if (report?.active) {
      total += creditedHours(report);
    }
  }
  return total;
}

/**
 * Credit entries in display order — `["LDC 5 hrs", "Pioneer school 6 hrs"]`.
 * Known types come first; other keys follow in their stored order so no
 * recorded credit is hidden — except legacy `school`, which is never shown.
 */
export function creditHourLines(creditHours: CreditHours | null | undefined): string[] {
  if (creditHours == null) {
    return [];
  }
  const format = (key: string, hours: number) =>
    `${CREDIT_HOUR_LABELS[key] ?? key} ${hours} ${hours === 1 ? "hr" : "hrs"}`;
  const lines: string[] = [];
  const seen = new Set<string>();
  for (const { key } of CREDIT_HOUR_FIELDS) {
    const hours = creditHours[key];
    if (hours != null && hours > 0) {
      lines.push(format(key, hours));
      seen.add(key);
    }
  }
  for (const [key, hours] of Object.entries(creditHours)) {
    if (!seen.has(key) && key !== LEGACY_SCHOOL_CREDIT && typeof hours === "number" && hours > 0) {
      lines.push(format(key, hours));
    }
  }
  return lines;
}

const PUBLISHER_TYPE = "publisher";
export const REGULAR_PIONEER_TYPE = "regular_pioneer";

export interface ReportStatEntry {
  report: Report;
  publisher: Publisher;
}

/**
 * Resolves `active` reports dated in `monthId` to publisher rows, using the
 * same confidential-id mapping as `resolveActivePublishers`. Reports flagged
 * `reported_elsewhere` are skipped entirely — they count toward another
 * congregation's report, not this one — and `spe_pio` reports are skipped
 * because special pioneers are not counted in any of these stats. Archived
 * publishers resolve but are
 * excluded from the result without counting as unresolved, matching
 * `resolveActivePublishers`. A publisher reports at most once: when multiple
 * confidential ids resolve to the same publisher in the same month (e.g. a
 * self-report plus a secretary-entered report), the first report wins and
 * later rows' field data (hours, studies) is dropped — the publisher still
 * counts once. Reports matching no publisher row are returned in `unresolved`
 * so each stat can decide how to surface them.
 */
function resolveActiveMonthReports(
  reports: Report[],
  publishers: Publisher[],
  localRecords: PublisherLocal[],
  monthId: string,
): { resolved: ReportStatEntry[]; unresolved: Report[] } {
  const byId = new Map<string, Publisher>();
  for (const publisher of publishers) {
    if (publisher.id != null) {
      byId.set(publisher.id, publisher);
    }
  }
  const confidentialToPublisher = confidentialPublisherIds(localRecords);

  const reportByPublisherId = new Map<string, Report>();
  const unresolved: Report[] = [];
  for (const report of reports) {
    if (
      !report.active ||
      report.reported_elsewhere ||
      report.spe_pio ||
      report.date.slice(0, 7) !== monthId
    ) {
      continue;
    }
    const mapped = confidentialToPublisher.get(report.confidential_id);
    const publisherId =
      mapped != null && byId.has(mapped)
        ? mapped
        : byId.has(report.confidential_id)
          ? report.confidential_id
          : null;
    if (publisherId == null) {
      unresolved.push(report);
    } else if (!reportByPublisherId.has(publisherId)) {
      reportByPublisherId.set(publisherId, report);
    }
  }

  const resolved: ReportStatEntry[] = [];
  for (const publisher of publishers) {
    if (publisher.id == null || isArchived(publisher)) {
      continue;
    }
    const report = reportByPublisherId.get(publisher.id);
    if (report) {
      resolved.push({ report, publisher });
    }
  }
  return { resolved, unresolved };
}

/**
 * Reporter categories shown on the branch report. Resolved reports are
 * categorized by the reporting publisher's `type` except `aux_pio`-flagged
 * reports, which always count as auxiliary pioneer reports. `reg_pio` is only
 * used to categorize reports that could not be resolved to a publisher row —
 * resolved reports rely on `type` alone, so a report never counts in two
 * categories.
 */
export type ReportCategory = "publisher" | "auxiliary_pioneer" | "regular_pioneer";

interface CategoryMatcher {
  /** Whether a resolved report+publisher pair belongs to the category. */
  resolved(entry: ReportStatEntry): boolean;
  /** Whether a report matching no publisher row could belong to the category. */
  unresolved(report: Report): boolean;
}

const CATEGORY_MATCHERS: Record<ReportCategory, CategoryMatcher> = {
  publisher: {
    resolved: ({ report, publisher }) => publisher.type === PUBLISHER_TYPE && !report.aux_pio,
    unresolved: (report) => !report.aux_pio && !report.reg_pio,
  },
  auxiliary_pioneer: {
    resolved: ({ report }) => report.aux_pio,
    unresolved: (report) => report.aux_pio,
  },
  regular_pioneer: {
    resolved: ({ report, publisher }) => !report.aux_pio && publisher.type === REGULAR_PIONEER_TYPE,
    unresolved: (report) => report.reg_pio && !report.aux_pio,
  },
};

export interface ReportCountStat {
  /** Counted publishers, in the order `publishers` was given. */
  entries: ReportStatEntry[];
  /**
   * Active in-month reports that could belong to the category but could not
   * be matched to a publisher on this device — each may be missing from
   * `entries`.
   */
  unresolvedCount: number;
}

export interface ReportValueStat extends ReportCountStat {
  /**
   * Sum of the stat's value across `entries`. Unresolved reports' values are
   * not included — only their count is surfaced via `unresolvedCount`.
   */
  total: number;
}

export interface CategoryMonthStats {
  /** The "Number of Reports" stat. */
  reports: ReportCountStat;
  /** The "Hours" stat: summed `hours` over reports with hours recorded. */
  hours: ReportValueStat;
  /** The "Bible Studies" stat: summed `bible_studies` over reports with studies recorded. */
  bibleStudies: ReportValueStat;
}

function valueStat(
  entries: ReportStatEntry[],
  unresolved: Report[],
  valueOf: (report: Report) => number | null,
): ReportValueStat {
  const valued = entries.filter((entry) => (valueOf(entry.report) ?? 0) > 0);
  return {
    entries: valued,
    total: valued.reduce((sum, entry) => sum + (valueOf(entry.report) ?? 0), 0),
    unresolvedCount: unresolved.filter((report) => (valueOf(report) ?? 0) > 0).length,
  };
}

/**
 * Monthly branch-report stats for `category`: active reports dated in
 * `monthId` belonging to that reporter category. `reports.entries` lists
 * every counted publisher; `hours` and `bibleStudies` list only publishers
 * whose report recorded a positive value. Reports flagged
 * `reported_elsewhere` or `spe_pio` and reports from archived publishers are
 * excluded by `resolveActiveMonthReports`; reports matching no publisher row are
 * surfaced through each stat's `unresolvedCount` when their flags fit the
 * category.
 */
export function monthReportStats(
  reports: Report[],
  publishers: Publisher[],
  localRecords: PublisherLocal[],
  monthId: string,
  category: ReportCategory,
): CategoryMonthStats {
  const match = CATEGORY_MATCHERS[category];
  const { resolved, unresolved } = resolveActiveMonthReports(
    reports,
    publishers,
    localRecords,
    monthId,
  );
  const entries = resolved.filter((entry) => match.resolved(entry));
  const unresolvedForCategory = unresolved.filter((report) => match.unresolved(report));
  return {
    reports: { entries, unresolvedCount: unresolvedForCategory.length },
    hours: valueStat(entries, unresolvedForCategory, (report) => report.hours),
    bibleStudies: valueStat(entries, unresolvedForCategory, (report) => report.bible_studies),
  };
}

import { isMonthId, shiftMonthId } from "../../util/month.ts";
import type { MeetingAttendance } from "../meeting-attendance/schema.ts";
import type { PublisherLocal } from "../publisher-local/schema.ts";
import { isArchived } from "../publisher/presentation.ts";
import type { Publisher } from "../publisher/schema.ts";
import type { Report } from "./schema.ts";

/**
 * Size of the activity window for the branch report: the selected month plus
 * the five months before it.
 */
export const ACTIVE_PUBLISHER_WINDOW_MONTHS = 6;

/**
 * Distinct publisher ids (report `confidential_id`) with at least one `active`
 * report dated in `monthId` or the months covered by
 * `ACTIVE_PUBLISHER_WINDOW_MONTHS` leading up to it. Reports flagged
 * `reported_elsewhere` are excluded — they count toward another
 * congregation's report, not this one.
 */
export function activePublisherIds(reports: Report[], monthId: string): string[] {
  const windowStart = shiftMonthId(monthId, -(ACTIVE_PUBLISHER_WINDOW_MONTHS - 1));
  const ids = new Set<string>();
  for (const report of reports) {
    if (!report.active || report.reported_elsewhere) {
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

const PUBLISHER_TYPE = "publisher";

interface ResolvedMonthReport {
  report: Report;
  publisher: Publisher;
}

/**
 * Resolves `active` reports dated in `monthId` to publisher rows, using the
 * same confidential-id mapping as `resolveActivePublishers`. Reports flagged
 * `reported_elsewhere` are skipped entirely — they count toward another
 * congregation's report, not this one. Archived publishers resolve but are
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
): { resolved: ResolvedMonthReport[]; unresolved: Report[] } {
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
    if (!report.active || report.reported_elsewhere || report.date.slice(0, 7) !== monthId) {
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

  const resolved: ResolvedMonthReport[] = [];
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

export interface PublisherReportEntry {
  /** A publisher counted in the stat. */
  publisher: Publisher;
  /** Bible studies on their report for the month (null when not recorded). */
  bibleStudies: number | null;
}

export interface PublisherReportStat {
  /** Counted publishers, in the order `publishers` was given. */
  entries: PublisherReportEntry[];
  /**
   * Active in-month reports that could not be matched to a publisher on this
   * device — each may be a `type` "publisher" report missing from `entries`.
   */
  unresolvedCount: number;
}

/**
 * Publishers of `type` "publisher" with an active report dated in `monthId` —
 * the "Number of Reports" stat. Reports submitted as an auxiliary pioneer
 * (`aux_pio`) are excluded from both `entries` and `unresolvedCount`; they
 * belong to a separate reporter category.
 */
export function publisherReports(
  reports: Report[],
  publishers: Publisher[],
  localRecords: PublisherLocal[],
  monthId: string,
): PublisherReportStat {
  const { resolved, unresolved } = resolveActiveMonthReports(
    reports,
    publishers,
    localRecords,
    monthId,
  );
  return {
    entries: resolved
      .filter((entry) => entry.publisher.type === PUBLISHER_TYPE && !entry.report.aux_pio)
      .map((entry) => ({ publisher: entry.publisher, bibleStudies: entry.report.bible_studies })),
    unresolvedCount: unresolved.filter((report) => !report.aux_pio).length,
  };
}

export interface PublisherBibleStudiesStat extends PublisherReportStat {
  /** Sum of bible studies across `entries`. */
  total: number;
}

/**
 * Bible studies reported in `monthId` by publishers of `type` "publisher" —
 * the "Bible Studies" stat. Reports submitted as an auxiliary pioneer
 * (`aux_pio`) are excluded. `entries` lists only publishers that reported at
 * least one study; `unresolvedCount` counts reports with studies that could
 * not be matched to a publisher on this device.
 */
export function publisherBibleStudies(
  reports: Report[],
  publishers: Publisher[],
  localRecords: PublisherLocal[],
  monthId: string,
): PublisherBibleStudiesStat {
  const { resolved, unresolved } = resolveActiveMonthReports(
    reports,
    publishers,
    localRecords,
    monthId,
  );
  const entries = resolved
    .filter(
      (entry) =>
        entry.publisher.type === PUBLISHER_TYPE &&
        !entry.report.aux_pio &&
        entry.report.bible_studies != null &&
        entry.report.bible_studies > 0,
    )
    .map((entry) => ({ publisher: entry.publisher, bibleStudies: entry.report.bible_studies }));
  return {
    entries,
    total: entries.reduce((sum, entry) => sum + (entry.bibleStudies ?? 0), 0),
    unresolvedCount: unresolved.filter(
      (report) => !report.aux_pio && report.bible_studies != null && report.bible_studies > 0,
    ).length,
  };
}

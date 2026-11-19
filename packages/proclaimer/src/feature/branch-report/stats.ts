import { isMonthId, shiftMonthId } from "../../util/month.ts";
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
 * `ACTIVE_PUBLISHER_WINDOW_MONTHS` leading up to it.
 */
export function activePublisherIds(reports: Report[], monthId: string): string[] {
  const windowStart = shiftMonthId(monthId, -(ACTIVE_PUBLISHER_WINDOW_MONTHS - 1));
  const ids = new Set<string>();
  for (const report of reports) {
    if (!report.active) {
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
  const confidentialToPublisher = new Map<string, string>();
  for (const record of localRecords) {
    if (record.confidential_id) {
      confidentialToPublisher.set(record.confidential_id, record.publisher_id);
    }
  }

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

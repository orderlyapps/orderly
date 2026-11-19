import { shiftMonthId } from "../../util/month.ts";
import { createSupabaseTableCollection, getCachedCollection } from "../backend/collections.ts";
import { REPORT_TABLE, reportSchema, type Report } from "./schema.ts";
import { ACTIVE_PUBLISHER_WINDOW_MONTHS, PUBLISHER_REPORT_WINDOW_MONTHS } from "./stats.ts";

const REPORT_SELECT =
  "confidential_id,congregation_id,date,active,hours,bible_studies,aux_pio,reg_pio,spe_pio,reported_elsewhere";

const REPORT_KEY_COLUMNS: (keyof Report)[] = ["confidential_id", "congregation_id", "date"];

/**
 * Reports for `congregationId` bounded to the `monthId` activity window (the
 * selected month and the `ACTIVE_PUBLISHER_WINDOW_MONTHS - 1` months before
 * it). The bound keeps the fetch under PostgREST's row cap as the report
 * table grows; the month is part of the collection id so sliding the window
 * never reuses a stale query key.
 */
export function createReportCollection(congregationId: string, monthId: string) {
  const windowStart = `${shiftMonthId(monthId, -(ACTIVE_PUBLISHER_WINDOW_MONTHS - 1))}-01`;
  // Exclusive upper bound: report dates are first-of-month, but `lt` keeps the
  // bound correct for any date within the selected month.
  const windowEnd = `${shiftMonthId(monthId, 1)}-01`;
  return createSupabaseTableCollection<Report>({
    table: REPORT_TABLE,
    id: `${REPORT_TABLE}:${congregationId}:${monthId}`,
    select: REPORT_SELECT,
    match: { congregation_id: congregationId },
    filter: (query) => query.gte("date", windowStart).lt("date", windowEnd),
    keyColumns: REPORT_KEY_COLUMNS,
    schema: reportSchema,
  });
}

export type ReportCollection = ReturnType<typeof createReportCollection>;

// Matches the composite getKey in createSupabaseTableCollection for
// keyColumns ["confidential_id", "congregation_id", "date"]
export function reportKey(confidentialId: string, congregationId: string, date: string): string {
  return JSON.stringify([confidentialId, congregationId, date]);
}

/**
 * Unique, sorted, uuid-valid report ids. `report.confidential_id` is a uuid
 * column, so any malformed id in the `in` list (e.g. a legacy local-record
 * value) would 400 the whole query — drop them instead.
 */
function publisherReportIds(confidentialIds: string[]): string[] {
  const ids = new Set<string>();
  for (const id of confidentialIds) {
    if (reportSchema.shape.confidential_id.safeParse(id).success) {
      ids.add(id);
    }
  }
  return [...ids].sort();
}

/**
 * All reports filed under `confidentialIds` within the
 * `PUBLISHER_REPORT_WINDOW_MONTHS`-month window ending at `monthId` — the
 * publisher report page's history fetch. Not bounded by congregation — row
 * level security still limits the result to congregations the reader can
 * access, so a publisher's reports follow them across a move only while the
 * reader retains access to both. The ids and month are part of the collection
 * id so different selections never share a query key.
 */
export function createPublisherReportCollection(confidentialIds: string[], monthId: string) {
  const ids = publisherReportIds(confidentialIds);
  const windowStart = `${shiftMonthId(monthId, -(PUBLISHER_REPORT_WINDOW_MONTHS - 1))}-01`;
  // Exclusive upper bound: report dates are first-of-month, but `lt` keeps the
  // bound correct for any date within the selected month.
  const windowEnd = `${shiftMonthId(monthId, 1)}-01`;
  return createSupabaseTableCollection<Report>({
    table: REPORT_TABLE,
    id: `${REPORT_TABLE}:publisher:${ids.join(",")}:${monthId}`,
    select: REPORT_SELECT,
    filter: (query) =>
      query.in("confidential_id", ids).gte("date", windowStart).lt("date", windowEnd),
    keyColumns: REPORT_KEY_COLUMNS,
    schema: reportSchema,
  });
}

const defaultCollections = new Map<string, ReportCollection>();

export function getReportCollection(congregationId: string, monthId: string): ReportCollection {
  const key = `${congregationId.trim()}:${monthId.trim()}`;
  return getCachedCollection(defaultCollections, key, () =>
    createReportCollection(congregationId.trim(), monthId.trim()),
  );
}

const publisherCollections = new Map<string, ReportCollection>();

export function getPublisherReportCollection(
  confidentialIds: string[],
  monthId: string,
): ReportCollection {
  const ids = publisherReportIds(confidentialIds);
  const key = `${ids.join(",")}:${monthId.trim()}`;
  return getCachedCollection(publisherCollections, key, () =>
    createPublisherReportCollection(ids, monthId.trim()),
  );
}

export async function resetReportCollectionsForTesting(): Promise<void> {
  const collections = [...defaultCollections.values(), ...publisherCollections.values()];
  defaultCollections.clear();
  publisherCollections.clear();
  await Promise.all(collections.map((collection) => collection.cleanup().catch(() => {})));
}

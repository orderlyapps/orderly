import { shiftMonthId } from "../../util/month.ts";
import { createSupabaseTableCollection, getCachedCollection } from "../backend/collections.ts";
import { REPORT_TABLE, reportSchema, type Report } from "./schema.ts";
import { ACTIVE_PUBLISHER_WINDOW_MONTHS } from "./stats.ts";

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
    select: "confidential_id,congregation_id,date,active,hours,bible_studies",
    match: { congregation_id: congregationId },
    filter: (query) => query.gte("date", windowStart).lt("date", windowEnd),
    keyColumns: ["confidential_id", "congregation_id", "date"],
    schema: reportSchema,
  });
}

export type ReportCollection = ReturnType<typeof createReportCollection>;

const defaultCollections = new Map<string, ReportCollection>();

export function getReportCollection(congregationId: string, monthId: string): ReportCollection {
  const key = `${congregationId.trim()}:${monthId.trim()}`;
  return getCachedCollection(defaultCollections, key, () =>
    createReportCollection(congregationId.trim(), monthId.trim()),
  );
}

export async function resetReportCollectionsForTesting(): Promise<void> {
  const collections = [...defaultCollections.values()];
  defaultCollections.clear();
  await Promise.all(collections.map((collection) => collection.cleanup().catch(() => {})));
}

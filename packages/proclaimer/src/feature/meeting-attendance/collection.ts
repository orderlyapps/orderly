import { shiftMonthId } from "../../util/month.ts";
import { createSupabaseTableCollection, getCachedCollection } from "../backend/collections.ts";
import {
  MEETING_ATTENDANCE_TABLE,
  meetingAttendanceSchema,
  type MeetingAttendance,
} from "./schema.ts";

/**
 * Meeting attendance rows for `congregationId` for the weeks that start in
 * `monthId` (`week_id` is the week's Monday). The bound keeps the fetch
 * small; the month is part of the collection id so navigating months never
 * reuses a stale query key.
 */
export function createMeetingAttendanceCollection(congregationId: string, monthId: string) {
  const monthStart = `${monthId}-01`;
  // Exclusive upper bound: week ids are Mondays, but `lt` keeps the bound
  // correct for any date within the selected month.
  const monthEnd = `${shiftMonthId(monthId, 1)}-01`;
  return createSupabaseTableCollection<MeetingAttendance>({
    table: MEETING_ATTENDANCE_TABLE,
    id: `${MEETING_ATTENDANCE_TABLE}:${congregationId}:${monthId}`,
    select:
      "week_id,congregation_id,weekend_in_person_count,weekend_remote_count,midweek_in_person_count,midweek_remote_count",
    match: { congregation_id: congregationId },
    filter: (query) => query.gte("week_id", monthStart).lt("week_id", monthEnd),
    keyColumns: ["week_id", "congregation_id"],
    schema: meetingAttendanceSchema,
  });
}

export type MeetingAttendanceCollection = ReturnType<typeof createMeetingAttendanceCollection>;

const defaultCollections = new Map<string, MeetingAttendanceCollection>();

export function getMeetingAttendanceCollection(
  congregationId: string,
  monthId: string,
): MeetingAttendanceCollection {
  const key = `${congregationId.trim()}:${monthId.trim()}`;
  return getCachedCollection(defaultCollections, key, () =>
    createMeetingAttendanceCollection(congregationId.trim(), monthId.trim()),
  );
}

export async function resetMeetingAttendanceCollectionsForTesting(): Promise<void> {
  const collections = [...defaultCollections.values()];
  defaultCollections.clear();
  await Promise.all(collections.map((collection) => collection.cleanup().catch(() => {})));
}

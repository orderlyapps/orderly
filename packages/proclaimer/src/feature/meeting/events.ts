import type { EventRow } from "../event/schema.ts";
import { dateRangeOverlapsWeek } from "../../util/week.ts";
import type { MeetingEventInfo } from "./types.ts";

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const EVENT_PRESENTATION: Record<
  MeetingEventInfo["type"],
  { title: string; replacesMeeting: boolean }
> = {
  circuit_visit: { title: "Circuit Overseer Visit", replacesMeeting: false },
  circuit_assembly: { title: "Circuit Assembly", replacesMeeting: true },
  convention: { title: "Convention", replacesMeeting: true },
};

/**
 * Finds the assembly, convention, or circuit visit overlapping the week
 * (checked in that priority order) and shapes it for the meeting program.
 */
export function findWeekEvent(
  events: EventRow[] | undefined,
  weekId: string,
  resolveName: (participantId: string) => string | undefined,
): MeetingEventInfo | undefined {
  for (const type of ["circuit_assembly", "convention", "circuit_visit"] as const) {
    const event = events?.find(
      (e) => e.type === type && dateRangeOverlapsWeek(weekId, e.start_date, e.end_date),
    );
    if (!event) {
      continue;
    }
    const presentation = EVENT_PRESENTATION[type];
    // event.name may hold the overseer's participant id or a free-text name.
    // Fall back to the raw value unless it is an unresolved id, so the name
    // isn't silently dropped either way.
    const overseerName =
      type === "circuit_visit"
        ? (resolveName(event.name) ??
          (event.name && !UUID_PATTERN.test(event.name) ? event.name : undefined))
        : undefined;
    return {
      type,
      title: presentation.title,
      name: event.name || undefined,
      midweekTheme: event.details?.midweek_theme || undefined,
      weekendTheme: event.details?.weekend_theme || undefined,
      overseerName,
      replacesMeeting: presentation.replacesMeeting,
    };
  }
  return undefined;
}

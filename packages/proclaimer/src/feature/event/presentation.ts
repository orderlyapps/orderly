import { formatWeekId, parseWeekId } from "../../util/week.ts";
import type { EventRow, EventType } from "./schema.ts";

export interface EventGroup {
  /** "YYYY-MM" key, stable for ordering. */
  key: string;
  /** "November" in the current year, "November 2027" otherwise. */
  label: string;
  events: EventRow[];
}

export const EVENT_TYPE_LABELS: Record<EventType, string> = {
  circuit_assembly: "Circuit Assembly",
  convention: "Convention",
  memorial: "Memorial",
  circuit_visit: "Circuit Overseer Visit",
  special_meeting: "Special Meeting",
  special_talk: "Special Talk",
  campaign: "Campaign",
  pioneer_meeting: "Pioneer Meeting",
  kingdom_ministry_school: "Kingdom Ministry School",
  working_bee: "Working Bee",
  bethel_speaker: "Bethel Speaker",
  other: "Other",
};

// For these types the event's own name is the headline; the rest use a
// fixed type label and surface the name as secondary text.
const NAME_HEADLINE_TYPES = new Set<EventType>([
  "campaign",
  "pioneer_meeting",
  "kingdom_ministry_school",
  "other",
]);

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function isUuid(value: string): boolean {
  return UUID_PATTERN.test(value);
}

/** Parses a "YYYY-MM-DD" (or ISO datetime) as a local date. Null when invalid. */
function parseEventDay(iso: string | null | undefined): Date | null {
  return parseWeekId(iso?.slice(0, 10) ?? "");
}

/** End date clamped to the start; malformed "end before start" rows are
 * treated as single-day events. */
function effectiveEnd(start: Date | null, end: Date | null): Date | null {
  return start && end && end.getTime() > start.getTime() ? end : null;
}

export function eventTitle(event: EventRow): string {
  const label = EVENT_TYPE_LABELS[event.type];
  if (NAME_HEADLINE_TYPES.has(event.type)) {
    return event.name.trim() || label;
  }
  return label;
}

/** Secondary text: the name for fixed-label types (unless it's an unresolved
 * participant id), or the description for name-headline types. */
export function eventSubtitle(event: EventRow): string | undefined {
  if (NAME_HEADLINE_TYPES.has(event.type)) {
    return event.description.trim() || undefined;
  }
  const name = event.name.trim();
  if (name && !isUuid(name)) {
    return name;
  }
  return event.description.trim() || undefined;
}

/** "November 8 (Saturday)" for single-day events; "November 8 – 10" or
 * "November 28 – December 1" for ranges. */
export function formatEventDate(startIso: string, endIso?: string | null): string {
  const start = parseEventDay(startIso);
  if (!start) {
    return startIso;
  }
  const end = effectiveEnd(start, parseEventDay(endIso));
  if (!end) {
    const month = start.toLocaleDateString(undefined, { month: "long" });
    const weekday = start.toLocaleDateString(undefined, { weekday: "long" });
    return `${month} ${start.getDate()} (${weekday})`;
  }
  const startMonth = start.toLocaleDateString(undefined, { month: "long" });
  const endMonth = end.toLocaleDateString(undefined, { month: "long" });
  const startYear = start.getFullYear();
  const endYear = end.getFullYear();
  if (startYear !== endYear) {
    return `${startMonth} ${start.getDate()}, ${startYear} – ${endMonth} ${end.getDate()}, ${endYear}`;
  }
  if (startMonth === endMonth) {
    return `${startMonth} ${start.getDate()} – ${end.getDate()}`;
  }
  return `${startMonth} ${start.getDate()} – ${endMonth} ${end.getDate()}`;
}

/** "09:30:00" → "9:30 AM". Returns the raw value when it can't be parsed. */
export function formatEventTime(time: string | null | undefined): string | undefined {
  if (!time) {
    return undefined;
  }
  const [hour, minute] = time.split(":").map(Number);
  if (
    !Number.isInteger(hour) ||
    !Number.isInteger(minute) ||
    hour < 0 ||
    hour > 24 ||
    minute < 0 ||
    minute > 59
  ) {
    return time;
  }
  return new Date(2000, 0, 1, hour, minute).toLocaleTimeString(undefined, {
    hour: "numeric",
    minute: "2-digit",
  });
}

/** "9:30 AM – 11:00 AM" when both times parse; "9:30 AM" when only the
 * start does. Undefined without a usable start time. */
export function formatEventTimeRange(
  startTime: string | null | undefined,
  endTime?: string | null,
): string | undefined {
  const start = formatEventTime(startTime);
  const end = formatEventTime(endTime);
  if (start && end && end !== start) {
    return `${start} – ${end}`;
  }
  return start;
}

/** Date plus time for timed events, e.g. "November 8 (Saturday) · 9:30 AM".
 * Multi-day events show only the start time — an "9:30–11:00" range next to a
 * date range reads ambiguously. */
export function eventDateMeta(event: EventRow): string {
  const start = parseEventDay(event.start_date);
  const isMultiDay = effectiveEnd(start, parseEventDay(event.end_date)) !== null;
  const date = formatEventDate(event.start_date, event.end_date);
  if (event.all_day) {
    return date;
  }
  const time = isMultiDay
    ? formatEventTime(event.start_time)
    : formatEventTimeRange(event.start_time, event.end_time);
  return time ? `${date} · ${time}` : date;
}

/** Day-of-month label for the leading date chip; a range like "8–10" when
 * the event spans days within one month. */
export function eventDayChip(event: EventRow): string {
  const start = parseEventDay(event.start_date);
  if (!start) {
    return "–";
  }
  const end = effectiveEnd(start, parseEventDay(event.end_date));
  if (end && end.getMonth() === start.getMonth() && end.getFullYear() === start.getFullYear()) {
    return `${start.getDate()}–${end.getDate()}`;
  }
  return String(start.getDate());
}

/** Full month for the leading date chip ("NOVEMBER"). */
export function eventMonthChip(event: EventRow): string {
  const start = parseEventDay(event.start_date);
  if (!start) {
    return "";
  }
  return start.toLocaleDateString(undefined, { month: "long" }).toUpperCase();
}

/** Events that have not ended yet, sorted by start, bucketed by start month. */
export function groupUpcomingEvents(events: EventRow[], now: Date = new Date()): EventGroup[] {
  const today = formatWeekId(now);
  const upcoming = events
    // An event stays listed until its last day; a malformed end before the
    // start falls back to the start date rather than hiding the event.
    .filter((event) => {
      const start = event.start_date.slice(0, 10);
      const end = (event.end_date ?? "").slice(0, 10);
      return (end > start ? end : start) >= today;
    })
    .sort((a, b) => {
      const byDate = a.start_date.localeCompare(b.start_date);
      if (byDate !== 0) {
        return byDate;
      }
      const byTime = (a.start_time ?? "").localeCompare(b.start_time ?? "");
      return byTime !== 0 ? byTime : a.name.localeCompare(b.name);
    });

  const groups = new Map<string, EventGroup>();
  const currentYear = now.getFullYear();
  for (const event of upcoming) {
    const key = event.start_date.slice(0, 7);
    let group = groups.get(key);
    if (!group) {
      const date = parseEventDay(event.start_date);
      const month = date ? date.toLocaleDateString(undefined, { month: "long" }) : event.start_date;
      const year = date?.getFullYear();
      const label = year && year !== currentYear ? `${month} ${year}` : month;
      group = { key, label, events: [] };
      groups.set(key, group);
    }
    group.events.push(event);
  }
  return [...groups.values()].sort((a, b) => a.key.localeCompare(b.key));
}

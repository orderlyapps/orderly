import { expect, test } from "vite-plus/test";

import {
  eventDateMeta,
  eventDayChip,
  eventMonthChip,
  eventSubtitle,
  eventTitle,
  formatEventDate,
  formatEventTime,
  groupUpcomingEvents,
  type EventRow,
} from "../src/feature/event/index.ts";

const congregationId = "7b15d4e5-d4fa-4eb4-a276-3790b7c4897b";

function makeEvent(partial: Partial<EventRow>): EventRow {
  return {
    id: "f4ac9e47-0d43-4fc7-b6d5-9f9a42e5e213",
    congregation_id: congregationId,
    name: "",
    description: "",
    address: "",
    coordinates: null,
    all_day: true,
    start_date: "2025-11-08",
    start_time: null,
    end_date: null,
    end_time: null,
    type: "other",
    details: null,
    ...partial,
  };
}

const now = new Date(2025, 10, 5); // Wednesday, November 5, 2025

test("eventTitle uses fixed labels for named types and the name for headline types", () => {
  expect(eventTitle(makeEvent({ type: "circuit_assembly", name: "Some name" }))).toBe(
    "Circuit Assembly",
  );
  expect(eventTitle(makeEvent({ type: "convention" }))).toBe("Convention");
  expect(eventTitle(makeEvent({ type: "circuit_visit" }))).toBe("Circuit Overseer Visit");
  expect(eventTitle(makeEvent({ type: "memorial" }))).toBe("Memorial");
  expect(eventTitle(makeEvent({ type: "other", name: "Picnic" }))).toBe("Picnic");
  expect(eventTitle(makeEvent({ type: "other", name: " " }))).toBe("Other");
  expect(eventTitle(makeEvent({ type: "campaign", name: "Invitation Campaign" }))).toBe(
    "Invitation Campaign",
  );
});

test("eventSubtitle surfaces the name for fixed-label types and description otherwise", () => {
  expect(
    eventSubtitle(makeEvent({ type: "circuit_assembly", name: "Assembly With Bible Principles" })),
  ).toBe("Assembly With Bible Principles");
  expect(eventSubtitle(makeEvent({ type: "other", description: "At the hall" }))).toBe(
    "At the hall",
  );
  // An unresolved participant id should never be shown as the subtitle.
  expect(eventSubtitle(makeEvent({ type: "circuit_visit", name: congregationId }))).toBeUndefined();
  expect(eventSubtitle(makeEvent({ type: "convention" }))).toBeUndefined();
});

test("formatEventDate renders single days with weekday and ranges across months", () => {
  expect(formatEventDate("2025-11-08")).toBe("Saturday, November 8");
  expect(formatEventDate("2025-11-08", "2025-11-08")).toBe("Saturday, November 8");
  expect(formatEventDate("2025-11-08", "2025-11-10")).toBe("November 8–10");
  expect(formatEventDate("2025-11-28", "2025-12-01")).toBe("November 28 – December 1");
  expect(formatEventDate("2025-12-30", "2026-01-02")).toBe("December 30, 2025 – January 2, 2026");
});

test("formatEventTime renders a localized time and passes through junk", () => {
  const formatted = formatEventTime("09:30:00");
  expect(formatted).toMatch(/9:30/);
  expect(formatEventTime("not-a-time")).toBe("not-a-time");
  expect(formatEventTime(null)).toBeUndefined();
});

test("formatEventTime passes through out-of-range values instead of normalizing", () => {
  // new Date(2000, 0, 1, 25, 99) would silently roll over to "2:39 AM".
  expect(formatEventTime("25:99")).toBe("25:99");
  expect(formatEventTime("-1:00")).toBe("-1:00");
  expect(formatEventTime("09:60")).toBe("09:60");
});

test("eventDateMeta appends the start time for timed events", () => {
  expect(eventDateMeta(makeEvent({}))).toBe("Saturday, November 8");
  const timed = eventDateMeta(makeEvent({ all_day: false, start_time: "09:30:00" }));
  expect(timed).toContain("Saturday, November 8");
  expect(timed).toContain("9:30");
});

test("eventDateMeta renders a time range and ignores times on all-day events", () => {
  const ranged = eventDateMeta(
    makeEvent({ all_day: false, start_time: "09:30:00", end_time: "11:00:00" }),
  );
  expect(ranged).toContain("9:30");
  expect(ranged).toContain("11:00");
  // An identical end collapses back to a single time.
  const same = eventDateMeta(
    makeEvent({ all_day: false, start_time: "09:30:00", end_time: "09:30:00" }),
  );
  expect(same).not.toContain("–");
  expect(eventDateMeta(makeEvent({ all_day: true, start_time: "09:30:00" }))).toBe(
    "Saturday, November 8",
  );
});

test("eventDateMeta shows only the start time for multi-day events", () => {
  const meta = eventDateMeta(
    makeEvent({
      all_day: false,
      start_date: "2025-11-08",
      end_date: "2025-11-10",
      start_time: "09:30:00",
      end_time: "11:00:00",
    }),
  );
  expect(meta).toContain("November 8–10");
  expect(meta).toContain("9:30");
  expect(meta).not.toContain("11:00");
});

test("a malformed end_date before start_date is treated as a single-day event", () => {
  const malformed = makeEvent({ start_date: "2025-11-20", end_date: "2025-11-15" });
  expect(formatEventDate(malformed.start_date, malformed.end_date)).toBe("Thursday, November 20");
  expect(eventDayChip(malformed)).toBe("20");
  // The past end_date must not hide an event that hasn't started yet.
  const groups = groupUpcomingEvents([malformed], now);
  expect(groups).toHaveLength(1);
  expect(groups[0].events[0].id).toBe(malformed.id);
});

test("date chips show the month and day or a same-month range", () => {
  const single = makeEvent({});
  expect(eventMonthChip(single)).toBe("NOV");
  expect(eventDayChip(single)).toBe("8");
  const ranged = makeEvent({ end_date: "2025-11-10" });
  expect(eventDayChip(ranged)).toBe("8–10");
  // Cross-month ranges show only the start day; the meta line carries the range.
  expect(eventDayChip(makeEvent({ start_date: "2025-11-28", end_date: "2025-12-01" }))).toBe("28");
});

test("groupUpcomingEvents drops finished events and keeps in-progress ones", () => {
  const events = [
    makeEvent({ id: "11111111-1111-4111-8111-111111111111", start_date: "2025-10-31" }),
    makeEvent({
      id: "22222222-2222-4222-8222-222222222222",
      start_date: "2025-11-03",
      end_date: "2025-11-09",
      name: "In progress",
    }),
    makeEvent({
      id: "33333333-3333-4333-8333-333333333333",
      start_date: "2025-12-25",
      name: "Later",
    }),
  ];
  const groups = groupUpcomingEvents(events, now);
  expect(groups.map((group) => group.label)).toEqual(["November", "December"]);
  expect(groups[0].events.map((event) => event.name)).toEqual(["In progress"]);
  // Multi-day events already in progress stay visible until their end date.
  expect(groups[0].events[0].id).toBe("22222222-2222-4222-8222-222222222222");
});

test("groupUpcomingEvents labels other years with the year and sorts within a month", () => {
  const events = [
    makeEvent({
      id: "44444444-4444-4444-8444-444444444444",
      start_date: "2025-11-20",
      name: "Later",
    }),
    makeEvent({
      id: "55555555-5555-4555-8555-555555555555",
      start_date: "2025-11-08",
      name: "Sooner",
    }),
    makeEvent({
      id: "66666666-6666-4666-8666-666666666666",
      start_date: "2026-03-14",
      name: "Next year",
    }),
  ];
  const groups = groupUpcomingEvents(events, now);
  expect(groups.map((group) => group.label)).toEqual(["November", "March 2026"]);
  expect(groups[0].events.map((event) => event.name)).toEqual(["Sooner", "Later"]);
});

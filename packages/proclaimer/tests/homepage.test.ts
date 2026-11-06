import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { expect, test } from "vite-plus/test";

import { createCollection, localStorageCollectionOptions } from "@tanstack/react-db";

import type { EventCollection, EventRow } from "../src/feature/event/index.ts";
import {
  buildUpcomingAssignments,
  getWelcomeName,
  HomepageView,
} from "../src/feature/homepage/index.ts";
import type {
  MidweekAssignmentCollection,
  MidweekMeetingAssignment,
  MidweekMeetingData,
  MidweekMeetingDataCollection,
} from "../src/feature/midweek-meeting/index.ts";
import type { Publisher, PublisherCollection } from "../src/feature/publisher/index.ts";
import { createSettingsStore } from "../src/feature/settings/index.ts";
import type {
  SpeakerAssignment,
  SpeakerAssignmentCollection,
  WeekendAssignment,
  WeekendAssignmentCollection,
} from "../src/feature/weekend-meeting/index.ts";
import { currentWeekId, formatWeekId, shiftWeekId } from "../src/util/week.ts";

let storeCounter = 0;
function nextStoreName() {
  storeCounter += 1;
  return `proclaimer_homepage_test_${Date.now()}_${storeCounter}`;
}

const congregationId = "7b15d4e5-d4fa-4eb4-a276-3790b7c4897b";
const weekId = "2025-11-03";

const meeting: MidweekMeetingData = {
  week_id: weekId,
  mwb_week_date_locale: "NOVEMBER 3-9",
  mwb_weekly_bible_reading: "SONG OF SOLOMON 1-2",
  mwb_song_first: 132,
  mwb_tgw_talk: "A Story of Unfailing Love",
  mwb_tgw_talk_title: "1. A Story of Unfailing Love",
  mwb_tgw_gems_title: "2. Spiritual Gems",
  mwb_tgw_bread: "Ca 2:1-17 (th study 12)",
  mwb_tgw_bread_title: "3. Bible Reading",
  mwb_ayf_count: 1,
  mwb_ayf_part1: "HOUSE TO HOUSE. (lmd lesson 1 point 3)",
  mwb_ayf_part1_time: 3,
  mwb_ayf_part1_type: "Starting a Conversation",
  mwb_ayf_part1_title: "4. Starting a Conversation",
  mwb_ayf_part2: "",
  mwb_ayf_part3: "",
  mwb_song_middle: "46",
  mwb_lc_count: 1,
  mwb_lc_part1: "The Generous Person Will Be Blessed",
  mwb_lc_part1_time: 15,
  mwb_lc_part1_content: "Discussion by an elder.",
  mwb_lc_part1_title: "7. The Generous Person Will Be Blessed",
  mwb_lc_cbs: "lfb lessons 32-33",
  mwb_lc_cbs_title: "8. Congregation Bible Study",
  mwb_song_conclude: "137",
};

function midweekAssignment(
  assignment_id: MidweekMeetingAssignment["assignment_id"],
  participantId = "pub-1",
  week: string = weekId,
): MidweekMeetingAssignment {
  return {
    assignment_id,
    participant_id: participantId,
    congregation_id: congregationId,
    week_id: week,
  };
}

function weekendAssignment(
  assignment_id: WeekendAssignment["assignment_id"],
  participantId = "pub-1",
  week: string = weekId,
): WeekendAssignment {
  return {
    assignment_id,
    participant_id: participantId,
    congregation_id: congregationId,
    week_id: week,
  };
}

function speakerAssignment(week: string, speakerId = "pub-1"): SpeakerAssignment {
  return { week_id: week, speaker_id: speakerId, congregation_id: congregationId };
}

test("welcome name prefers display_name and falls back to first_name", () => {
  expect(getWelcomeName({ first_name: "Alice", last_name: "Smith", display_name: "Ally" })).toBe(
    "Ally",
  );
  expect(getWelcomeName({ first_name: "Alice", last_name: "Smith" })).toBe("Alice");
  expect(getWelcomeName({ first_name: "Alice", last_name: "Smith", display_name: "   " })).toBe(
    "Alice",
  );
  expect(getWelcomeName({ first_name: "  ", last_name: "Smith" })).toBeNull();
  expect(getWelcomeName(null)).toBeNull();
  expect(getWelcomeName(undefined)).toBeNull();
});

test("renders the logo and a plain welcome when no publisher is selected", async () => {
  const store = await createSettingsStore({ name: nextStoreName() });
  try {
    await store.updateSettings({ congregationId: "c1" });

    const markup = renderToStaticMarkup(createElement(HomepageView, { store }));
    expect(markup).toContain('src="/logo.svg"');
    expect(markup).toContain("Welcome");
    expect(markup).not.toContain("Welcome,");
  } finally {
    await store.close();
  }
});

test("greets the selected publisher by name", async () => {
  const storageMap = new Map<string, string>();
  const collection = createCollection(
    localStorageCollectionOptions<Publisher, string>({
      id: `publishers_homepage_test_${Date.now()}`,
      storageKey: `publishers_homepage_test_${Date.now()}`,
      storage: {
        getItem: (key) => storageMap.get(key) ?? null,
        setItem: (key, value) => {
          storageMap.set(key, value);
        },
        removeItem: (key) => {
          storageMap.delete(key);
        },
      },
      getKey: (publisher) => publisher.id ?? "",
      startSync: true,
    }),
  );

  const store = await createSettingsStore({ name: nextStoreName() });
  try {
    await collection.preload();
    const tx = collection.insert([
      { id: "p1", first_name: "Alice", last_name: "Smith", congregation_id: "c1" },
      { id: "p2", first_name: "Bob", last_name: "Zulu", congregation_id: "c1" },
    ]);
    await tx.isPersisted.promise;
    await store.updateSettings({ congregationId: "c1", publisherId: "p1" });

    const markup = renderToStaticMarkup(
      createElement(HomepageView, {
        store,
        publisherCollection: collection as unknown as PublisherCollection,
      }),
    );
    expect(markup).toContain("Welcome, Alice");
    expect(markup).not.toContain("Zulu");
  } finally {
    await store.close();
    await collection.cleanup().catch(() => {});
  }
});

test("buildUpcomingAssignments labels midweek parts from meeting data", () => {
  const assignments = buildUpcomingAssignments({
    midweek: [
      midweekAssignment("chairman_1"),
      midweekAssignment("school_1_apply_1"),
      midweekAssignment("school_1_assistant_1"),
      midweekAssignment("school_2_bible_reading"),
      midweekAssignment("cbs_reader"),
    ],
    midweekMeetingData: [meeting],
  });

  const byId = new Map(assignments.map((a) => [a.id, a.label]));
  expect(byId.get(`${weekId}-midweek-chairman_1`)).toBe("Chairman (Midweek)");
  expect(byId.get(`${weekId}-midweek-school_1_apply_1`)).toBe("4. Starting a Conversation (3 min)");
  // Assistants and readers have no program item; fall back to the id.
  expect(byId.get(`${weekId}-midweek-school_1_assistant_1`)).toBe("School 1 Assistant 1");
  expect(byId.get(`${weekId}-midweek-cbs_reader`)).toBe("Cbs Reader");
  // Auxiliary-school readers share the main hall part title.
  expect(byId.get(`${weekId}-midweek-school_2_bible_reading`)).toBe("3. Bible Reading");
});

test("buildUpcomingAssignments labels weekend roles and public talks", () => {
  const assignments = buildUpcomingAssignments({
    weekend: [weekendAssignment("chairman"), weekendAssignment("reader")],
    speaker: [speakerAssignment(weekId)],
  });

  const byId = new Map(assignments.map((a) => [a.id, a.label]));
  expect(byId.get(`${weekId}-weekend-chairman`)).toBe("Chairman (Weekend)");
  expect(byId.get(`${weekId}-weekend-reader`)).toBe("Reader (Watchtower)");
  expect(byId.get(`${weekId}-speaker-${congregationId}`)).toBe("Public Talk");
});

test("buildUpcomingAssignments merges and sorts all types by week", () => {
  const assignments = buildUpcomingAssignments({
    midweek: [midweekAssignment("prayer_1", "pub-1", "2025-11-17")],
    weekend: [weekendAssignment("chairman", "pub-1", "2025-11-03")],
    speaker: [speakerAssignment("2025-11-10")],
  });

  expect(assignments.map((a) => a.weekId)).toEqual(["2025-11-03", "2025-11-10", "2025-11-17"]);
});

test("does not render the assignments accordion without a selected publisher", async () => {
  const store = await createSettingsStore({ name: nextStoreName() });
  try {
    await store.updateSettings({ congregationId });

    const markup = renderToStaticMarkup(createElement(HomepageView, { store }));
    expect(markup).not.toContain("Assignments");
  } finally {
    await store.close();
  }
});

function memoryCollection<T extends Record<string, unknown>>(
  name: string,
  getKey: (row: T) => string,
  rows: T[],
) {
  const storageMap = new Map<string, string>();
  const collection = createCollection(
    localStorageCollectionOptions<T, string>({
      id: name,
      storageKey: name,
      storage: {
        getItem: (key) => storageMap.get(key) ?? null,
        setItem: (key, value) => {
          storageMap.set(key, value);
        },
        removeItem: (key) => {
          storageMap.delete(key);
        },
      },
      getKey,
      startSync: true,
    }),
  );
  return { collection, rows };
}

test("renders the next 3 upcoming assignments for the selected publisher", async () => {
  const thisWeek = currentWeekId();
  const nextWeek = shiftWeekId(thisWeek, 1);
  const laterWeek = shiftWeekId(thisWeek, 2);
  const latestWeek = shiftWeekId(thisWeek, 3);

  const publisher = memoryCollection<Publisher>(
    `publishers_homepage_assignments_${Date.now()}`,
    (p) => p.id ?? "",
    [{ id: "pub-1", first_name: "Alice", last_name: "Smith", congregation_id: congregationId }],
  );
  const midweek = memoryCollection<MidweekMeetingAssignment>(
    `midweek_homepage_assignments_${Date.now()}`,
    (a) => `${a.week_id}:${a.assignment_id}:${a.participant_id}`,
    [
      midweekAssignment("chairman_1", "pub-1", thisWeek),
      midweekAssignment("school_1_apply_1", "pub-1", nextWeek),
      midweekAssignment("treasures", "pub-2", thisWeek),
    ],
  );
  const meetingData = memoryCollection<MidweekMeetingData>(
    `meeting_data_homepage_assignments_${Date.now()}`,
    (m) => m.week_id,
    [
      { ...meeting, week_id: thisWeek },
      { ...meeting, week_id: nextWeek },
    ],
  );
  const weekend = memoryCollection<WeekendAssignment>(
    `weekend_homepage_assignments_${Date.now()}`,
    (a) => `${a.week_id}:${a.assignment_id}:${a.participant_id}`,
    [weekendAssignment("reader", "pub-1", laterWeek)],
  );
  const speaker = memoryCollection<SpeakerAssignment>(
    `speaker_homepage_assignments_${Date.now()}`,
    (a) => `${a.week_id}:${a.congregation_id}:${a.speaker_id}`,
    [speakerAssignment(latestWeek)],
  );

  const store = await createSettingsStore({ name: nextStoreName() });
  try {
    await Promise.all([
      publisher.collection.preload(),
      midweek.collection.preload(),
      meetingData.collection.preload(),
      weekend.collection.preload(),
      speaker.collection.preload(),
    ]);
    await Promise.all(
      [
        publisher.collection.insert(publisher.rows),
        midweek.collection.insert(midweek.rows),
        meetingData.collection.insert(meetingData.rows),
        weekend.collection.insert(weekend.rows),
        speaker.collection.insert(speaker.rows),
      ].map((tx) => tx.isPersisted.promise),
    );
    await store.updateSettings({ congregationId, publisherId: "pub-1" });

    const markup = renderToStaticMarkup(
      createElement(HomepageView, {
        store,
        publisherCollection: publisher.collection as unknown as PublisherCollection,
        assignmentCollections: {
          midweekAssignments: midweek.collection as unknown as MidweekAssignmentCollection,
          midweekMeetingData: meetingData.collection as unknown as MidweekMeetingDataCollection,
          weekendAssignments: weekend.collection as unknown as WeekendAssignmentCollection,
          speakerAssignments: speaker.collection as unknown as SpeakerAssignmentCollection,
        },
      }),
    );

    expect(markup).toContain("Assignments");
    expect(markup).toContain("Chairman (Midweek)");
    expect(markup).toContain("4. Starting a Conversation (3 min)");
    expect(markup).toContain("Reader (Watchtower)");
    // Only the next 3 are shown; the later public talk is cut off.
    expect(markup).not.toContain("Public Talk");
    // Another publisher's assignment is excluded.
    expect(markup).not.toContain("A Story of Unfailing Love");
  } finally {
    await store.close();
    for (const { collection } of [publisher, midweek, meetingData, weekend, speaker]) {
      await collection.cleanup().catch(() => {});
    }
  }
});

function dayOffset(days: number): string {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return formatWeekId(date);
}

function makeHomeEvent(
  id: string,
  name: string,
  start_date: string,
  end_date: string | null = null,
): EventRow {
  return {
    id,
    congregation_id: congregationId,
    name,
    description: "",
    address: "",
    coordinates: null,
    all_day: true,
    start_date,
    start_time: null,
    end_date,
    end_time: null,
    type: "other",
    details: null,
  };
}

test("renders the next 3 upcoming events in the events accordion", async () => {
  const events = memoryCollection<EventRow>(`events_homepage_test_${Date.now()}`, (e) => e.id, [
    makeHomeEvent("11111111-1111-4111-8111-111111111111", "Past Picnic", dayOffset(-7)),
    makeHomeEvent("22222222-2222-4222-8222-222222222222", "Working Bee", dayOffset(2)),
    makeHomeEvent("33333333-3333-4333-8333-333333333333", "Hall Renovation", dayOffset(9)),
    makeHomeEvent("44444444-4444-4444-8444-444444444444", "Convention", dayOffset(30)),
    makeHomeEvent("55555555-5555-4555-8555-555555555555", "Distant Social", dayOffset(60)),
    // A multi-day event already in progress still counts as upcoming.
    makeHomeEvent(
      "66666666-6666-4666-8666-666666666666",
      "Ongoing Assembly",
      dayOffset(-1),
      dayOffset(1),
    ),
  ]);

  const store = await createSettingsStore({ name: nextStoreName() });
  try {
    await events.collection.preload();
    await events.collection.insert(events.rows).isPersisted.promise;
    await store.updateSettings({ congregationId });

    const markup = renderToStaticMarkup(
      createElement(HomepageView, {
        store,
        eventCollection: events.collection as unknown as EventCollection,
      }),
    );

    expect(markup).toContain("Events");
    expect(markup).toContain("Ongoing Assembly");
    expect(markup).toContain("Working Bee");
    expect(markup).toContain("Hall Renovation");
    // Only the next 3 are shown.
    expect(markup).not.toContain("Convention");
    expect(markup).not.toContain("Distant Social");
    // Finished events are excluded.
    expect(markup).not.toContain("Past Picnic");
  } finally {
    await store.close();
    await events.collection.cleanup().catch(() => {});
  }
});

test("hides the events accordion when there are no upcoming events", async () => {
  const events = memoryCollection<EventRow>(
    `events_homepage_empty_test_${Date.now()}`,
    (e) => e.id,
    [makeHomeEvent("77777777-7777-4777-8777-777777777777", "Past Picnic", dayOffset(-7))],
  );

  const store = await createSettingsStore({ name: nextStoreName() });
  try {
    await events.collection.preload();
    await events.collection.insert(events.rows).isPersisted.promise;
    await store.updateSettings({ congregationId });

    const markup = renderToStaticMarkup(
      createElement(HomepageView, {
        store,
        eventCollection: events.collection as unknown as EventCollection,
      }),
    );

    expect(markup).not.toContain("Events");
    expect(markup).not.toContain("Past Picnic");
  } finally {
    await store.close();
    await events.collection.cleanup().catch(() => {});
  }
});

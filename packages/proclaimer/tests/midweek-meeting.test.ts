import { expect, test } from "vite-plus/test";

import type { EventRow } from "../src/feature/event/index.ts";
import {
  assistantAssignmentIdFor,
  buildMeetingProgram,
  computeAssignmentStats,
  eligiblePublishers,
  midweekMeetingAssignmentIds,
  participationAssignmentIds,
  participationTypeMap,
  participationTypesByPublisher,
  partnerAssignmentIdFor,
  sortPublishersByStats,
  statLabelFor,
  type MidweekMeetingAssignment,
  type MidweekMeetingData,
} from "../src/feature/midweek-meeting/index.ts";
import type { Publisher } from "../src/feature/publisher/index.ts";
import {
  currentWeekId,
  dateRangeOverlapsWeek,
  formatWeekId,
  isWeekId,
  mondayOf,
  parseWeekId,
  relativeWeekLabel,
  shiftWeekId,
  weekDisplayLabel,
  weekIdOf,
  weekRangeLabel,
  weeksBetween,
} from "../src/util/week.ts";

const meeting: MidweekMeetingData = {
  week_id: "2025-11-03",
  mwb_week_date_locale: "NOVEMBER 3-9",
  mwb_weekly_bible_reading: "SONG OF SOLOMON 1-2",
  mwb_song_first: 132,
  mwb_tgw_talk: "A Story of Unfailing Love",
  mwb_tgw_talk_title: "1. A Story of Unfailing Love",
  mwb_tgw_gems_title: "2. Spiritual Gems",
  mwb_tgw_bread: "Ca 2:1-17 (th study 12)",
  mwb_tgw_bread_title: "3. Bible Reading",
  mwb_ayf_count: 3,
  mwb_ayf_part1: "HOUSE TO HOUSE. Share a truth. (lmd lesson 1 point 3)",
  mwb_ayf_part1_time: 3,
  mwb_ayf_part1_type: "Starting a Conversation",
  mwb_ayf_part1_title: "4. Starting a Conversation",
  mwb_ayf_part2: "HOUSE TO HOUSE. Share a truth. (lmd lesson 9 point 3)",
  mwb_ayf_part2_time: 4,
  mwb_ayf_part2_type: "Following Up",
  mwb_ayf_part2_title: "5. Following Up",
  mwb_ayf_part3: "lff lesson 18 intro and points 1-3 (th study 8)",
  mwb_ayf_part3_time: 5,
  mwb_ayf_part3_type: "Making Disciples",
  mwb_ayf_part3_title: "6. Making Disciples",
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

const congregationId = "7b15d4e5-d4fa-4eb4-a276-3790b7c4897b";

const publishers: Publisher[] = [
  { id: "pub-1", first_name: "Patrick", last_name: "Gough", congregation_id: congregationId },
  {
    id: "pub-2",
    first_name: "Cherie",
    last_name: "Fisher",
    display_name: "Cher",
    congregation_id: congregationId,
  },
  { id: "overseer-1", first_name: "David", last_name: "Overseer", congregation_id: congregationId },
];

function assignment(
  assignment_id: MidweekMeetingAssignment["assignment_id"],
  participant_id: string,
): MidweekMeetingAssignment {
  return { assignment_id, participant_id, congregation_id: congregationId, week_id: "2025-11-03" };
}

function event(overrides: Partial<EventRow>): EventRow {
  return {
    id: "evt-1",
    congregation_id: congregationId,
    name: "",
    description: "",
    address: "",
    coordinates: null,
    all_day: true,
    start_date: "2025-11-03",
    start_time: null,
    end_date: null,
    end_time: null,
    type: "other",
    details: null,
    ...overrides,
  };
}

test("week ids are Mondays and support arithmetic", () => {
  expect(weekIdOf(new Date(2025, 10, 4))).toBe("2025-11-03"); // Tuesday
  expect(weekIdOf(new Date(2025, 10, 9))).toBe("2025-11-03"); // Sunday
  expect(weekIdOf(new Date(2025, 10, 10))).toBe("2025-11-10"); // next Monday
  expect(currentWeekId(new Date(2025, 10, 9))).toBe("2025-11-03");
  expect(formatWeekId(mondayOf(new Date(2025, 10, 5)))).toBe("2025-11-03");
  expect(shiftWeekId("2025-11-03", 1)).toBe("2025-11-10");
  expect(shiftWeekId("2025-11-03", -2)).toBe("2025-10-20");
  expect(shiftWeekId("2025-11-03", 0)).toBe("2025-11-03");
  expect(weeksBetween("2025-11-03", "2025-11-24")).toBe(3);
  expect(weeksBetween("2025-11-24", "2025-11-03")).toBe(-3);
  expect(isWeekId("2025-11-03")).toBe(true);
  expect(isWeekId("11-03-2025")).toBe(false);
  expect(isWeekId(undefined)).toBe(false);
  expect(parseWeekId("2025-11-03")).toEqual(new Date(2025, 10, 3));
  // Date constructor rolls out-of-range components over instead of failing.
  expect(parseWeekId("2025-13-45")).toBeNull();
  expect(parseWeekId("2025-11-31")).toBeNull();
});

test("week labels describe the week and its relative position", () => {
  expect(weekRangeLabel("2025-11-03")).toMatch(/November 3.+9, 2025/);
  expect(weekRangeLabel("2025-09-29")).toMatch(/September 29.+October 5, 2025/);
  expect(weekRangeLabel("2025-11-03", { includeYear: false })).toMatch(/^November 3.+9$/);
  expect(weekRangeLabel("2025-09-29", { includeYear: false })).toMatch(/^September 29.+October 5$/);
  const now = new Date(2025, 10, 5);
  expect(relativeWeekLabel("2025-11-03", now)).toBe("This week");
  expect(relativeWeekLabel("2025-11-10", now)).toBe("Next week");
  expect(relativeWeekLabel("2025-10-27", now)).toBe("Last week");
  expect(relativeWeekLabel("2025-12-01", now)).toBeUndefined();
  expect(weekDisplayLabel("2025-11-03", now)).toBe("November 3 – 9 (This week)");
  expect(weekDisplayLabel("2025-11-10", now)).toBe("November 10 – 16 (Next week)");
  expect(weekDisplayLabel("2025-09-29", now)).toBe("September 29 – October 5");
});

test("dateRangeOverlapsWeek detects events touching the week", () => {
  expect(dateRangeOverlapsWeek("2025-11-03", "2025-11-03")).toBe(true);
  expect(dateRangeOverlapsWeek("2025-11-03", "2025-11-09")).toBe(true);
  expect(dateRangeOverlapsWeek("2025-11-03", "2025-11-08", "2025-11-12")).toBe(true);
  expect(dateRangeOverlapsWeek("2025-11-03", "2025-11-01", "2025-11-02")).toBe(false);
  expect(dateRangeOverlapsWeek("2025-11-03", "2025-11-10")).toBe(false);
  expect(dateRangeOverlapsWeek("bad", "2025-11-03")).toBe(false);
  // Week containing the US "fall back" DST Sunday (Nov 2, 2025): an event on the
  // last day still overlaps the week even though it has 25 hours that day.
  expect(dateRangeOverlapsWeek("2025-10-27", "2025-11-02")).toBe(true);
  expect(dateRangeOverlapsWeek("2025-10-27", "2025-11-01", "2025-11-02")).toBe(true);
});

test("buildMeetingProgram maps workbook data into meeting sections", () => {
  const program = buildMeetingProgram({ weekId: "2025-11-03", meeting });

  expect(program.hasMeetingData).toBe(true);
  expect(program.bibleReading).toBe("SONG OF SOLOMON 1-2");
  expect(program.weekLabel).toMatch(/^November 3.+9$/);

  const [opening, treasures, ministry, living] = program.sections;
  expect(opening.id).toBe("opening");
  expect(opening.blocks[0].items.map((i) => i.id)).toEqual([
    "song_first",
    "prayer_1",
    "chairman_1",
  ]);
  expect(opening.blocks[0].items[0].title).toBe("Song 132");

  expect(treasures.color).toBe("jw_slate");
  const treasureParts = treasures.blocks[0].items;
  expect(treasureParts.map((i) => i.partNumber)).toEqual([1, 2, 3]);
  expect(treasureParts[0].title).toBe("A Story of Unfailing Love");
  expect(treasureParts[2].subtitle).toBe("Ca 2:1-17 (th study 12)");

  expect(ministry.color).toBe("jw_brown");
  expect(ministry.blocks).toHaveLength(1);
  expect(ministry.blocks[0].label).toBeUndefined();
  const applyParts = ministry.blocks[0].items;
  expect(applyParts.map((i) => i.partNumber)).toEqual([4, 5, 6]);
  expect(applyParts[0].minutes).toBe(3);
  expect(applyParts[0].subtitle).toContain("HOUSE TO HOUSE");

  expect(living.color).toBe("jw_red");
  const livingItems = living.blocks[0].items;
  expect(livingItems[0].title).toBe("Song 46");
  const cbs = livingItems.find((i) => i.id === "cbs_conductor");
  expect(cbs?.subtitle).toBe("lfb lessons 32-33");
  expect(livingItems[livingItems.length - 1].id).toBe("prayer_2");
  expect(livingItems.some((i) => i.id === "song_conclude" && i.title === "Song 137")).toBe(true);
});

test("buildMeetingProgram resolves assignees, assistants and extra schools", () => {
  const program = buildMeetingProgram({
    weekId: "2025-11-03",
    meeting,
    publishers,
    assignments: [
      assignment("chairman_1", "pub-1"),
      assignment("school_1_apply_1", "pub-2"),
      assignment("school_1_assistant_1", "pub-1"),
      assignment("chairman_2", "pub-1"),
      assignment("school_2_bible_reading", "pub-2"),
      assignment("school_2_apply_1", "pub-1"),
    ],
  });

  const opening = program.sections[0];
  expect(opening.blocks[0].items.find((i) => i.id === "chairman_1")?.assignee).toBe(
    "Patrick Gough",
  );

  const bibleReading = program.sections[1].blocks[0].items.find(
    (i) => i.id === "school_1_bible_reading",
  );
  expect(bibleReading?.extraAssignees).toEqual([
    { label: "Auxiliary Classroom 1", name: "Cher Fisher" },
  ]);

  const ministry = program.sections[2];
  expect(ministry.blocks).toHaveLength(2);
  expect(ministry.blocks[0].label).toBe("Main Hall");
  expect(ministry.blocks[1].label).toBe("Auxiliary Classroom 1");
  expect(ministry.blocks[1].items[0].title).toBe("Counselor");
  expect(ministry.blocks[1].items[0].assignee).toBe("Patrick Gough");
  const school2Part = ministry.blocks[1].items.find((i) => i.id === "school_2_apply_1");
  expect(school2Part?.assignee).toBe("Patrick Gough");

  const mainPart = ministry.blocks[0].items.find((i) => i.id === "school_1_apply_1");
  expect(mainPart?.assignee).toBe("Cher Fisher");
  expect(mainPart?.assistant).toBe("Patrick Gough");
  expect(mainPart?.assistantLabel).toBe("Assistant");
});

test("buildMeetingProgram ignores assignments from other weeks", () => {
  const program = buildMeetingProgram({
    weekId: "2025-11-03",
    meeting,
    publishers,
    assignments: [
      { ...assignment("chairman_1", "pub-1"), week_id: "2025-11-10" },
      { ...assignment("chairman_2", "pub-1"), week_id: "2025-11-10" },
      assignment("prayer_1", "pub-2"),
    ],
  });

  const opening = program.sections[0].blocks[0].items;
  expect(opening.find((i) => i.id === "chairman_1")?.assignee).toBeUndefined();
  expect(opening.find((i) => i.id === "prayer_1")?.assignee).toBe("Cher Fisher");
  // A stray next-week school assignment must not spawn an extra school block.
  expect(program.sections[2].blocks).toHaveLength(1);
});

test("buildMeetingProgram falls back when optional part titles are missing", () => {
  const partial: MidweekMeetingData = {
    ...meeting,
    mwb_tgw_talk_title: null,
    mwb_tgw_bread_title: null,
    mwb_ayf_part1_title: null,
    mwb_lc_part1_title: null,
    mwb_lc_cbs_title: null,
  };
  const program = buildMeetingProgram({ weekId: "2025-11-03", meeting: partial });

  const treasures = program.sections[1].blocks[0].items;
  expect(treasures.find((i) => i.id === "treasures")?.title).toBe("A Story of Unfailing Love");
  expect(treasures.find((i) => i.id === "school_1_bible_reading")?.title).toBe("Bible Reading");

  const ministry = program.sections[2].blocks[0].items;
  expect(ministry.find((i) => i.id === "school_1_apply_1")?.title).toBe("Starting a Conversation");

  const living = program.sections[3].blocks[0].items;
  expect(living.find((i) => i.id === "living_1")?.title).toBe(
    "The Generous Person Will Be Blessed",
  );
  expect(living.find((i) => i.id === "cbs_conductor")?.title).toBe("Congregation Bible Study");
});

test("buildMeetingProgram replaces the program for assembly and convention weeks", () => {
  for (const type of ["circuit_assembly", "convention"] as const) {
    const program = buildMeetingProgram({
      weekId: "2025-11-03",
      meeting,
      events: [event({ type, start_date: "2025-11-08", name: "Some Event" })],
    });
    expect(program.event?.type).toBe(type);
    expect(program.event?.replacesMeeting).toBe(true);
    expect(program.event?.name).toBe("Some Event");
    // Meeting parts are still built so callers can inspect them, but the view
    // renders the banner instead.
    expect(program.sections).toHaveLength(4);
  }
});

test("buildMeetingProgram applies the circuit visit talk in place of the CBS", () => {
  const program = buildMeetingProgram({
    weekId: "2025-11-03",
    meeting,
    publishers,
    events: [
      event({
        type: "circuit_visit",
        name: "overseer-1",
        start_date: "2025-11-04",
        end_date: "2025-11-09",
        details: {
          midweek_theme: "Give Them Extraordinary Consideration in Love",
          weekend_theme: "",
          pioneer_meeting_time: null,
        },
      }),
    ],
  });

  expect(program.event?.type).toBe("circuit_visit");
  expect(program.event?.replacesMeeting).toBe(false);
  expect(program.event?.overseerName).toBe("David Overseer");

  const livingItems = program.sections[3].blocks[0].items;
  expect(livingItems.find((i) => i.id === "cbs_conductor")).toBeUndefined();
  expect(livingItems.find((i) => i.id === "prayer_2")).toBeUndefined();
  const theme = livingItems.find((i) => i.id === "circuit_visit_theme");
  expect(theme?.title).toBe("Give Them Extraordinary Consideration in Love");
  expect(theme?.assignee).toBe("David Overseer");
});

test("buildMeetingProgram handles weeks without meeting data", () => {
  const program = buildMeetingProgram({ weekId: "2025-11-03" });
  expect(program.hasMeetingData).toBe(false);
  expect(program.bibleReading).toBeUndefined();
  expect(program.sections).toHaveLength(0);
});

test("participationTypeMap maps every assignment id to a participation type", () => {
  for (const id of midweekMeetingAssignmentIds) {
    expect(participationTypeMap[id]).toBeDefined();
  }
  expect(participationTypeMap.school_1_apply_2).toBe("apply");
  expect(participationTypeMap.school_2_assistant_3).toBe("assistant");
  expect(participationTypeMap.chairman_2).toBe("counselor");
  expect(participationTypeMap.cbs_reader).toBe("cbs_reader");
});

test("participationAssignmentIds inverts the type map", () => {
  for (const ids of Object.values(participationAssignmentIds)) {
    expect(Array.isArray(ids)).toBe(true);
  }
  expect(participationAssignmentIds.apply).toContain("school_1_apply_1");
  expect(participationAssignmentIds.apply).toContain("school_3_apply_4");
  expect(participationAssignmentIds.prayer).toEqual(["prayer_1", "prayer_2"]);
});

test("assistantAssignmentIdFor pairs student parts with their assistant slot", () => {
  expect(assistantAssignmentIdFor("school_1_apply_1")).toBe("school_1_assistant_1");
  expect(assistantAssignmentIdFor("school_3_apply_4")).toBe("school_3_assistant_4");
  expect(assistantAssignmentIdFor("cbs_conductor")).toBe("cbs_reader");
  expect(assistantAssignmentIdFor("prayer_1")).toBeUndefined();
  expect(assistantAssignmentIdFor("school_1_assistant_1")).toBeUndefined();
});

test("partnerAssignmentIdFor pairs both directions with prepositions", () => {
  expect(partnerAssignmentIdFor("school_2_apply_3")).toEqual({
    assignmentId: "school_2_assistant_3",
    preposition: "with",
  });
  expect(partnerAssignmentIdFor("school_2_assistant_3")).toEqual({
    assignmentId: "school_2_apply_3",
    preposition: "for",
  });
  expect(partnerAssignmentIdFor("cbs_conductor")).toEqual({
    assignmentId: "cbs_reader",
    preposition: "with",
  });
  expect(partnerAssignmentIdFor("cbs_reader")).toEqual({
    assignmentId: "cbs_conductor",
    preposition: "for",
  });
  expect(partnerAssignmentIdFor("treasures")).toBeUndefined();
});

test("computeAssignmentStats finds the nearest assignment in either direction", () => {
  const assignments = [
    { ...assignment("school_1_apply_1", "pub-1"), week_id: "2025-10-13" },
    { ...assignment("school_2_apply_3", "pub-1"), week_id: "2025-11-17" },
    { ...assignment("living_1", "pub-1"), week_id: "2025-10-27" },
    { ...assignment("prayer_1", "pub-2"), week_id: "2025-10-27" },
  ];

  const applyStats = computeAssignmentStats(assignments, ["apply"], "2025-11-03");
  // Nearest "apply" assignment is 2 weeks away either side.
  expect(applyStats.get("pub-1")?.weeksAwayClosest).toBe(2);
  expect(applyStats.has("pub-2")).toBe(false);

  const livingStats = computeAssignmentStats(assignments, ["living"], "2025-11-03");
  expect(livingStats.get("pub-1")?.weeksAwayClosest).toBe(1);

  const combined = computeAssignmentStats(assignments, ["apply", "prayer"], "2025-11-03");
  expect(combined.get("pub-2")?.weeksAwayClosest).toBe(1);
});

test("eligiblePublishers filters by participation, archive and gender", () => {
  const roster: Publisher[] = [
    { ...publishers[0], gender: "male" },
    { ...publishers[1], gender: "female" },
    { id: "pub-3", first_name: "Old", last_name: "Timer", archived_at: "2020-01-01" },
    { id: "pub-4", first_name: "No", last_name: "Part", gender: "male" },
  ];
  const participationTypes = participationTypesByPublisher([
    { participant_id: "pub-1", participation_id: "apply", is_participant: true },
    { participant_id: "pub-2", participation_id: "apply", is_participant: true },
    { participant_id: "pub-2", participation_id: "assistant", is_participant: true },
    { participant_id: "pub-3", participation_id: "apply", is_participant: true },
    { participant_id: "pub-4", participation_id: "apply", is_participant: false },
  ]);

  expect(eligiblePublishers(roster, participationTypes, "apply", null).map((p) => p.id)).toEqual([
    "pub-1",
    "pub-2",
  ]);
  expect(
    eligiblePublishers(roster, participationTypes, "apply", "female").map((p) => p.id),
  ).toEqual(["pub-2"]);
  expect(
    eligiblePublishers(roster, participationTypes, "assistant", null).map((p) => p.id),
  ).toEqual(["pub-2"]);
});

test("sortPublishersByStats orders longest-away first with fallbacks", () => {
  const roster: Publisher[] = [publishers[0], publishers[1], publishers[2]];
  const stats = computeAssignmentStats(
    [
      { ...assignment("treasures", "pub-2"), week_id: "2025-06-02" },
      { ...assignment("treasures", "overseer-1"), week_id: "2025-10-27" },
    ],
    ["treasures"],
    "2025-11-03",
  );
  const sorted = sortPublishersByStats(roster, stats);
  expect(sorted.map((p) => p.id)).toEqual(["pub-1", "pub-2", "overseer-1"]);
  expect(statLabelFor("pub-2", stats)).toBe("22w");
  expect(statLabelFor("overseer-1", stats)).toBe("1w");
  expect(statLabelFor("pub-1", stats)).toBeUndefined();
});

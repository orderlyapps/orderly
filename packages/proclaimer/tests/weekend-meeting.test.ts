import { expect, test } from "vite-plus/test";

import type { Congregation } from "../src/feature/congregation/index.ts";
import type { EventRow } from "../src/feature/event/index.ts";
import type { Publisher } from "../src/feature/publisher/index.ts";
import {
  buildWeekendProgram,
  type SpeakerAssignment,
  type TalkOutline,
  type WeekendAssignment,
} from "../src/feature/weekend-meeting/index.ts";

const weekId = "2025-11-03";
const congregationId = "7b15d4e5-d4fa-4eb4-a276-3790b7c4897b";
const otherCongregationId = "a9e2c1f0-1234-4abc-9def-1234567890ab";

const publishers: Publisher[] = [
  { id: "pub-chairman", first_name: "John", last_name: "Chair", congregation_id: congregationId },
  { id: "pub-reader", first_name: "Ray", last_name: "Read", congregation_id: congregationId },
  {
    id: "pub-local-speaker",
    first_name: "Sam",
    last_name: "Speak",
    congregation_id: congregationId,
  },
  {
    id: "pub-visiting",
    first_name: "Vic",
    last_name: "Tor",
    display_name: "Vic",
    congregation_id: otherCongregationId,
  },
  {
    id: "pub-outgoing",
    first_name: "Olive",
    last_name: "Out",
    congregation_id: congregationId,
  },
];

const congregations: Congregation[] = [
  { id: congregationId, name: "Home Congregation" },
  { id: otherCongregationId, name: "North Congregation" },
];

const outlines: TalkOutline[] = [{ id: "37", theme: "A Fine Theme" }];

function speakerAssignment(overrides: Partial<SpeakerAssignment>): SpeakerAssignment {
  return {
    week_id: weekId,
    speaker_id: "pub-local-speaker",
    congregation_id: congregationId,
    outline_id: "37",
    ...overrides,
  };
}

function assignment(
  assignment_id: WeekendAssignment["assignment_id"],
  participant_id: string,
): WeekendAssignment {
  return { assignment_id, participant_id, congregation_id: congregationId, week_id: weekId };
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
    start_date: weekId,
    start_time: null,
    end_date: null,
    end_time: null,
    type: "other",
    details: null,
    ...overrides,
  };
}

test("buildWeekendProgram maps the speaker, chairman and reader for the week", () => {
  const program = buildWeekendProgram({
    weekId,
    congregationId,
    speakerAssignments: [
      speakerAssignment({ speaker_id: "pub-visiting", outline_id: "37" }),
      // Another congregation's talk must not leak into our program.
      speakerAssignment({
        speaker_id: "pub-visiting",
        congregation_id: otherCongregationId,
        outline_id: "37",
      }),
    ],
    weekendAssignments: [
      assignment("chairman", "pub-chairman"),
      assignment("reader", "pub-reader"),
    ],
    outlines,
    publishers,
    congregations,
  });

  expect(program.hasMeetingData).toBe(true);
  expect(program.weekLabel).toMatch(/^November 3.+9$/);

  const meeting = program.sections.find((section) => section.id === "meeting");
  expect(meeting).toBeDefined();
  const items = meeting?.blocks[0].items ?? [];
  expect(items.map((item) => item.id)).toEqual(["chairman", "public_talk", "reader"]);

  expect(items[0].assignee).toBe("John Chair");

  const talk = items[1];
  expect(talk.partNumber).toBe(37);
  expect(talk.title).toBe("A Fine Theme");
  expect(talk.assignee).toBe("Vic Tor (North Congregation)");
  expect(talk.extraAssignees).toBeUndefined();

  expect(items[2].assignee).toBe("Ray Read");
});

test("buildWeekendProgram omits the congregation for a local speaker", () => {
  const program = buildWeekendProgram({
    weekId,
    congregationId,
    speakerAssignments: [speakerAssignment({ speaker_id: "pub-local-speaker" })],
    outlines,
    publishers,
    congregations,
  });

  const talk = program.sections[0].blocks[0].items.find((item) => item.id === "public_talk");
  expect(talk?.assignee).toBe("Sam Speak");
  expect(talk?.extraAssignees).toBeUndefined();
});

test("buildWeekendProgram lists our publishers speaking at other congregations", () => {
  const program = buildWeekendProgram({
    weekId,
    congregationId,
    speakerAssignments: [
      speakerAssignment({ speaker_id: "pub-visiting" }),
      speakerAssignment({
        speaker_id: "pub-outgoing",
        congregation_id: otherCongregationId,
      }),
    ],
    outlines,
    publishers,
    congregations,
  });

  const outgoing = program.sections.find((section) => section.id === "outgoing");
  expect(outgoing?.title).toBe("Outgoing Speakers");
  const items = outgoing?.blocks[0].items ?? [];
  expect(items).toHaveLength(1);
  expect(items[0].title).toBe("Olive Out");
  expect(items[0].partNumber).toBe(37);
  expect(items[0].subtitle).toBe("North Congregation");
  expect(items[0].note).toBe("A Fine Theme");
});

test("buildWeekendProgram ignores rows from other weeks", () => {
  const program = buildWeekendProgram({
    weekId,
    congregationId,
    speakerAssignments: [speakerAssignment({ week_id: "2025-11-10" })],
    weekendAssignments: [{ ...assignment("chairman", "pub-chairman"), week_id: "2025-11-10" }],
    publishers,
    congregations,
  });

  expect(program.hasMeetingData).toBe(false);
  expect(program.sections).toHaveLength(0);
});

test("buildWeekendProgram falls back to a plain public talk row without a speaker", () => {
  const program = buildWeekendProgram({
    weekId,
    congregationId,
    weekendAssignments: [assignment("chairman", "pub-chairman")],
    publishers,
  });

  const talk = program.sections[0].blocks[0].items.find((item) => item.id === "public_talk");
  expect(talk?.title).toBe("Public Talk");
  expect(talk?.partNumber).toBeUndefined();
  expect(talk?.assignee).toBeUndefined();
});

test("buildWeekendProgram replaces the program for assembly and convention weeks", () => {
  for (const type of ["circuit_assembly", "convention"] as const) {
    const program = buildWeekendProgram({
      weekId,
      congregationId,
      weekendAssignments: [assignment("chairman", "pub-chairman")],
      publishers,
      events: [event({ type, start_date: "2025-11-08", name: "Some Event" })],
    });
    expect(program.event?.type).toBe(type);
    expect(program.event?.replacesMeeting).toBe(true);
    expect(program.event?.name).toBe("Some Event");
  }
});

test("buildWeekendProgram uses the circuit overseer's weekend theme for the talk", () => {
  const program = buildWeekendProgram({
    weekId,
    congregationId,
    publishers,
    congregations,
    events: [
      event({
        type: "circuit_visit",
        name: "pub-chairman",
        start_date: "2025-11-04",
        end_date: "2025-11-09",
        details: {
          midweek_theme: "Midweek Theme",
          weekend_theme: "The Overseer's Weekend Talk",
          pioneer_meeting_time: null,
        },
      }),
    ],
  });

  expect(program.event?.type).toBe("circuit_visit");
  expect(program.event?.replacesMeeting).toBe(false);
  expect(program.event?.overseerName).toBe("John Chair");

  const talk = program.sections[0].blocks[0].items.find((item) => item.id === "public_talk");
  expect(talk?.title).toBe("The Overseer's Weekend Talk");
  expect(talk?.assignee).toBe("John Chair");
  expect(talk?.readOnly).toBe(true);
});

test("buildWeekendProgram handles weeks without meeting data", () => {
  const program = buildWeekendProgram({ weekId, congregationId });
  expect(program.hasMeetingData).toBe(false);
  expect(program.event).toBeUndefined();
  expect(program.sections).toHaveLength(0);
});

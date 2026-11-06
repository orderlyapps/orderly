import type { EventRow } from "../event/schema.ts";
import { findWeekEvent } from "../meeting/events.ts";
import type {
  MeetingEventInfo,
  MeetingProgramBlock,
  MeetingProgramItem,
  MeetingProgramSection,
} from "../meeting/types.ts";
import type { Publisher } from "../publisher/schema.ts";
import { relativeWeekLabel, weekRangeLabel } from "../../util/week.ts";
import type { MidweekMeetingAssignment, MidweekMeetingData } from "./schema.ts";

export type {
  MeetingEventInfo,
  MeetingItemKind,
  MeetingProgramBlock,
  MeetingProgramItem,
  MeetingProgramSection,
  MeetingSectionColor,
} from "../meeting/types.ts";

export interface MeetingProgram {
  weekId: string;
  weekLabel: string;
  relativeLabel?: string;
  /** Weekly bible reading, e.g. "SONG OF SOLOMON 1-2". */
  bibleReading?: string;
  event?: MeetingEventInfo;
  sections: MeetingProgramSection[];
  /** Meeting workbook data exists for this week. */
  hasMeetingData: boolean;
}

export interface BuildMeetingProgramInput {
  weekId: string;
  meeting?: MidweekMeetingData | null;
  assignments?: MidweekMeetingAssignment[];
  publishers?: Publisher[];
  events?: EventRow[];
  now?: Date;
}

const NUMBERED_TITLE_PATTERN = /^(\d+)\.\s*(.+)$/;

function splitNumberedTitle(title: string): { partNumber?: number; title: string } {
  const match = NUMBERED_TITLE_PATTERN.exec(title.trim());
  if (!match) {
    return { title: title.trim() };
  }
  return { partNumber: Number(match[1]), title: match[2].trim() };
}

function songLabel(song: string | number | null | undefined): string | undefined {
  if (song === null || song === undefined || song === "") {
    return undefined;
  }
  const text = String(song).trim();
  return /^\d+$/.test(text) ? `Song ${text}` : text;
}

function publisherName(publisher: Publisher | undefined): string | undefined {
  if (!publisher) {
    return undefined;
  }
  const first = publisher.display_name?.trim() || publisher.first_name;
  return `${first} ${publisher.last_name}`.trim();
}

const SCHOOL_COUNT = 3;

function schoolAssignmentPrefix(school: number): string {
  return `school_${school}_`;
}

function schoolHasAssignments(assignments: MidweekMeetingAssignment[], school: number): boolean {
  const prefix = schoolAssignmentPrefix(school);
  return assignments.some(
    (a) => a.assignment_id.startsWith(prefix) || a.assignment_id === `chairman_${school}`,
  );
}

export function buildMeetingProgram(input: BuildMeetingProgramInput): MeetingProgram {
  const { weekId, meeting, assignments = [], publishers = [], events, now } = input;

  const publisherById = new Map<string, Publisher>();
  for (const publisher of publishers) {
    if (publisher.id) {
      publisherById.set(publisher.id, publisher);
    }
  }

  const weekAssignments = assignments.filter((a) => a.week_id === weekId);
  const assignmentById = new Map<string, MidweekMeetingAssignment>();
  for (const assignment of weekAssignments) {
    assignmentById.set(assignment.assignment_id, assignment);
  }

  const resolveParticipant = (participantId: string | undefined): string | undefined =>
    participantId ? publisherName(publisherById.get(participantId)) : undefined;

  const assigneeFor = (assignmentId: string): string | undefined =>
    resolveParticipant(assignmentById.get(assignmentId)?.participant_id);

  const event = findWeekEvent(events, weekId, resolveParticipant);
  const circuitVisitTheme = event?.type === "circuit_visit" ? event.midweekTheme : undefined;

  const program: MeetingProgram = {
    weekId,
    weekLabel: weekRangeLabel(weekId, { includeYear: false }),
    relativeLabel: relativeWeekLabel(weekId, now),
    bibleReading: meeting?.mwb_weekly_bible_reading || undefined,
    event,
    sections: [],
    hasMeetingData: Boolean(meeting),
  };

  if (!meeting) {
    return program;
  }

  // Which schools actually run this week (school 1 always exists conceptually,
  // extra schools appear only when they have assignments).
  const extraSchools: number[] = [];
  for (let school = 2; school <= SCHOOL_COUNT; school++) {
    if (schoolHasAssignments(weekAssignments, school)) {
      extraSchools.push(school);
    }
  }
  const schoolNumbers = [1, ...extraSchools];
  const multipleSchools = schoolNumbers.length > 1;
  const schoolLabel = (school: number) =>
    school === 1 ? "Main Hall" : `Auxiliary Classroom ${school - 1}`;

  const openingItems: MeetingProgramItem[] = [
    {
      id: "song_first",
      kind: "song",
      title: songLabel(meeting.mwb_song_first) ?? "Song",
    },
    {
      id: "prayer_1",
      kind: "role",
      title: "Opening Prayer",
      assignee: assigneeFor("prayer_1"),
    },
    { id: "chairman_1", kind: "role", title: "Chairman", assignee: assigneeFor("chairman_1") },
  ];

  const treasuresItems: MeetingProgramItem[] = [];
  const talkTitle = meeting.mwb_tgw_talk_title || meeting.mwb_tgw_talk;
  if (talkTitle) {
    const { partNumber, title } = splitNumberedTitle(talkTitle);
    treasuresItems.push({
      id: "treasures",
      kind: "part",
      partNumber,
      title: title || meeting.mwb_tgw_talk,
      assignee: assigneeFor("treasures"),
    });
  }
  if (meeting.mwb_tgw_gems_title) {
    const { partNumber, title } = splitNumberedTitle(meeting.mwb_tgw_gems_title);
    treasuresItems.push({
      id: "gems",
      kind: "part",
      partNumber,
      title,
      assignee: assigneeFor("gems"),
    });
  }
  const breadTitle = meeting.mwb_tgw_bread_title || (meeting.mwb_tgw_bread ? "Bible Reading" : "");
  if (breadTitle) {
    const { partNumber, title } = splitNumberedTitle(breadTitle);
    const extraAssignees = extraSchools.map((school) => ({
      label: schoolLabel(school),
      name: assigneeFor(`school_${school}_bible_reading`),
    }));
    treasuresItems.push({
      id: "school_1_bible_reading",
      kind: "part",
      partNumber,
      title,
      subtitle: meeting.mwb_tgw_bread || undefined,
      assignee: assigneeFor("school_1_bible_reading"),
      extraAssignees: extraAssignees.length > 0 ? extraAssignees : undefined,
    });
  }

  // Ministry parts are shared by every school; each school gets its own assignees.
  const ministryParts: {
    index: number;
    partNumber?: number;
    title: string;
    subtitle?: string;
    minutes?: number;
  }[] = [];
  for (let index = 1; index <= 4; index++) {
    const rawTitle =
      meeting[`mwb_ayf_part${index}_title` as keyof MidweekMeetingData] ||
      meeting[`mwb_ayf_part${index}_type` as keyof MidweekMeetingData];
    if (typeof rawTitle !== "string" || !rawTitle) {
      continue;
    }
    const detail = meeting[`mwb_ayf_part${index}` as keyof MidweekMeetingData];
    const minutes = meeting[`mwb_ayf_part${index}_time` as keyof MidweekMeetingData];
    const { partNumber, title } = splitNumberedTitle(rawTitle);
    ministryParts.push({
      index,
      partNumber,
      title,
      subtitle: typeof detail === "string" && detail ? detail : undefined,
      minutes: typeof minutes === "number" ? minutes : undefined,
    });
  }

  const ministryBlocks: MeetingProgramBlock[] = schoolNumbers.map((school) => ({
    label: multipleSchools ? schoolLabel(school) : undefined,
    items: [
      ...(school > 1
        ? [
            {
              id: `chairman_${school}`,
              kind: "role" as const,
              title: "Counselor",
              assignee: assigneeFor(`chairman_${school}`),
            },
          ]
        : []),
      ...ministryParts.map((part) => ({
        id: `school_${school}_apply_${part.index}`,
        kind: "part" as const,
        partNumber: part.partNumber,
        title: part.title,
        subtitle: part.subtitle,
        minutes: part.minutes,
        assignee: assigneeFor(`school_${school}_apply_${part.index}`),
        assistant: assigneeFor(`school_${school}_assistant_${part.index}`),
        assistantLabel: "Assistant",
      })),
    ],
  }));

  const livingItems: MeetingProgramItem[] = [];
  const middleSong = songLabel(meeting.mwb_song_middle);
  if (middleSong) {
    livingItems.push({ id: "song_middle", kind: "song", title: middleSong });
  }
  for (let index = 1; index <= 2; index++) {
    const rawTitle =
      meeting[`mwb_lc_part${index}_title` as keyof MidweekMeetingData] ||
      meeting[`mwb_lc_part${index}` as keyof MidweekMeetingData];
    if (typeof rawTitle !== "string" || !rawTitle) {
      continue;
    }
    const content = meeting[`mwb_lc_part${index}_content` as keyof MidweekMeetingData];
    const minutes = meeting[`mwb_lc_part${index}_time` as keyof MidweekMeetingData];
    const { partNumber, title } = splitNumberedTitle(rawTitle);
    livingItems.push({
      id: `living_${index}`,
      kind: "part",
      partNumber,
      title,
      subtitle: typeof content === "string" && content ? content : undefined,
      minutes: typeof minutes === "number" ? minutes : undefined,
      assignee: assigneeFor(`living_${index}`),
    });
  }
  // A visiting circuit overseer delivers the final talk in place of the CBS
  // and closes the meeting himself, so the regular CBS row and closing
  // prayer are omitted that week.
  if (circuitVisitTheme) {
    livingItems.push({
      id: "circuit_visit_theme",
      kind: "part",
      title: circuitVisitTheme,
      assignee: event?.overseerName,
      readOnly: true,
    });
  } else if (meeting.mwb_lc_cbs_title || meeting.mwb_lc_cbs) {
    const { partNumber, title } = splitNumberedTitle(
      meeting.mwb_lc_cbs_title || "Congregation Bible Study",
    );
    livingItems.push({
      id: "cbs_conductor",
      kind: "part",
      partNumber,
      title,
      subtitle: meeting.mwb_lc_cbs || undefined,
      assignee: assigneeFor("cbs_conductor"),
      assistant: assigneeFor("cbs_reader"),
      assistantLabel: "Reader",
    });
  }
  const concludingSong = songLabel(meeting.mwb_song_conclude);
  if (concludingSong) {
    livingItems.push({ id: "song_conclude", kind: "song", title: concludingSong });
  }
  if (!circuitVisitTheme) {
    livingItems.push({
      id: "prayer_2",
      kind: "role",
      title: "Closing Prayer",
      assignee: assigneeFor("prayer_2"),
    });
  }

  program.sections = [
    { id: "opening", color: "medium", blocks: [{ items: openingItems }] },
    {
      id: "treasures",
      title: "Treasures From God's Word",
      color: "jw_slate",
      blocks: [{ items: treasuresItems }],
    },
    {
      id: "ministry",
      title: "Apply Yourself to the Field Ministry",
      color: "jw_brown",
      blocks: ministryBlocks,
    },
    {
      id: "living",
      title: "Living as Christians",
      color: "jw_red",
      blocks: [{ items: livingItems }],
    },
  ];

  return program;
}

import type { Congregation } from "../congregation/schema.ts";
import type { EventRow } from "../event/schema.ts";
import { findWeekEvent } from "../meeting/events.ts";
import type {
  MeetingEventInfo,
  MeetingProgramItem,
  MeetingProgramSection,
} from "../meeting/types.ts";
import type { Publisher } from "../publisher/schema.ts";
import { relativeWeekLabel, weekRangeLabel } from "../../util/week.ts";
import type { SpeakerAssignment, TalkOutline, WeekendAssignment } from "./schema.ts";

export interface WeekendMeetingProgram {
  weekId: string;
  weekLabel: string;
  relativeLabel?: string;
  event?: MeetingEventInfo;
  sections: MeetingProgramSection[];
  /** Any speaker or assignment data exists for this week. */
  hasMeetingData: boolean;
}

export interface BuildWeekendProgramInput {
  weekId: string;
  congregationId?: string | null;
  speakerAssignments?: SpeakerAssignment[];
  weekendAssignments?: WeekendAssignment[];
  outlines?: TalkOutline[];
  publishers?: Publisher[];
  congregations?: Congregation[];
  events?: EventRow[];
  now?: Date;
}

function publisherName(publisher: Publisher | undefined): string | undefined {
  if (!publisher) {
    return undefined;
  }
  const first = publisher.display_name?.trim() || publisher.first_name;
  return `${first} ${publisher.last_name}`.trim();
}

function outlineNumber(outline: TalkOutline | undefined): number | undefined {
  if (!outline) {
    return undefined;
  }
  const parsed = Number.parseInt(outline.id, 10);
  return Number.isNaN(parsed) ? undefined : parsed;
}

function talkLabel(outline: TalkOutline | undefined): string | undefined {
  if (!outline) {
    return undefined;
  }
  const number = outlineNumber(outline);
  return number === undefined ? outline.theme : `${number} · ${outline.theme}`;
}

export function buildWeekendProgram(input: BuildWeekendProgramInput): WeekendMeetingProgram {
  const {
    weekId,
    congregationId,
    speakerAssignments = [],
    weekendAssignments = [],
    outlines = [],
    publishers = [],
    congregations = [],
    events,
    now,
  } = input;

  const publisherById = new Map<string, Publisher>();
  for (const publisher of publishers) {
    if (publisher.id) {
      publisherById.set(publisher.id, publisher);
    }
  }
  const congregationById = new Map<string, Congregation>();
  for (const congregation of congregations) {
    if (congregation.id) {
      congregationById.set(congregation.id, congregation);
    }
  }
  const outlineById = new Map<string, TalkOutline>();
  for (const outline of outlines) {
    outlineById.set(outline.id, outline);
  }

  const resolveParticipant = (participantId: string | undefined): string | undefined =>
    participantId ? publisherName(publisherById.get(participantId)) : undefined;

  const event = findWeekEvent(events, weekId, resolveParticipant);

  // The speaker giving the public talk at our own hall this week.
  const homeTalk = speakerAssignments.find(
    (row) => row.week_id === weekId && row.congregation_id === congregationId,
  );
  const speaker = homeTalk ? publisherById.get(homeTalk.speaker_id) : undefined;
  const speakerCongregation =
    speaker?.congregation_id && speaker.congregation_id !== congregationId
      ? congregationById.get(speaker.congregation_id)
      : undefined;
  const talkOutline = homeTalk?.outline_id ? outlineById.get(homeTalk.outline_id) : undefined;

  const weekAssignments = weekendAssignments.filter((row) => row.week_id === weekId);
  const assigneeFor = (assignmentId: WeekendAssignment["assignment_id"]) =>
    resolveParticipant(
      weekAssignments.find((row) => row.assignment_id === assignmentId)?.participant_id,
    );

  // Our publishers giving the talk at other congregations this week. Only
  // meaningful with a known home congregation; without one every row would
  // look "outgoing" for publishers missing a congregation id.
  const outgoing = congregationId
    ? speakerAssignments.filter(
        (row) =>
          row.week_id === weekId &&
          row.congregation_id !== congregationId &&
          publisherById.get(row.speaker_id)?.congregation_id === congregationId,
      )
    : [];

  const hasMeetingData = Boolean(homeTalk || weekAssignments.length > 0 || outgoing.length > 0);

  const weekendTalkTheme = event?.type === "circuit_visit" ? event.weekendTheme : undefined;

  const talkItem: MeetingProgramItem = weekendTalkTheme
    ? {
        id: "public_talk",
        kind: "part",
        title: weekendTalkTheme,
        assignee: event?.overseerName,
        readOnly: true,
      }
    : {
        id: "public_talk",
        kind: "part",
        partNumber: outlineNumber(talkOutline),
        title: talkOutline?.theme || "Public Talk",
        assignee: homeTalk ? (publisherName(speaker) ?? "Unknown Speaker") : undefined,
        extraAssignees: speakerCongregation
          ? [{ label: "Congregation", name: speakerCongregation.name }]
          : undefined,
      };

  const outgoingItems: MeetingProgramItem[] = outgoing.map((row) => {
    const talk = row.outline_id ? talkLabel(outlineById.get(row.outline_id)) : undefined;
    return {
      id: `outgoing_${row.congregation_id}_${row.speaker_id}`,
      kind: "info",
      title: publisherName(publisherById.get(row.speaker_id)) ?? "Unknown Speaker",
      subtitle: congregationById.get(row.congregation_id)?.name || undefined,
      extraAssignees: talk ? [{ label: "Talk", name: talk }] : undefined,
    };
  });

  const sections: MeetingProgramSection[] = [];
  if (hasMeetingData || weekendTalkTheme) {
    sections.push({
      id: "meeting",
      color: "medium",
      blocks: [
        {
          items: [
            { id: "chairman", kind: "role", title: "Chairman", assignee: assigneeFor("chairman") },
            talkItem,
            {
              id: "reader",
              kind: "role",
              title: "Watchtower Reader",
              assignee: assigneeFor("reader"),
            },
          ],
        },
      ],
    });
  }
  if (outgoingItems.length > 0) {
    sections.push({
      id: "outgoing",
      title: "Outgoing Speakers",
      color: "medium",
      blocks: [{ items: outgoingItems }],
    });
  }

  return {
    weekId,
    weekLabel: weekRangeLabel(weekId, { includeYear: false }),
    relativeLabel: relativeWeekLabel(weekId, now),
    event,
    sections,
    hasMeetingData: hasMeetingData || Boolean(weekendTalkTheme),
  };
}

import { parseWeekId } from "../../util/week.ts";
import { buildMeetingProgram } from "../midweek-meeting/program.ts";
import type { MidweekMeetingAssignment, MidweekMeetingData } from "../midweek-meeting/schema.ts";
import type { MeetingProgramItem } from "../meeting/types.ts";
import type { SpeakerAssignment, WeekendAssignment } from "../weekend-meeting/schema.ts";

export type UpcomingAssignmentType = "midweek" | "weekend" | "speaker";

export interface UpcomingAssignment {
  id: string;
  type: UpcomingAssignmentType;
  weekId: string;
  label: string;
}

export interface BuildUpcomingAssignmentsInput {
  midweek?: MidweekMeetingAssignment[];
  midweekMeetingData?: MidweekMeetingData[];
  weekend?: WeekendAssignment[];
  speaker?: SpeakerAssignment[];
}

const WEEKEND_ASSIGNMENT_LABELS: Record<string, string> = {
  chairman: "Chairman (Weekend)",
  reader: "Reader (Watchtower)",
};

const BIBLE_READING_SUFFIX = "_bible_reading";

function humanizeAssignmentId(assignmentId: string): string {
  return assignmentId.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function itemLabel(item: MeetingProgramItem): string {
  const numbered = item.partNumber !== undefined ? `${item.partNumber}. ${item.title}` : item.title;
  return item.minutes ? `${numbered} (${item.minutes} min)` : numbered;
}

function midweekAssignmentLabel(
  assignment: MidweekMeetingAssignment,
  items: MeetingProgramItem[],
): string {
  let item = items.find((i) => i.id === assignment.assignment_id);
  // Auxiliary-school bible readings share the same part as the main hall;
  // the program only carries it once under "school_1_bible_reading".
  if (
    !item &&
    assignment.assignment_id !== "school_1_bible_reading" &&
    assignment.assignment_id.endsWith(BIBLE_READING_SUFFIX)
  ) {
    item = items.find((i) => i.id === "school_1_bible_reading");
  }
  const base = item ? itemLabel(item) : humanizeAssignmentId(assignment.assignment_id);
  return assignment.assignment_id === "chairman_1" ? `${base} (Midweek)` : base;
}

/**
 * Combines a publisher's midweek meeting parts, weekend meeting roles and
 * public talks into a single list sorted by week.
 */
export function buildUpcomingAssignments(
  input: BuildUpcomingAssignmentsInput,
): UpcomingAssignment[] {
  const { midweek = [], midweekMeetingData = [], weekend = [], speaker = [] } = input;

  const meetingByWeek = new Map<string, MidweekMeetingData>();
  for (const meeting of midweekMeetingData) {
    meetingByWeek.set(meeting.week_id, meeting);
  }

  const itemsByWeek = new Map<string, MeetingProgramItem[]>();
  const itemsFor = (weekId: string): MeetingProgramItem[] => {
    let items = itemsByWeek.get(weekId);
    if (!items) {
      const program = buildMeetingProgram({
        weekId,
        meeting: meetingByWeek.get(weekId) ?? null,
        assignments: midweek.filter((a) => a.week_id === weekId),
      });
      items = program.sections.flatMap((section) => section.blocks.flatMap((block) => block.items));
      itemsByWeek.set(weekId, items);
    }
    return items;
  };

  const assignments: UpcomingAssignment[] = [
    ...midweek.map((a) => ({
      id: `${a.week_id}-midweek-${a.assignment_id}`,
      type: "midweek" as const,
      weekId: a.week_id,
      label: midweekAssignmentLabel(a, itemsFor(a.week_id)),
    })),
    ...weekend.map((a) => ({
      id: `${a.week_id}-weekend-${a.assignment_id}`,
      type: "weekend" as const,
      weekId: a.week_id,
      label: WEEKEND_ASSIGNMENT_LABELS[a.assignment_id] ?? humanizeAssignmentId(a.assignment_id),
    })),
    ...speaker.map((a) => ({
      id: `${a.week_id}-speaker-${a.congregation_id}`,
      type: "speaker" as const,
      weekId: a.week_id,
      label: "Public Talk",
    })),
  ];

  return assignments.sort((a, b) => a.weekId.localeCompare(b.weekId));
}

export interface AssignmentMonthGroup {
  label: string;
  assignments: UpcomingAssignment[];
}

/**
 * Groups week-sorted assignments under a label for the month their week
 * begins. The year is appended for months outside the current year.
 */
export function groupAssignmentsByMonth(
  assignments: UpcomingAssignment[],
  now: Date = new Date(),
): AssignmentMonthGroup[] {
  const currentYear = now.getFullYear();
  const groups = new Map<string, UpcomingAssignment[]>();

  for (const assignment of assignments) {
    const date = parseWeekId(assignment.weekId);
    const label = date
      ? date.toLocaleDateString(undefined, {
          month: "long",
          ...(date.getFullYear() === currentYear ? {} : { year: "numeric" }),
        })
      : assignment.weekId;
    const group = groups.get(label);
    if (group) {
      group.push(assignment);
    } else {
      groups.set(label, [assignment]);
    }
  }

  return Array.from(groups, ([label, grouped]) => ({ label, assignments: grouped }));
}

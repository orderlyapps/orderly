export type MeetingSectionColor = "medium" | "jw_slate" | "jw_brown" | "jw_red";

export type MeetingItemKind = "song" | "role" | "part" | "info";

export interface MeetingProgramItem {
  id: string;
  kind: MeetingItemKind;
  /** Leading part number extracted from the workbook title ("4. Starting a Conversation" → 4). */
  partNumber?: number;
  title: string;
  /** Extra detail: bible reading reference, ministry instructions, CBS material. */
  subtitle?: string;
  minutes?: number;
  assignee?: string;
  assistant?: string;
  /** Label for the assistant line, e.g. "Assistant" or "Reader". */
  assistantLabel?: string;
  /** Additional school assignees, e.g. auxiliary classroom bible readers. */
  extraAssignees?: { label: string; name?: string }[];
  /** Item comes from an event rather than editable assignments (e.g. CO visit talk). */
  readOnly?: boolean;
}

export interface MeetingProgramBlock {
  /** School label when a week runs more than one school ("Main Hall", "Auxiliary Classroom 1"). */
  label?: string;
  items: MeetingProgramItem[];
}

export interface MeetingProgramSection {
  id: string;
  title?: string;
  color: MeetingSectionColor;
  blocks: MeetingProgramBlock[];
}

export interface MeetingEventInfo {
  type: "circuit_visit" | "circuit_assembly" | "convention";
  title: string;
  /** Event headline, e.g. the convention or circuit visit theme. */
  name?: string;
  /** Circuit visit midweek talk theme. */
  midweekTheme?: string;
  /** Circuit visit weekend talk theme. */
  weekendTheme?: string;
  /** Resolved circuit overseer display name. */
  overseerName?: string;
  /** Weeks with an assembly/convention show a banner instead of meeting parts. */
  replacesMeeting: boolean;
}

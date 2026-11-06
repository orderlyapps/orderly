import { z } from "zod";

export const SPEAKER_ASSIGNMENT_TABLE = "speaker_assignment";
export const WEEKEND_ASSIGNMENT_TABLE = "weekend_assignment";
export const TALK_OUTLINE_TABLE = "outline";

// Mirrors the Supabase "speaker_assignment" table. congregation_id is the
// congregation hosting the talk that week; the speaker may be a publisher of
// that congregation or a visitor from another one.
export const speakerAssignmentSchema = z.object({
  week_id: z.string(),
  speaker_id: z.uuid(),
  congregation_id: z.uuid(),
  outline_id: z.string().nullable().optional(),
});

export type SpeakerAssignment = z.infer<typeof speakerAssignmentSchema>;

// Mirrors the Supabase "outline" table (public talk outlines; id is the
// outline number, e.g. "37").
export const talkOutlineSchema = z.object({
  id: z.string(),
  theme: z.string(),
});

export type TalkOutline = z.infer<typeof talkOutlineSchema>;

export const weekendAssignmentIds = ["chairman", "reader"] as const;

export type WeekendAssignmentId = (typeof weekendAssignmentIds)[number];

// Mirrors the Supabase "weekend_assignment" table (per-congregation, no primary key)
export const weekendAssignmentSchema = z.object({
  participant_id: z.uuid(),
  assignment_id: z.enum(weekendAssignmentIds),
  congregation_id: z.uuid(),
  week_id: z.string(),
});

export type WeekendAssignment = z.infer<typeof weekendAssignmentSchema>;

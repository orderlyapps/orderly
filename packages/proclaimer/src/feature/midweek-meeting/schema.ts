import { z } from "zod";

export const MIDWEEK_MEETING_DATA_TABLE = "midweek_meeting_data";
export const MIDWEEK_ASSIGNMENT_TABLE = "midweek_assignment";

// Mirrors the Supabase "midweek_meeting_data" table (global meeting workbook data)
export const midweekMeetingDataSchema = z.object({
  week_id: z.string(),
  mwb_week_date_locale: z.string().nullable().optional(),
  mwb_weekly_bible_reading: z.string(),
  mwb_song_first: z.number().int(),
  mwb_tgw_talk: z.string(),
  mwb_tgw_talk_title: z.string().nullable().optional(),
  mwb_tgw_gems_title: z.string().nullable().optional(),
  mwb_tgw_bread: z.string(),
  mwb_tgw_bread_title: z.string().nullable().optional(),
  mwb_ayf_count: z.number().int(),
  mwb_ayf_part1: z.string(),
  mwb_ayf_part1_time: z.number().int().nullable().optional(),
  mwb_ayf_part1_type: z.string().nullable().optional(),
  mwb_ayf_part1_title: z.string().nullable().optional(),
  mwb_ayf_part2: z.string(),
  mwb_ayf_part2_time: z.number().int().nullable().optional(),
  mwb_ayf_part2_type: z.string().nullable().optional(),
  mwb_ayf_part2_title: z.string().nullable().optional(),
  mwb_ayf_part3: z.string(),
  mwb_ayf_part3_time: z.number().int().nullable().optional(),
  mwb_ayf_part3_type: z.string().nullable().optional(),
  mwb_ayf_part3_title: z.string().nullable().optional(),
  mwb_ayf_part4: z.string().nullable().optional(),
  mwb_ayf_part4_time: z.number().int().nullable().optional(),
  mwb_ayf_part4_type: z.string().nullable().optional(),
  mwb_ayf_part4_title: z.string().nullable().optional(),
  mwb_song_middle: z.string().nullable().optional(),
  mwb_lc_count: z.number().int(),
  mwb_lc_part1: z.string(),
  mwb_lc_part1_time: z.number().int().nullable().optional(),
  mwb_lc_part1_content: z.string().nullable().optional(),
  mwb_lc_part1_title: z.string().nullable().optional(),
  mwb_lc_part2: z.string().nullable().optional(),
  mwb_lc_part2_time: z.number().int().nullable().optional(),
  mwb_lc_part2_content: z.string().nullable().optional(),
  mwb_lc_part2_title: z.string().nullable().optional(),
  mwb_lc_cbs: z.string(),
  mwb_lc_cbs_title: z.string().nullable().optional(),
  mwb_song_conclude: z.string().nullable().optional(),
});

export type MidweekMeetingData = z.infer<typeof midweekMeetingDataSchema>;

export const midweekMeetingAssignmentIds = [
  "prayer_1",
  "treasures",
  "gems",
  "school_1_bible_reading",
  "school_1_apply_1",
  "school_1_assistant_1",
  "school_1_apply_2",
  "school_1_assistant_2",
  "school_1_apply_3",
  "school_1_assistant_3",
  "school_1_apply_4",
  "school_1_assistant_4",
  "chairman_1",
  "chairman_2",
  "school_2_bible_reading",
  "school_2_apply_1",
  "school_2_assistant_1",
  "school_2_apply_2",
  "school_2_assistant_2",
  "school_2_apply_3",
  "school_2_assistant_3",
  "school_2_apply_4",
  "school_2_assistant_4",
  "chairman_3",
  "school_3_bible_reading",
  "school_3_apply_1",
  "school_3_assistant_1",
  "school_3_apply_2",
  "school_3_assistant_2",
  "school_3_apply_3",
  "school_3_assistant_3",
  "school_3_apply_4",
  "school_3_assistant_4",
  "living_1",
  "living_2",
  "cbs_conductor",
  "cbs_reader",
  "prayer_2",
] as const;

export type MidweekMeetingAssignmentId = (typeof midweekMeetingAssignmentIds)[number];

// Mirrors the Supabase "midweek_assignment" table (per-congregation, no primary key)
export const midweekMeetingAssignmentSchema = z.object({
  participant_id: z.uuid(),
  assignment_id: z.enum(midweekMeetingAssignmentIds),
  congregation_id: z.uuid(),
  week_id: z.string(),
});

export type MidweekMeetingAssignment = z.infer<typeof midweekMeetingAssignmentSchema>;

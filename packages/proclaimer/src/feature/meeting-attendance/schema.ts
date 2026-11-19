import { z } from "zod";

export const MEETING_ATTENDANCE_TABLE = "meeting_attendance";

// Mirrors the Supabase "meeting_attendance" table: one row per congregation
// per week. `week_id` is the Monday the meeting week starts on.
export const meetingAttendanceSchema = z.object({
  week_id: z.string(),
  congregation_id: z.uuid(),
  weekend_in_person_count: z.number().nullable().default(null),
  weekend_remote_count: z.number().nullable().default(null),
  midweek_in_person_count: z.number().nullable().default(null),
  midweek_remote_count: z.number().nullable().default(null),
});

export type MeetingAttendance = z.infer<typeof meetingAttendanceSchema>;

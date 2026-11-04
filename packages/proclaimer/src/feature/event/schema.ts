import { z } from "zod";

export const EVENT_TABLE = "event";

export const EVENT_TYPES = [
  "circuit_assembly",
  "convention",
  "memorial",
  "other",
  "circuit_visit",
  "special_meeting",
  "campaign",
  "special_talk",
  "pioneer_meeting",
  "kingdom_ministry_school",
  "working_bee",
  "bethel_speaker",
] as const;

export const eventTypeSchema = z.enum(EVENT_TYPES).catch("other");

export type EventType = z.infer<typeof eventTypeSchema>;

export const circuitVisitDetailsSchema = z.object({
  midweek_theme: z.string().default(""),
  weekend_theme: z.string().default(""),
  pioneer_meeting_time: z.string().nullable().default(null),
});

// Only "circuit_visit" has structured details for now; widen as needed.
export const eventDetailsSchema = circuitVisitDetailsSchema;

// Mirrors the Supabase "event" table
export const eventSchema = z.object({
  id: z.uuid(),
  congregation_id: z.uuid(),
  name: z.string().default(""),
  description: z.string().default(""),
  address: z.string().default(""),
  coordinates: z.array(z.number()).nullable().default(null),
  all_day: z.boolean(),
  start_date: z.string(),
  start_time: z.string().nullable().default(null),
  end_date: z.string().nullable().default(null),
  end_time: z.string().nullable().default(null),
  type: eventTypeSchema,
  details: eventDetailsSchema.nullable().default(null),
});

export type CircuitVisitDetails = z.infer<typeof circuitVisitDetailsSchema>;
export type EventRow = z.infer<typeof eventSchema>;

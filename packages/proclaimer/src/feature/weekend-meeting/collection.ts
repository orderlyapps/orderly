import { createSupabaseTableCollection, getCachedCollection } from "../backend/collections.ts";
import {
  SPEAKER_ASSIGNMENT_TABLE,
  TALK_OUTLINE_TABLE,
  WEEKEND_ASSIGNMENT_TABLE,
  speakerAssignmentSchema,
  talkOutlineSchema,
  weekendAssignmentSchema,
  type SpeakerAssignment,
  type TalkOutline,
  type WeekendAssignment,
} from "./schema.ts";

// Speaker assignments are fetched for every congregation: outgoing speakers
// are rows whose congregation_id is a different (host) congregation.
export function createSpeakerAssignmentCollection() {
  return createSupabaseTableCollection<SpeakerAssignment>({
    table: SPEAKER_ASSIGNMENT_TABLE,
    id: SPEAKER_ASSIGNMENT_TABLE,
    select: "*",
    keyColumns: ["week_id", "congregation_id"],
    schema: speakerAssignmentSchema,
  });
}

export type SpeakerAssignmentCollection = ReturnType<typeof createSpeakerAssignmentCollection>;

let defaultSpeakerAssignmentCollection: SpeakerAssignmentCollection | null = null;

export function getSpeakerAssignmentCollection(): SpeakerAssignmentCollection {
  if (!defaultSpeakerAssignmentCollection) {
    defaultSpeakerAssignmentCollection = createSpeakerAssignmentCollection();
  }
  return defaultSpeakerAssignmentCollection;
}

export function createTalkOutlineCollection() {
  return createSupabaseTableCollection<TalkOutline>({
    table: TALK_OUTLINE_TABLE,
    id: TALK_OUTLINE_TABLE,
    select: "*",
    idColumn: "id",
    schema: talkOutlineSchema,
  });
}

export type TalkOutlineCollection = ReturnType<typeof createTalkOutlineCollection>;

let defaultOutlineCollection: TalkOutlineCollection | null = null;

export function getTalkOutlineCollection(): TalkOutlineCollection {
  if (!defaultOutlineCollection) {
    defaultOutlineCollection = createTalkOutlineCollection();
  }
  return defaultOutlineCollection;
}

export function createWeekendAssignmentCollection(congregationId: string) {
  return createSupabaseTableCollection<WeekendAssignment>({
    table: WEEKEND_ASSIGNMENT_TABLE,
    id: `${WEEKEND_ASSIGNMENT_TABLE}:${congregationId}`,
    match: { congregation_id: congregationId },
    keyColumns: ["assignment_id", "congregation_id", "week_id"],
    schema: weekendAssignmentSchema,
  });
}

export type WeekendAssignmentCollection = ReturnType<typeof createWeekendAssignmentCollection>;

const defaultAssignmentCollections = new Map<string, WeekendAssignmentCollection>();

export function getWeekendAssignmentCollection(
  congregationId: string,
): WeekendAssignmentCollection {
  const key = congregationId.trim();
  return getCachedCollection(defaultAssignmentCollections, key, () =>
    createWeekendAssignmentCollection(key),
  );
}

export async function resetWeekendMeetingCollectionsForTesting(): Promise<void> {
  const collections = [...defaultAssignmentCollections.values()];
  defaultAssignmentCollections.clear();
  const speakerAssignments = defaultSpeakerAssignmentCollection;
  defaultSpeakerAssignmentCollection = null;
  const outlines = defaultOutlineCollection;
  defaultOutlineCollection = null;
  const all = [speakerAssignments, outlines, ...collections].filter(
    (collection): collection is NonNullable<typeof collection> => collection != null,
  );
  await Promise.all(all.map((collection) => collection.cleanup().catch(() => {})));
}

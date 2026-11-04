import { createSupabaseTableCollection } from "../backend/collections.ts";
import {
  MIDWEEK_ASSIGNMENT_TABLE,
  MIDWEEK_MEETING_DATA_TABLE,
  midweekMeetingAssignmentSchema,
  midweekMeetingDataSchema,
  type MidweekMeetingAssignment,
  type MidweekMeetingData,
} from "./schema.ts";

export function createMidweekMeetingDataCollection() {
  return createSupabaseTableCollection<MidweekMeetingData>({
    table: MIDWEEK_MEETING_DATA_TABLE,
    id: MIDWEEK_MEETING_DATA_TABLE,
    select: "*",
    idColumn: "week_id",
    schema: midweekMeetingDataSchema,
  });
}

export type MidweekMeetingDataCollection = ReturnType<typeof createMidweekMeetingDataCollection>;

let defaultDataCollection: MidweekMeetingDataCollection | null = null;

export function getMidweekMeetingDataCollection(): MidweekMeetingDataCollection {
  if (!defaultDataCollection) {
    defaultDataCollection = createMidweekMeetingDataCollection();
  }
  return defaultDataCollection;
}

export function createMidweekAssignmentCollection(congregationId: string) {
  return createSupabaseTableCollection<MidweekMeetingAssignment>({
    table: MIDWEEK_ASSIGNMENT_TABLE,
    id: `${MIDWEEK_ASSIGNMENT_TABLE}:${congregationId}`,
    match: { congregation_id: congregationId },
    keyColumns: ["assignment_id", "congregation_id", "week_id"],
    schema: midweekMeetingAssignmentSchema,
  });
}

export type MidweekAssignmentCollection = ReturnType<typeof createMidweekAssignmentCollection>;

const defaultAssignmentCollections = new Map<string, MidweekAssignmentCollection>();

export function getMidweekAssignmentCollection(
  congregationId: string,
): MidweekAssignmentCollection {
  const key = congregationId.trim();
  let collection = defaultAssignmentCollections.get(key);
  if (!collection) {
    collection = createMidweekAssignmentCollection(key);
    defaultAssignmentCollections.set(key, collection);
  }
  return collection;
}

export async function resetMidweekMeetingCollectionsForTesting(): Promise<void> {
  const collections = [...defaultAssignmentCollections.values()];
  defaultAssignmentCollections.clear();
  const dataCollection = defaultDataCollection;
  defaultDataCollection = null;
  const all = dataCollection ? [...collections, dataCollection] : collections;
  await Promise.all(all.map((collection) => collection.cleanup().catch(() => {})));
}

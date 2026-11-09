import { createSupabaseTableCollection } from "../backend/collections.ts";
import {
  CLAM_OVERSEER_PERMISSION_TABLE,
  MIDWEEK_ASSIGNMENT_TABLE,
  MIDWEEK_MEETING_DATA_TABLE,
  MIDWEEK_PARTICIPATION_TABLE,
  clamOverseerPermissionSchema,
  midweekMeetingAssignmentSchema,
  midweekMeetingDataSchema,
  midweekParticipationSchema,
  type ClamOverseerPermission,
  type MidweekMeetingAssignment,
  type MidweekMeetingData,
  type MidweekParticipation,
  type MidweekParticipationId,
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

// Matches the composite getKey in createSupabaseTableCollection for
// keyColumns ["assignment_id", "congregation_id", "week_id"]
export function midweekAssignmentKey(
  assignmentId: string,
  congregationId: string,
  weekId: string,
): string {
  return JSON.stringify([assignmentId, congregationId, weekId]);
}

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

export function createMidweekParticipationCollection() {
  return createSupabaseTableCollection<MidweekParticipation>({
    table: MIDWEEK_PARTICIPATION_TABLE,
    id: MIDWEEK_PARTICIPATION_TABLE,
    keyColumns: ["participant_id", "participation_id"],
    schema: midweekParticipationSchema,
  });
}

export type MidweekParticipationCollection = ReturnType<
  typeof createMidweekParticipationCollection
>;

// Matches the composite getKey in createSupabaseTableCollection for
// keyColumns ["participant_id", "participation_id"]
export function midweekParticipationKey(
  participantId: string,
  participationId: MidweekParticipationId,
): string {
  return JSON.stringify([participantId, participationId]);
}

let defaultParticipationCollection: MidweekParticipationCollection | null = null;

export function getMidweekParticipationCollection(): MidweekParticipationCollection {
  if (!defaultParticipationCollection) {
    defaultParticipationCollection = createMidweekParticipationCollection();
  }
  return defaultParticipationCollection;
}

export function createClamOverseerPermissionCollection() {
  return createSupabaseTableCollection<ClamOverseerPermission>({
    table: CLAM_OVERSEER_PERMISSION_TABLE,
    id: CLAM_OVERSEER_PERMISSION_TABLE,
    keyColumns: ["auth_user_id", "congregation_id"],
    schema: clamOverseerPermissionSchema,
  });
}

export type ClamOverseerPermissionCollection = ReturnType<
  typeof createClamOverseerPermissionCollection
>;

let defaultPermissionCollection: ClamOverseerPermissionCollection | null = null;

export function getClamOverseerPermissionCollection(): ClamOverseerPermissionCollection {
  if (!defaultPermissionCollection) {
    defaultPermissionCollection = createClamOverseerPermissionCollection();
  }
  return defaultPermissionCollection;
}

export async function resetMidweekMeetingCollectionsForTesting(): Promise<void> {
  const collections = [...defaultAssignmentCollections.values()];
  defaultAssignmentCollections.clear();
  const dataCollection = defaultDataCollection;
  defaultDataCollection = null;
  const participationCollection = defaultParticipationCollection;
  defaultParticipationCollection = null;
  const permissionCollection = defaultPermissionCollection;
  defaultPermissionCollection = null;
  const all = [
    ...collections,
    ...(dataCollection ? [dataCollection] : []),
    ...(participationCollection ? [participationCollection] : []),
    ...(permissionCollection ? [permissionCollection] : []),
  ];
  await Promise.all(all.map((collection) => collection.cleanup().catch(() => {})));
}

import { createSupabaseTableCollection } from "../backend/collections.ts";
import { getSupabaseClient } from "../backend/supabase.ts";
import {
  CLAM_OVERSEER_PERMISSION_TABLE,
  MIDWEEK_ASSIGNMENT_TABLE,
  MIDWEEK_MEETING_DATA_TABLE,
  MIDWEEK_PARTICIPATION_TABLE,
  assignmentIdsIncludingSchoolCascade,
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

async function deleteMidweekAssignmentRows(rows: MidweekMeetingAssignment[]): Promise<void> {
  const groups = new Map<
    string,
    {
      congregationId: string;
      weekId: string;
      assignmentIds: MidweekMeetingAssignment["assignment_id"][];
    }
  >();
  for (const row of rows) {
    const groupKey = JSON.stringify([row.congregation_id, row.week_id]);
    const group = groups.get(groupKey) ?? {
      congregationId: row.congregation_id,
      weekId: row.week_id,
      assignmentIds: [],
    };
    group.assignmentIds.push(row.assignment_id);
    groups.set(groupKey, group);
  }

  for (const group of groups.values()) {
    const { error } = await getSupabaseClient()
      .from(MIDWEEK_ASSIGNMENT_TABLE)
      .delete()
      .eq("congregation_id", group.congregationId)
      .eq("week_id", group.weekId)
      .in("assignment_id", assignmentIdsIncludingSchoolCascade(group.assignmentIds));
    if (error) {
      throw error;
    }
  }
}

export function createMidweekAssignmentCollection(congregationId: string) {
  return createSupabaseTableCollection<MidweekMeetingAssignment>({
    table: MIDWEEK_ASSIGNMENT_TABLE,
    id: `${MIDWEEK_ASSIGNMENT_TABLE}:${congregationId}`,
    match: { congregation_id: congregationId },
    keyColumns: ["assignment_id", "congregation_id", "week_id"],
    schema: midweekMeetingAssignmentSchema,
    onDeleteRows: deleteMidweekAssignmentRows,
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

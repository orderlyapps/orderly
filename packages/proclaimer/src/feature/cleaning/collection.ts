import { createSupabaseTableCollection, getCachedCollection } from "../backend/collections.ts";
import {
  CLEAN_MAJOR_TABLE,
  CLEAN_MINOR_TABLE,
  cleaningAssignmentSchema,
  GROUP_TABLE,
  groupSchema,
  type CleaningAssignmentRow,
  type GroupRow,
} from "./schema.ts";

function createCleaningAssignmentCollection(table: string, congregationId: string) {
  return createSupabaseTableCollection<CleaningAssignmentRow>({
    table,
    id: `${table}:${congregationId}`,
    select: "week_id,congregation_id,group_id",
    match: { congregation_id: congregationId },
    keyColumns: ["week_id", "congregation_id"],
    schema: cleaningAssignmentSchema,
  });
}

export function createCleanMajorCollection(congregationId: string) {
  return createCleaningAssignmentCollection(CLEAN_MAJOR_TABLE, congregationId);
}

export function createCleanMinorCollection(congregationId: string) {
  return createCleaningAssignmentCollection(CLEAN_MINOR_TABLE, congregationId);
}

export type CleaningAssignmentCollection = ReturnType<typeof createCleanMajorCollection>;

export function createGroupCollection(congregationId: string) {
  return createSupabaseTableCollection<GroupRow>({
    table: GROUP_TABLE,
    id: `${GROUP_TABLE}:${congregationId}`,
    select: "id,congregation_id,name",
    match: { congregation_id: congregationId },
    schema: groupSchema,
  });
}

export type GroupCollection = ReturnType<typeof createGroupCollection>;

const defaultMajorCollections = new Map<string, CleaningAssignmentCollection>();
const defaultMinorCollections = new Map<string, CleaningAssignmentCollection>();
const defaultGroupCollections = new Map<string, GroupCollection>();

export function getCleanMajorCollection(congregationId: string): CleaningAssignmentCollection {
  const key = congregationId.trim();
  return getCachedCollection(defaultMajorCollections, key, () => createCleanMajorCollection(key));
}

export function getCleanMinorCollection(congregationId: string): CleaningAssignmentCollection {
  const key = congregationId.trim();
  return getCachedCollection(defaultMinorCollections, key, () => createCleanMinorCollection(key));
}

export function getGroupCollection(congregationId: string): GroupCollection {
  const key = congregationId.trim();
  return getCachedCollection(defaultGroupCollections, key, () => createGroupCollection(key));
}

export async function resetCleaningCollectionsForTesting(): Promise<void> {
  const collections = [
    ...defaultMajorCollections.values(),
    ...defaultMinorCollections.values(),
    ...defaultGroupCollections.values(),
  ];
  defaultMajorCollections.clear();
  defaultMinorCollections.clear();
  defaultGroupCollections.clear();
  await Promise.all(collections.map((collection) => collection.cleanup().catch(() => {})));
}

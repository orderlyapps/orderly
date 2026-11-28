import { midweekAssignmentKey } from "./collection.ts";
import { schoolAssignmentIds } from "./schema.ts";

interface AssignmentKeyStore {
  get: (key: string) => unknown;
  delete: (keys: string[] | string) => unknown;
}

export function deleteSchoolAssignments(
  collection: AssignmentKeyStore,
  school: 1 | 2 | 3,
  congregationId: string,
  weekId: string,
): void {
  const keys = schoolAssignmentIds(school)
    .map((assignmentId) => midweekAssignmentKey(assignmentId, congregationId, weekId))
    .filter((key) => collection.get(key));
  if (keys.length > 0) {
    collection.delete(keys);
  }
}

import type { Report } from "./schema.ts";

export interface ReportGroupEditAccess {
  hasSecretary: boolean;
  isCongregationAdmin: boolean;
  isSuperAdmin: boolean;
  reportEditGroupIds: readonly string[];
}

/** Mirrors report RLS edit access for privileged users and group-scoped report permissions. */
export function canEditReportGroup(
  access: ReportGroupEditAccess,
  groupId: string | null | undefined,
): boolean {
  return (
    access.isSuperAdmin ||
    access.isCongregationAdmin ||
    access.hasSecretary ||
    (groupId != null && access.reportEditGroupIds.includes(groupId))
  );
}

export interface PublisherReportEditInput {
  access: ReportGroupEditAccess;
  collectionAvailable: boolean;
  congregationId?: string | null;
  canCreate: boolean;
  report: Report | null;
  publisherGroupId?: string | null;
}

/**
 * Whether the current user may open the editor for a publisher's report row.
 * Existing reports use their stored group — falling back to the publisher's
 * current group would offer edits the backend rejects for legacy null-group
 * reports — while new reports are filed under the publisher's current group.
 */
export function canEditPublisherReport({
  access,
  collectionAvailable,
  congregationId,
  canCreate,
  report,
  publisherGroupId,
}: PublisherReportEditInput): boolean {
  if (!collectionAvailable) {
    return false;
  }
  const groupId = report ? report.group_id : publisherGroupId;
  if (!canEditReportGroup(access, groupId)) {
    return false;
  }
  return report != null ? report.congregation_id === congregationId : canCreate;
}

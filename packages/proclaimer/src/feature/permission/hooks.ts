import { useMemo } from "react";

import { and, eq, useLiveQuery } from "@tanstack/react-db";

import { useAuthSession } from "../auth/session.ts";
import {
  getClamOverseerPermissionCollection,
  type ClamOverseerPermissionCollection,
} from "../midweek-meeting/collection.ts";
import type { ClamOverseerPermission } from "../midweek-meeting/schema.ts";
import {
  getAuthUserCollection,
  getCongregationAdminCollection,
  getElderPermissionCollection,
  getReportPermissionCollection,
  getSecretaryPermissionCollection,
  getServiceOverseerPermissionCollection,
  type AuthUserCollection,
  type CongregationAdminCollection,
  type ElderPermissionCollection,
  type ReportPermissionCollection,
  type SecretaryPermissionCollection,
  type ServiceOverseerPermissionCollection,
} from "./collection.ts";
import type {
  AuthUser,
  CongregationAdmin,
  ElderPermission,
  ReportPermission,
  SecretaryPermission,
  ServiceOverseerPermission,
} from "./schema.ts";

export interface PermissionsResult {
  /** User may update the midweek_assignment and midweek_participation tables. */
  hasMidweekMeetingOverseer: boolean;
  /** User may edit secretary data for the congregation. */
  hasSecretary: boolean;
  /** User has elder access to the congregation's publisher data. */
  hasElder: boolean;
  /** User may edit service overseer data (e.g. territory maps) for the congregation. */
  hasServiceOverseer: boolean;
  /** Field service group ids whose reports the user may read. */
  reportReadGroupIds: string[];
  /** Field service group ids whose reports the user may edit. */
  reportEditGroupIds: string[];
  /** User is an administrator of the congregation. */
  isCongregationAdmin: boolean;
  isSuperAdmin: boolean;
  isAuthenticated: boolean;
  /** Auth session resolved and permission rows finished (or skipped) loading. */
  isLoaded: boolean;
}

interface CongregationEditPermission {
  auth_user_id: string;
  congregation_id: string;
  can_edit: boolean;
}

function hasCongregationEditPermission(
  rows: CongregationEditPermission[] | undefined,
  authUserId: string | null | undefined,
  congregationId: string | null | undefined,
): boolean {
  if (!authUserId || !congregationId) {
    return false;
  }
  return (rows ?? []).some(
    (row) =>
      row.auth_user_id === authUserId && row.congregation_id === congregationId && row.can_edit,
  );
}

export function hasClamOverseerPermission(
  rows: ClamOverseerPermission[] | undefined,
  authUserId: string | null | undefined,
  congregationId: string | null | undefined,
): boolean {
  return hasCongregationEditPermission(rows, authUserId, congregationId);
}

export function hasSecretaryPermission(
  rows: SecretaryPermission[] | undefined,
  authUserId: string | null | undefined,
  congregationId: string | null | undefined,
): boolean {
  return hasCongregationEditPermission(rows, authUserId, congregationId);
}

export function hasElderPermission(
  rows: ElderPermission[] | undefined,
  authUserId: string | null | undefined,
  congregationId: string | null | undefined,
): boolean {
  return hasCongregationEditPermission(rows, authUserId, congregationId);
}

export function hasServiceOverseerPermission(
  rows: ServiceOverseerPermission[] | undefined,
  authUserId: string | null | undefined,
  congregationId: string | null | undefined,
): boolean {
  return hasCongregationEditPermission(rows, authUserId, congregationId);
}

function hasReportPermission(
  rows: ReportPermission[] | undefined,
  authUserId: string | null | undefined,
  groupId: string | null | undefined,
  permission: "can_read" | "can_edit",
): boolean {
  if (!authUserId || !groupId) {
    return false;
  }
  return (rows ?? []).some(
    (row) => row.auth_user_id === authUserId && row.group_id === groupId && row[permission],
  );
}

export function hasReportReadPermission(
  rows: ReportPermission[] | undefined,
  authUserId: string | null | undefined,
  groupId: string | null | undefined,
): boolean {
  return hasReportPermission(rows, authUserId, groupId, "can_read");
}

export function hasReportEditPermission(
  rows: ReportPermission[] | undefined,
  authUserId: string | null | undefined,
  groupId: string | null | undefined,
): boolean {
  return hasReportPermission(rows, authUserId, groupId, "can_edit");
}

export function isCongregationAdminUser(
  rows: CongregationAdmin[] | undefined,
  authUserId: string | null | undefined,
  congregationId: string | null | undefined,
): boolean {
  if (!authUserId || !congregationId) {
    return false;
  }
  return (rows ?? []).some(
    (row) => row.auth_user_id === authUserId && row.congregation_id === congregationId,
  );
}

export function isSuperAdminUser(
  rows: AuthUser[] | undefined,
  authUserId: string | null | undefined,
): boolean {
  if (!authUserId) {
    return false;
  }
  return (rows ?? []).some((row) => row.auth_user_id === authUserId && row.is_super_admin);
}

interface ResolvedCollections {
  clamOverseer: ClamOverseerPermissionCollection | null;
  secretary: SecretaryPermissionCollection | null;
  elder: ElderPermissionCollection | null;
  serviceOverseer: ServiceOverseerPermissionCollection | null;
  report: ReportPermissionCollection | null;
  congregationAdmin: CongregationAdminCollection | null;
  authUser: AuthUserCollection | null;
}

function tryResolve<T>(create: () => T): T | null {
  try {
    return create();
  } catch {
    return null;
  }
}

function resolveCollections(
  congregationId: string | null | undefined,
  authUserId: string | null | undefined,
): ResolvedCollections {
  return {
    clamOverseer: congregationId ? tryResolve(getClamOverseerPermissionCollection) : null,
    secretary: congregationId ? tryResolve(getSecretaryPermissionCollection) : null,
    elder: congregationId ? tryResolve(getElderPermissionCollection) : null,
    serviceOverseer: congregationId ? tryResolve(getServiceOverseerPermissionCollection) : null,
    report: authUserId ? tryResolve(getReportPermissionCollection) : null,
    congregationAdmin: congregationId ? tryResolve(getCongregationAdminCollection) : null,
    authUser: authUserId ? tryResolve(getAuthUserCollection) : null,
  };
}

export function usePermissions(congregationId?: string | null): PermissionsResult {
  const session = useAuthSession();
  const authUserId = session?.user?.id;
  const resolved = useMemo(
    () => resolveCollections(congregationId, authUserId),
    [congregationId, authUserId],
  );

  const { data: clamRows, isLoading: clamLoading } = useLiveQuery({
    query: (q) =>
      resolved.clamOverseer && authUserId && congregationId
        ? q
            .from({ p: resolved.clamOverseer })
            .where(({ p }) =>
              and(eq(p.auth_user_id, authUserId), eq(p.congregation_id, congregationId)),
            )
        : undefined,
  });

  const { data: secretaryRows, isLoading: secretaryLoading } = useLiveQuery({
    query: (q) =>
      resolved.secretary && authUserId && congregationId
        ? q
            .from({ p: resolved.secretary })
            .where(({ p }) =>
              and(eq(p.auth_user_id, authUserId), eq(p.congregation_id, congregationId)),
            )
        : undefined,
  });

  const { data: elderRows, isLoading: elderLoading } = useLiveQuery({
    query: (q) =>
      resolved.elder && authUserId && congregationId
        ? q
            .from({ p: resolved.elder })
            .where(({ p }) =>
              and(eq(p.auth_user_id, authUserId), eq(p.congregation_id, congregationId)),
            )
        : undefined,
  });

  const { data: serviceOverseerRows, isLoading: serviceOverseerLoading } = useLiveQuery({
    query: (q) =>
      resolved.serviceOverseer && authUserId && congregationId
        ? q
            .from({ p: resolved.serviceOverseer })
            .where(({ p }) =>
              and(eq(p.auth_user_id, authUserId), eq(p.congregation_id, congregationId)),
            )
        : undefined,
  });

  const { data: reportRows, isLoading: reportLoading } = useLiveQuery({
    query: (q) =>
      resolved.report && authUserId
        ? q.from({ p: resolved.report }).where(({ p }) => eq(p.auth_user_id, authUserId))
        : undefined,
  });

  const { data: congregationAdminRows, isLoading: congregationAdminLoading } = useLiveQuery({
    query: (q) =>
      resolved.congregationAdmin && authUserId && congregationId
        ? q
            .from({ p: resolved.congregationAdmin })
            .where(({ p }) =>
              and(eq(p.auth_user_id, authUserId), eq(p.congregation_id, congregationId)),
            )
        : undefined,
  });

  const { data: authUserRows, isLoading: authUserLoading } = useLiveQuery({
    query: (q) =>
      resolved.authUser && authUserId
        ? q.from({ u: resolved.authUser }).where(({ u }) => eq(u.auth_user_id, authUserId))
        : undefined,
  });

  return {
    hasMidweekMeetingOverseer: hasClamOverseerPermission(clamRows, authUserId, congregationId),
    hasSecretary: hasSecretaryPermission(secretaryRows, authUserId, congregationId),
    hasElder: hasElderPermission(elderRows, authUserId, congregationId),
    hasServiceOverseer: hasServiceOverseerPermission(
      serviceOverseerRows,
      authUserId,
      congregationId,
    ),
    reportReadGroupIds: (reportRows ?? []).filter((row) => row.can_read).map((row) => row.group_id),
    reportEditGroupIds: (reportRows ?? []).filter((row) => row.can_edit).map((row) => row.group_id),
    isCongregationAdmin: isCongregationAdminUser(congregationAdminRows, authUserId, congregationId),
    isSuperAdmin: isSuperAdminUser(authUserRows, authUserId),
    isAuthenticated: Boolean(authUserId),
    isLoaded:
      session !== undefined &&
      !(resolved.clamOverseer !== null && clamLoading) &&
      !(resolved.secretary !== null && secretaryLoading) &&
      !(resolved.elder !== null && elderLoading) &&
      !(resolved.serviceOverseer !== null && serviceOverseerLoading) &&
      !(resolved.report !== null && reportLoading) &&
      !(resolved.congregationAdmin !== null && congregationAdminLoading) &&
      !(resolved.authUser !== null && authUserLoading),
  };
}

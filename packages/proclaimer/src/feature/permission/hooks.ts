import { useEffect, useState } from "react";

import { and, eq, useLiveQuery } from "@tanstack/react-db";

import { useAuthSession } from "../auth/session.ts";
import {
  getClamOverseerPermissionCollection,
  type ClamOverseerPermissionCollection,
} from "../midweek-meeting/collection.ts";
import type { ClamOverseerPermission } from "../midweek-meeting/schema.ts";

export interface PermissionsResult {
  /** User may update the midweek_assignment and midweek_participation tables. */
  hasMidweekMeetingOverseer: boolean;
  isAuthenticated: boolean;
  /** Auth session resolved and permission rows finished (or skipped) loading. */
  isLoaded: boolean;
}

export function hasClamOverseerPermission(
  rows: ClamOverseerPermission[] | undefined,
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

interface ResolvedCollection {
  collection: ClamOverseerPermissionCollection | null;
  error: Error | null;
}

function toError(value: unknown): Error {
  if (value instanceof Error) {
    return value;
  }
  const message = (value as { message?: unknown } | null)?.message;
  return new Error(typeof message === "string" ? message : "Failed to load permissions");
}

function resolveCollection(congregationId: string | null | undefined): ResolvedCollection {
  if (!congregationId) {
    return { collection: null, error: null };
  }
  try {
    return { collection: getClamOverseerPermissionCollection(), error: null };
  } catch (err) {
    return { collection: null, error: toError(err) };
  }
}

export function usePermissions(congregationId?: string | null): PermissionsResult {
  const session = useAuthSession();
  const [resolved, setResolved] = useState<ResolvedCollection>(() =>
    resolveCollection(congregationId),
  );

  useEffect(() => {
    const next = resolveCollection(congregationId);
    setResolved((prev) =>
      prev.collection === next.collection && prev.error === next.error ? prev : next,
    );
  }, [congregationId]);

  const authUserId = session?.user?.id;

  const { data, isLoading } = useLiveQuery({
    query: (q) =>
      resolved.collection && authUserId && congregationId
        ? q
            .from({ p: resolved.collection })
            .where(({ p }) =>
              and(eq(p.auth_user_id, authUserId), eq(p.congregation_id, congregationId)),
            )
        : undefined,
  });

  return {
    hasMidweekMeetingOverseer: hasClamOverseerPermission(data, authUserId, congregationId),
    isAuthenticated: Boolean(authUserId),
    isLoaded: session !== undefined && !(resolved.collection !== null && isLoading),
  };
}

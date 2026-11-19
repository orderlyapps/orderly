import { useCallback, useEffect, useState } from "react";

import { eq, useLiveQuery } from "@tanstack/react-db";

import { useAuthSession } from "../auth/session.ts";
import { getPublisherCollection, type PublisherCollection } from "./collection.ts";
import { isActiveElderOrMinisterialServant } from "./presentation.ts";
import type { Publisher } from "./schema.ts";

export interface UsePublishersResult {
  publishers: Publisher[];
  isLoading: boolean;
  error: Error | null;
  canRetry: boolean;
  collection: PublisherCollection | null;
  retry: () => Promise<void>;
}

interface ResolvedCollection {
  collection: PublisherCollection | null;
  error: Error | null;
}

function toError(value: unknown): Error {
  if (value instanceof Error) {
    return value;
  }
  const message = (value as { message?: unknown } | null)?.message;
  return new Error(typeof message === "string" ? message : "Failed to load publishers");
}

function resolveCollection(
  congregationId: string | null | undefined,
  collection?: PublisherCollection,
): ResolvedCollection {
  if (collection) {
    return { collection, error: null };
  }
  if (!congregationId) {
    return { collection: null, error: null };
  }
  try {
    return { collection: getPublisherCollection(congregationId), error: null };
  } catch (err) {
    return { collection: null, error: toError(err) };
  }
}

export function usePublishers(
  congregationId?: string | null,
  collection?: PublisherCollection,
): UsePublishersResult {
  const [resolved, setResolved] = useState<ResolvedCollection>(() =>
    resolveCollection(congregationId, collection),
  );

  useEffect(() => {
    const next = resolveCollection(congregationId, collection);
    setResolved((prev) =>
      prev.collection === next.collection && prev.error === next.error ? prev : next,
    );
  }, [collection, congregationId]);

  const active = collection ?? resolved.collection;

  const { data, isLoading } = useLiveQuery((q) =>
    active && congregationId
      ? q
          .from({ p: active })
          .where(({ p }) => eq(p.congregation_id, congregationId))
          .orderBy(({ p }) => p.last_name)
          .orderBy(({ p }) => p.first_name)
      : undefined,
  );

  const retry = useCallback(async () => {
    const target = collection ?? resolved.collection;
    if (!target) {
      setResolved(resolveCollection(congregationId, collection));
      return;
    }
    await target.utils.refetch?.({ throwOnError: false });
  }, [collection, congregationId, resolved.collection]);

  const queryError =
    active?.utils.isError && active.utils.lastError != null
      ? toError(active.utils.lastError)
      : null;

  return {
    publishers: data ?? [],
    isLoading: active !== null && isLoading,
    error: resolved.error ?? queryError,
    canRetry: active !== null,
    collection: active,
    retry,
  };
}

export interface UsePublisherStandingResult {
  /** The signed-in user's linked publisher is an active elder or ministerial servant. */
  isElderOrMinisterialServant: boolean;
  /** Auth session resolved and the publisher collection finished (or skipped) loading. */
  isLoaded: boolean;
}

export function usePublisherStanding(
  congregationId?: string | null,
  collection?: PublisherCollection,
): UsePublisherStandingResult {
  const session = useAuthSession();
  const authUserId = session?.user?.id;
  const { publishers, isLoading } = usePublishers(congregationId, collection);
  const linked = authUserId ? publishers.find((p) => p.auth_id === authUserId) : undefined;

  return {
    isElderOrMinisterialServant: linked != null && isActiveElderOrMinisterialServant(linked),
    isLoaded: session !== undefined && !isLoading,
  };
}

import { useLiveQuery } from "@tanstack/react-db";

import {
  getPublisherLocalCollection,
  getStreetCollection,
  getSuburbCollection,
  type PublisherLocalCollection,
  type StreetCollection,
  type StreetRow,
  type SuburbCollection,
  type SuburbRow,
} from "./collection.ts";
import type { PublisherLocal } from "./schema.ts";

export interface UsePublisherLocalRecordsResult {
  records: PublisherLocal[];
  isLoading: boolean;
  isError: boolean;
}

export function usePublisherLocalRecords(
  collection?: PublisherLocalCollection,
): UsePublisherLocalRecordsResult {
  const active = collection ?? getPublisherLocalCollection();
  const { data, isLoading, isError } = useLiveQuery((q) => q.from({ pl: active }));
  return {
    records: (data ?? []) as PublisherLocal[],
    isLoading,
    isError: isError || active.status === "error",
  };
}

export interface UseTerritoryNamesResult {
  suburbs: SuburbRow[];
  streets: StreetRow[];
}

export function useTerritoryNames(
  congregationId?: string | null,
  suburbCollection?: SuburbCollection,
  streetCollection?: StreetCollection,
): UseTerritoryNamesResult {
  const suburbs = suburbCollection ?? (congregationId ? getSuburbCollection(congregationId) : null);
  const streets = streetCollection ?? (congregationId ? getStreetCollection(congregationId) : null);

  const { data: suburbData } = useLiveQuery((q) => (suburbs ? q.from({ s: suburbs }) : undefined));
  const { data: streetData } = useLiveQuery((q) => (streets ? q.from({ st: streets }) : undefined));

  return {
    suburbs: (suburbData ?? []) as SuburbRow[],
    streets: (streetData ?? []) as StreetRow[],
  };
}

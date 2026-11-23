import { useEffect, useState } from "react";

import { useLiveQuery } from "@tanstack/react-db";

import type { Publisher } from "../publisher/schema.ts";
import type { NameLookup } from "./address.ts";
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
import {
  buildImportPreviewItems,
  type BuildImportPreviewInput,
  type PublisherImportPreviewItem,
} from "./preview.ts";
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

// Shared empty defaults — a fresh `[]` per render would churn the useEffect
// dependency array and loop the deferred diff forever.
const EMPTY_LOOKUPS: NameLookup[] = [];
const EMPTY_RECORDS: PublisherLocal[] = [];
const EMPTY_PUBLISHERS: Publisher[] = [];

/**
 * Diffs import records against existing data, deferred so the loading
 * indicator can paint first. Returns null while the diff for the current
 * inputs is still pending.
 */
export function useImportPreviewItems({
  records,
  existing,
  publishers,
  suburbs,
  streets,
}: BuildImportPreviewInput): PublisherImportPreviewItem[] | null {
  // `existing` and `publishers` come from `data ?? []` hooks — a fresh `[]`
  // per render while the query hasn't emitted — so normalize empties too.
  const existingDocs = existing.length ? existing : EMPTY_RECORDS;
  const publisherDocs = publishers.length ? publishers : EMPTY_PUBLISHERS;
  const suburbLookups = suburbs?.length ? suburbs : EMPTY_LOOKUPS;
  const streetLookups = streets?.length ? streets : EMPTY_LOOKUPS;
  const [result, setResult] = useState<{
    records: PublisherLocal[] | null;
    existing: PublisherLocal[];
    publishers: Publisher[];
    suburbs: NameLookup[];
    streets: NameLookup[];
    items: PublisherImportPreviewItem[];
  } | null>(null);

  useEffect(() => {
    // Defer the synchronous diff so the loading indicator can paint first.
    const timer = setTimeout(() => {
      setResult({
        records,
        existing: existingDocs,
        publishers: publisherDocs,
        suburbs: suburbLookups,
        streets: streetLookups,
        items: buildImportPreviewItems({
          records,
          existing: existingDocs,
          publishers: publisherDocs,
          suburbs: suburbLookups,
          streets: streetLookups,
        }),
      });
    }, 0);
    return () => clearTimeout(timer);
  }, [records, existingDocs, publisherDocs, suburbLookups, streetLookups]);

  // Only trust a result computed from the current inputs — anything older is
  // stale and would paint the previous preview until the effect reruns.
  return result &&
    result.records === records &&
    result.existing === existingDocs &&
    result.publishers === publisherDocs &&
    result.suburbs === suburbLookups &&
    result.streets === streetLookups
    ? result.items
    : null;
}

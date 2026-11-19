import { z } from "zod";

import {
  createCollection,
  InvalidStorageDataFormatError,
  localStorageCollectionOptions,
  type Collection,
  type LocalStorageCollectionUtils,
  type StorageApi,
} from "@tanstack/react-db";

import { createSupabaseTableCollection, getCachedCollection } from "../backend/collections.ts";
import { getDefaultStorage } from "../settings/db.ts";
import { isPublisherLocalRecord, publisherLocalSchema, type PublisherLocal } from "./schema.ts";

export const PUBLISHER_LOCAL_STORAGE_KEY = "proclaimer:publisher-local";

export type PublisherLocalCollection = Collection<
  PublisherLocal,
  string,
  LocalStorageCollectionUtils,
  never,
  PublisherLocal
>;

export interface CreatePublisherLocalCollectionOptions {
  id?: string;
  storageKey?: string;
  storage?: StorageApi;
}

function isStoredRowEnvelope(value: unknown): boolean {
  if (typeof value !== "object" || value === null) {
    return false;
  }
  const row = value as { versionKey?: unknown; data?: unknown };
  return typeof row.versionKey === "string" && typeof row.data === "object" && row.data !== null;
}

/**
 * Drops a persisted value that the collection could never load, so corrupted
 * storage does not permanently error the collection. Matches the library's
 * storage format: an object map of `{ versionKey, data }` rows keyed by
 * `publisher_id`.
 */
function removeInvalidStoredRecords(storage: StorageApi, storageKey: string): void {
  let raw: string | null;
  try {
    raw = storage.getItem(storageKey);
  } catch {
    return;
  }
  if (raw === null) {
    return;
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    storage.removeItem(storageKey);
    return;
  }
  if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
    storage.removeItem(storageKey);
    return;
  }
  for (const [key, value] of Object.entries(parsed)) {
    if (!isStoredRowEnvelope(value)) {
      storage.removeItem(storageKey);
      return;
    }
    const data = (value as { data: unknown }).data;
    // The collection keys rows as `s:<publisher_id>` (the library's encoded
    // string key); a mismatch would fail its own load validation.
    if (!isPublisherLocalRecord(data) || key !== `s:${data.publisher_id}`) {
      storage.removeItem(storageKey);
      return;
    }
  }
}

/**
 * Publisher-local records hold confidential contact details kept on-device
 * (there is no Supabase table for them), so the collection persists to
 * localStorage like settings.
 */
export function createPublisherLocalCollection(
  options: CreatePublisherLocalCollectionOptions = {},
): PublisherLocalCollection {
  const storageKey = options.storageKey ?? PUBLISHER_LOCAL_STORAGE_KEY;
  const storage = options.storage ?? getDefaultStorage();
  removeInvalidStoredRecords(storage, storageKey);
  return createCollection(
    localStorageCollectionOptions<PublisherLocal, string>({
      id: options.id ?? "proclaimer-publisher-local",
      storageKey,
      storage,
      getKey: (item) => {
        if (!item || typeof item.publisher_id !== "string" || item.publisher_id.length === 0) {
          throw new InvalidStorageDataFormatError(storageKey, String(item?.publisher_id ?? ""));
        }
        return item.publisher_id;
      },
      startSync: true,
    }),
  );
}

let defaultCollection: PublisherLocalCollection | null = null;

export function getPublisherLocalCollection(): PublisherLocalCollection {
  if (!defaultCollection) {
    defaultCollection = createPublisherLocalCollection();
  }
  return defaultCollection;
}

export async function resetPublisherLocalCollectionForTesting(): Promise<void> {
  const collection = defaultCollection;
  defaultCollection = null;
  await collection?.cleanup().catch(() => {});
}

export function isStoredPublisherLocal(value: unknown): value is PublisherLocal {
  return publisherLocalSchema.safeParse(value).success;
}

const suburbSchema = z.object({
  id: z.string(),
  name: z.string(),
});

const streetSchema = z.object({
  id: z.string(),
  name: z.string(),
});

export type SuburbRow = z.infer<typeof suburbSchema>;
export type StreetRow = z.infer<typeof streetSchema>;

export function createSuburbCollection(congregationId: string) {
  return createSupabaseTableCollection<SuburbRow>({
    table: "suburb",
    id: `suburb:${congregationId}`,
    select: "id,name",
    match: { congregation_id: congregationId },
    schema: suburbSchema,
  });
}

export function createStreetCollection(congregationId: string) {
  return createSupabaseTableCollection<StreetRow>({
    table: "street",
    id: `street:${congregationId}`,
    select: "id,name",
    match: { congregation_id: congregationId },
    schema: streetSchema,
  });
}

export type SuburbCollection = ReturnType<typeof createSuburbCollection>;
export type StreetCollection = ReturnType<typeof createStreetCollection>;

const suburbCollections = new Map<string, SuburbCollection>();
const streetCollections = new Map<string, StreetCollection>();

export function getSuburbCollection(congregationId: string): SuburbCollection {
  const key = congregationId.trim();
  return getCachedCollection(suburbCollections, key, () => createSuburbCollection(key));
}

export function getStreetCollection(congregationId: string): StreetCollection {
  const key = congregationId.trim();
  return getCachedCollection(streetCollections, key, () => createStreetCollection(key));
}

export async function resetTerritoryCollectionsForTesting(): Promise<void> {
  const collections = [...suburbCollections.values(), ...streetCollections.values()];
  suburbCollections.clear();
  streetCollections.clear();
  await Promise.all(collections.map((collection) => collection.cleanup().catch(() => {})));
}

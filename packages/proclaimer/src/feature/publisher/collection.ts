import { createSupabaseTableCollection, getCachedCollection } from "../backend/collections.ts";
import { PUBLISHER_TABLE, publisherSchema, type Publisher } from "./schema.ts";

export function createPublisherCollection(congregationId: string) {
  return createSupabaseTableCollection<Publisher>({
    table: PUBLISHER_TABLE,
    id: `${PUBLISHER_TABLE}:${congregationId}`,
    select: "id,first_name,middle_name,last_name,display_name,congregation_id,auth_id",
    match: { congregation_id: congregationId },
    schema: publisherSchema,
  });
}

export type PublisherCollection = ReturnType<typeof createPublisherCollection>;

const defaultCollections = new Map<string, PublisherCollection>();

export function getPublisherCollection(congregationId: string): PublisherCollection {
  const key = congregationId.trim();
  return getCachedCollection(defaultCollections, key, () => createPublisherCollection(key));
}

// Publishers are not limited to the signed-in congregation: visiting speakers
// (and their placeholder congregations) are publisher rows under other
// congregation ids, so resolving them needs the whole table.
export function createAllPublishersCollection() {
  return createSupabaseTableCollection<Publisher>({
    table: PUBLISHER_TABLE,
    id: `${PUBLISHER_TABLE}:all`,
    select: "id,first_name,middle_name,last_name,display_name,congregation_id,auth_id",
    schema: publisherSchema,
  });
}

export type AllPublishersCollection = ReturnType<typeof createAllPublishersCollection>;

let allPublishersCollection: AllPublishersCollection | null = null;

export function getAllPublishersCollection(): AllPublishersCollection {
  if (!allPublishersCollection) {
    allPublishersCollection = createAllPublishersCollection();
  }
  return allPublishersCollection;
}

export async function resetPublisherCollectionsForTesting(): Promise<void> {
  const collections = [...defaultCollections.values()];
  defaultCollections.clear();
  const allCollection = allPublishersCollection;
  allPublishersCollection = null;
  const all = allCollection ? [...collections, allCollection] : collections;
  await Promise.all(all.map((collection) => collection.cleanup().catch(() => {})));
}

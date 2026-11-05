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

export async function resetPublisherCollectionsForTesting(): Promise<void> {
  const collections = [...defaultCollections.values()];
  defaultCollections.clear();
  await Promise.all(collections.map((collection) => collection.cleanup().catch(() => {})));
}

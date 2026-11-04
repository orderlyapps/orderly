import { createSupabaseTableCollection } from "../backend/collections.ts";
import { EVENT_TABLE, eventSchema, type EventRow } from "./schema.ts";

export function createEventCollection(congregationId: string) {
  return createSupabaseTableCollection<EventRow>({
    table: EVENT_TABLE,
    id: `${EVENT_TABLE}:${congregationId}`,
    select: "id,congregation_id,name,type,all_day,start_date,end_date,details",
    match: { congregation_id: congregationId },
    schema: eventSchema,
  });
}

export type EventCollection = ReturnType<typeof createEventCollection>;

const defaultCollections = new Map<string, EventCollection>();

export function getEventCollection(congregationId: string): EventCollection {
  const key = congregationId.trim();
  let collection = defaultCollections.get(key);
  if (!collection) {
    collection = createEventCollection(key);
    defaultCollections.set(key, collection);
  }
  return collection;
}

export async function resetEventCollectionsForTesting(): Promise<void> {
  const collections = [...defaultCollections.values()];
  defaultCollections.clear();
  await Promise.all(collections.map((collection) => collection.cleanup().catch(() => {})));
}

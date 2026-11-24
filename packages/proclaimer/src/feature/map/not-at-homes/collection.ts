import { createSupabaseTableCollection, getCachedCollection } from "../../backend/collections.ts";
import { NOT_AT_HOME_VIEW, notAtHomeRowSchema, type NotAtHomeRow } from "./schema.ts";

export function createNotAtHomeCollection(congregationId: string) {
  return createSupabaseTableCollection<NotAtHomeRow>({
    table: NOT_AT_HOME_VIEW,
    id: `${NOT_AT_HOME_VIEW}:${congregationId}`,
    select:
      "id,congregation_id,house_number,unit_number,street_name,suburb_name,full_address,write,created_at,longitude,latitude",
    match: { congregation_id: congregationId },
    schema: notAtHomeRowSchema,
  });
}

export type NotAtHomeCollection = ReturnType<typeof createNotAtHomeCollection>;

const defaultCollections = new Map<string, NotAtHomeCollection>();

export function getNotAtHomeCollection(congregationId: string): NotAtHomeCollection {
  const key = congregationId.trim();
  return getCachedCollection(defaultCollections, key, () => createNotAtHomeCollection(key));
}

export async function resetNotAtHomeCollectionsForTesting(): Promise<void> {
  const collections = [...defaultCollections.values()];
  defaultCollections.clear();
  await Promise.all(collections.map((collection) => collection.cleanup().catch(() => {})));
}

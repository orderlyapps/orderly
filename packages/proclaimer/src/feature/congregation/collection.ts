import { createSupabaseTableCollection } from "../backend/collections.ts";
import { CONGREGATION_TABLE, type Congregation } from "./schema.ts";

export function createCongregationCollection() {
  return createSupabaseTableCollection<Congregation>({
    table: CONGREGATION_TABLE,
    id: CONGREGATION_TABLE,
    select: "id,name,congregation_id",
  });
}

export type CongregationCollection = ReturnType<typeof createCongregationCollection>;

let defaultCollection: CongregationCollection | null = null;

export function getCongregationCollection(): CongregationCollection {
  if (!defaultCollection) {
    defaultCollection = createCongregationCollection();
  }
  return defaultCollection;
}

export async function resetCongregationCollectionForTesting(): Promise<void> {
  const collection = defaultCollection;
  defaultCollection = null;
  if (collection) {
    await collection.cleanup().catch(() => {});
  }
}

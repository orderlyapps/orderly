import { useEffect, useState } from "react";

import { getItemsStore, type ItemsStore } from "./db.ts";
import type { CreateItemInput, ItemDocument, ItemPatch } from "./schema.ts";

export interface UseItemsResult {
  items: ItemDocument[];
  isLoading: boolean;
  error: Error | null;
  createItem: (input: CreateItemInput) => Promise<ItemDocument>;
  updateItem: (id: string, patch: ItemPatch) => Promise<ItemDocument>;
  deleteItem: (id: string) => Promise<void>;
  store: ItemsStore | null;
}

export function useItems(customStore?: ItemsStore): UseItemsResult {
  const [store, setStore] = useState<ItemsStore | null>(customStore ?? null);
  const [items, setItems] = useState<ItemDocument[]>(() =>
    customStore ? customStore.listItems() : [],
  );
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    let active = true;
    let unsubscribe: (() => void) | undefined;
    setIsLoading(true);
    setError(null);

    const init = async () => {
      const resolvedStore = customStore ?? (await getItemsStore());
      if (!active) {
        return;
      }
      setStore(resolvedStore);

      const subscription = resolvedStore.itemsCollection.subscribeChanges(
        () => {
          if (!active) {
            return;
          }
          setItems(resolvedStore.listItems());
        },
        { includeInitialState: true },
      );
      unsubscribe = () => subscription.unsubscribe();

      if (!active) {
        return;
      }
      setItems(resolvedStore.listItems());
      setIsLoading(false);
    };

    init().catch((err: unknown) => {
      if (!active) {
        return;
      }
      setError(err instanceof Error ? err : new Error(String(err)));
      setIsLoading(false);
    });

    return () => {
      active = false;
      unsubscribe?.();
    };
  }, [customStore]);

  const resolveStore = async (): Promise<ItemsStore> =>
    customStore ?? store ?? (await getItemsStore());

  return {
    items,
    isLoading,
    error,
    createItem: async (input) => (await resolveStore()).createItem(input),
    updateItem: async (id, patch) => (await resolveStore()).updateItem(id, patch),
    deleteItem: async (id) => (await resolveStore()).deleteItem(id),
    store,
  };
}

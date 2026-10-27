import { queryCollectionOptions } from "@tanstack/query-db-collection";
import { createCollection } from "@tanstack/react-db";
import type { QueryClient } from "@tanstack/react-query";

import { getBackendQueryClient } from "./query-client.ts";
import { getSupabaseClient } from "./supabase.ts";

export interface SupabaseTableCollectionOptions<T extends Record<string, unknown>> {
  table: string;
  id?: string;
  select?: string;
  idColumn?: keyof T & string;
  queryClient?: QueryClient;
}

export function createSupabaseTableCollection<T extends Record<string, unknown>>(
  options: SupabaseTableCollectionOptions<T>,
) {
  const table = () => getSupabaseClient().from(options.table);
  const idColumn: string = options.idColumn ?? "id";

  return createCollection(
    queryCollectionOptions({
      id: options.id ?? `supabase:${options.table}`,
      queryClient: options.queryClient ?? getBackendQueryClient(),
      queryKey: ["supabase", options.table, options.id ?? "default", options.select ?? "*"],
      queryFn: async () => {
        const { data, error } = await table().select(options.select ?? "*");
        if (error) {
          throw error;
        }
        return data as unknown as T[];
      },
      getKey: (item: T) => item[idColumn] as string,
      onInsert: async ({ transaction }) => {
        const rows = transaction.mutations.map(
          (mutation) => mutation.modified as Record<string, unknown>,
        );
        const { error } = await table().insert(rows);
        if (error) {
          throw error;
        }
      },
      onUpdate: async ({ transaction }) => {
        for (const mutation of transaction.mutations) {
          const { error } = await table()
            .update(mutation.changes as Record<string, unknown>)
            .eq(idColumn, mutation.key);
          if (error) {
            throw error;
          }
        }
      },
      onDelete: async ({ transaction }) => {
        const keys = transaction.mutations.map((mutation) => mutation.key);
        const { error } = await table().delete().in(idColumn, keys);
        if (error) {
          throw error;
        }
      },
      startSync: true,
    }),
  );
}

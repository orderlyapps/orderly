import type { PostgrestFilterBuilder, SupabaseClient } from "@supabase/supabase-js";
import { queryCollectionOptions } from "@tanstack/query-db-collection";
import { createCollection } from "@tanstack/react-db";
import type { QueryClient } from "@tanstack/react-query";
import { z } from "zod";

import { getBackendQueryClient } from "./query-client.ts";
import { getSupabaseClient } from "./supabase.ts";

const MAX_CACHED_COLLECTIONS = 5;

/** Matches PostgREST's default `max_rows` cap; pages are fetched in this size. */
const PAGE_SIZE = 1000;

/** The PostgREST filter builder produced by `table().select(...)`; `.from(string)` yields `any`-typed rows. */
type SelectFilterQuery = PostgrestFilterBuilder<any, any, any, any, any, any, any, any>;

/**
 * Bounds a per-key collection cache. Cache hits refresh recency; once the
 * cache exceeds `maxSize`, the oldest entry is evicted and cleaned up
 * (Map preserves insertion order). Prevents unbounded growth across
 * repeated key changes, e.g. switching congregations.
 */
export function getCachedCollection<T extends { cleanup: () => Promise<unknown> }>(
  cache: Map<string, T>,
  key: string,
  create: () => T,
  maxSize = MAX_CACHED_COLLECTIONS,
): T {
  const existing = cache.get(key);
  if (existing) {
    cache.delete(key);
    cache.set(key, existing);
    return existing;
  }
  const collection = create();
  cache.set(key, collection);
  while (cache.size > maxSize) {
    const oldestKey = cache.keys().next().value;
    if (oldestKey === undefined) {
      break;
    }
    const evicted = cache.get(oldestKey);
    cache.delete(oldestKey);
    void evicted?.cleanup().catch(() => {});
  }
  return collection;
}

export interface SupabaseTableCollectionOptions<T extends Record<string, unknown>> {
  table: string;
  id?: string;
  select?: string;
  match?: Record<string, unknown>;
  /**
   * Extra PostgREST filters applied after `match`, e.g.
   * `(q) => q.gte("date", "2025-06-01")`. Filter inputs must be captured in
   * `id` so differently filtered collections never share a query key.
   */
  filter?: (query: SelectFilterQuery) => SelectFilterQuery;
  idColumn?: keyof T & string;
  keyColumns?: (keyof T & string)[];
  queryClient?: QueryClient;
  schema?: z.ZodType<T>;
  onDeleteRows?: (rows: T[]) => Promise<void>;
}

export function createSupabaseTableCollection<T extends Record<string, unknown>>(
  options: SupabaseTableCollectionOptions<T>,
) {
  const table = () => (getSupabaseClient() as SupabaseClient).from(options.table);
  const keyColumns: (keyof T & string)[] = options.keyColumns ?? [
    options.idColumn ?? ("id" as keyof T & string),
  ];
  const matchKey = (row: T) =>
    Object.fromEntries(keyColumns.map((column) => [column, row[column]]));

  return createCollection(
    queryCollectionOptions({
      id: options.id ?? `supabase:${options.table}`,
      queryClient: options.queryClient ?? getBackendQueryClient(),
      queryKey: [
        "supabase",
        options.table,
        options.id ?? "default",
        options.select ?? "*",
        options.match ?? {},
      ],
      queryFn: async () => {
        const buildQuery = () => {
          let query = table().select(options.select ?? "*");
          if (options.match) {
            query = query.match(options.match);
          }
          if (options.filter) {
            query = options.filter(query);
          }
          // Deterministic page order so offset pagination can't skip or
          // repeat rows between fetches.
          for (const column of keyColumns) {
            query = query.order(column);
          }
          return query;
        };
        // PostgREST caps responses at max_rows (1000); page through the
        // result set so larger tables aren't silently truncated.
        const data: unknown[] = [];
        for (let offset = 0; ; offset += PAGE_SIZE) {
          const { data: page, error } = await buildQuery().range(offset, offset + PAGE_SIZE - 1);
          if (error) {
            throw error;
          }
          const rows = (page ?? []) as unknown[];
          data.push(...rows);
          if (rows.length < PAGE_SIZE) {
            break;
          }
        }
        if (options.schema) {
          const rows: T[] = [];
          for (const [index, row] of data.entries()) {
            const parsed = options.schema.safeParse(row);
            if (parsed.success) {
              rows.push(parsed.data);
            } else {
              console.warn(
                `createSupabaseTableCollection: dropping invalid row ${index} from "${options.table}"`,
                parsed.error.issues
                  .map((issue) => `${issue.path.join(".")}: ${issue.message}`)
                  .join("; "),
              );
            }
          }
          return rows;
        }
        return data as T[];
      },
      getKey: (item: T) =>
        keyColumns.length === 1
          ? (item[keyColumns[0]] as string)
          : JSON.stringify(keyColumns.map((column) => item[column])),
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
            .match(matchKey(mutation.original as T));
          if (error) {
            throw error;
          }
        }
      },
      onDelete: async ({ transaction }) => {
        if (options.onDeleteRows) {
          await options.onDeleteRows(
            transaction.mutations.map((mutation) => mutation.original as T),
          );
          return;
        }
        if (keyColumns.length === 1) {
          const idColumn: string = keyColumns[0];
          const keys = transaction.mutations.map((mutation) => mutation.key);
          const { error } = await table().delete().in(idColumn, keys);
          if (error) {
            throw error;
          }
          return;
        }
        for (const mutation of transaction.mutations) {
          const { error } = await table()
            .delete()
            .match(matchKey(mutation.original as T));
          if (error) {
            throw error;
          }
        }
      },
      startSync: true,
    }),
  );
}

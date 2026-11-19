import { afterEach, expect, test, vi } from "vite-plus/test";
import { z } from "zod";

import {
  createSupabaseTableCollection,
  getBackendQueryClient,
  getCachedCollection,
  getSupabaseClient,
  initSupabase,
  resetBackendQueryClientForTesting,
  resetSupabaseClientForTesting,
} from "../src/feature/backend/index.ts";

const TEST_CONFIG = {
  url: "https://example.supabase.co",
  anonKey: "test-anon-key",
};

afterEach(() => {
  resetSupabaseClientForTesting();
  resetBackendQueryClientForTesting();
  vi.restoreAllMocks();
});

test("getSupabaseClient throws before initialization", () => {
  expect(() => getSupabaseClient()).toThrowError(/not initialized/);
});

test("initSupabase returns a client and getSupabaseClient returns the same instance", () => {
  const client = initSupabase(TEST_CONFIG);
  expect(getSupabaseClient()).toBe(client);
});

test("initSupabase keeps the existing client and warns on a different config", () => {
  const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
  const client = initSupabase(TEST_CONFIG);
  const second = initSupabase({ url: "https://other.supabase.co", anonKey: "other-key" });
  expect(second).toBe(client);
  expect(warn).toHaveBeenCalledOnce();
});

test("initSupabase does not warn when the same config is passed again", () => {
  const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
  const client = initSupabase(TEST_CONFIG);
  expect(initSupabase({ ...TEST_CONFIG })).toBe(client);
  expect(warn).not.toHaveBeenCalled();
});

test("getBackendQueryClient returns the same instance until reset", () => {
  const first = getBackendQueryClient();
  expect(getBackendQueryClient()).toBe(first);
  resetBackendQueryClientForTesting();
  expect(getBackendQueryClient()).not.toBe(first);
});

test("table collection drops rows that fail schema validation and warns", async () => {
  const client = initSupabase(TEST_CONFIG);
  const rows = [
    { id: "p1", first_name: "Alice", last_name: "Smith" },
    { id: "p2", last_name: "MissingFirstName" },
    { id: "p3", first_name: "Carol", last_name: "Jones", extra_column: "stripped" },
  ];
  // The real PostgREST builder is chainable and thenable — the query resolves
  // to { data, error } when awaited.
  const query = {
    select: vi.fn().mockReturnThis(),
    match: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    range: vi.fn().mockReturnThis(),
    // eslint-disable-next-line unicorn/no-thenable
    then: (onFulfilled: (value: { data: typeof rows; error: null }) => unknown) =>
      Promise.resolve(onFulfilled({ data: rows, error: null })),
  };
  vi.spyOn(client, "from").mockReturnValue(query as never);
  const warn = vi.spyOn(console, "warn").mockImplementation(() => {});

  const rowSchema = z.object({
    id: z.string().min(1),
    first_name: z.string(),
    last_name: z.string(),
  });
  type Row = z.infer<typeof rowSchema>;

  const collection = createSupabaseTableCollection<Row>({
    table: "publisher",
    id: `rows_test_${Date.now()}`,
    match: { congregation_id: "c1" },
    schema: rowSchema,
  });
  try {
    await collection.preload();
    expect(collection.get("p1")?.first_name).toBe("Alice");
    expect(collection.get("p2")).toBeUndefined();
    expect(collection.get("p3")?.first_name).toBe("Carol");
    expect(collection.get("p3")).not.toHaveProperty("extra_column");
    expect(warn).toHaveBeenCalledOnce();
  } finally {
    await collection.cleanup().catch(() => {});
  }
});

test("table collection paginates past the PostgREST row cap", async () => {
  const client = initSupabase(TEST_CONFIG);
  // 2500 rows -> three 1000-row pages (last page short).
  const rows = Array.from({ length: 2500 }, (_, i) => ({
    id: `p${i}`,
    first_name: `First${i}`,
    last_name: `Last${i}`,
  }));
  let requested: { from: number; to: number } = { from: 0, to: 0 };
  const query = {
    select: vi.fn().mockReturnThis(),
    match: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    range: vi.fn((from: number, to: number) => {
      requested = { from, to };
      return query;
    }),
    // eslint-disable-next-line unicorn/no-thenable
    then: (onFulfilled: (value: { data: typeof rows; error: null }) => unknown) =>
      Promise.resolve(
        onFulfilled({ data: rows.slice(requested.from, requested.to + 1), error: null }),
      ),
  };
  vi.spyOn(client, "from").mockReturnValue(query as never);

  const rowSchema = z.object({
    id: z.string().min(1),
    first_name: z.string(),
    last_name: z.string(),
  });
  type Row = z.infer<typeof rowSchema>;

  const collection = createSupabaseTableCollection<Row>({
    table: "publisher",
    id: `pages_test_${Date.now()}`,
    schema: rowSchema,
  });
  try {
    await collection.preload();
    expect(query.range).toHaveBeenCalledTimes(3);
    expect(query.range).toHaveBeenNthCalledWith(1, 0, 999);
    expect(query.range).toHaveBeenNthCalledWith(2, 1000, 1999);
    expect(query.range).toHaveBeenNthCalledWith(3, 2000, 2999);
    // Pages are ordered by the collection's key columns for stable offsets.
    expect(query.order).toHaveBeenCalledWith("id");
    expect(collection.get("p0")?.first_name).toBe("First0");
    expect(collection.get("p999")?.first_name).toBe("First999");
    expect(collection.get("p2499")?.first_name).toBe("First2499");
  } finally {
    await collection.cleanup().catch(() => {});
  }
});

test("getCachedCollection reuses entries and evicts the oldest past the cap", async () => {
  const cache = new Map<string, { cleanup: () => Promise<void> }>();
  const created: string[] = [];
  const cleaned: string[] = [];
  const make = (key: string) => ({
    key,
    cleanup: () => {
      cleaned.push(key);
      return Promise.resolve();
    },
  });
  const create = (key: string) => () => {
    created.push(key);
    return make(key);
  };

  const a1 = getCachedCollection(cache, "a", create("a"), 2);
  expect(getCachedCollection(cache, "a", create("a"), 2)).toBe(a1);
  expect(created).toEqual(["a"]);

  // Hitting "a" refreshes its recency so "b" evicts before it.
  getCachedCollection(cache, "b", create("b"), 2);
  getCachedCollection(cache, "a", create("a"), 2);
  getCachedCollection(cache, "c", create("c"), 2);
  expect(created).toEqual(["a", "b", "c"]);
  expect([...cache.keys()]).toEqual(["a", "c"]);
  await Promise.resolve();
  expect(cleaned).toEqual(["b"]);
});

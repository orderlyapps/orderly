import { afterEach, expect, test, vi } from "vite-plus/test";
import { z } from "zod";

import {
  createSupabaseTableCollection,
  getBackendQueryClient,
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
  const query = {
    select: vi.fn().mockReturnThis(),
    match: vi.fn().mockResolvedValue({ data: rows, error: null }),
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

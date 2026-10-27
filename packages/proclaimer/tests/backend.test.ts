import { afterEach, expect, test, vi } from "vite-plus/test";

import {
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

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "./types.ts";

export interface SupabaseConfig {
  url: string;
  anonKey: string;
}

export type BackendSupabaseClient = SupabaseClient<Database>;

let supabaseClient: BackendSupabaseClient | null = null;
let supabaseConfig: SupabaseConfig | null = null;

export function createSupabaseClient(config: SupabaseConfig): BackendSupabaseClient {
  return createClient<Database>(config.url, config.anonKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
    },
  });
}

export function initSupabase(config: SupabaseConfig): BackendSupabaseClient {
  if (!supabaseClient) {
    supabaseClient = createSupabaseClient(config);
    supabaseConfig = config;
  } else if (
    supabaseConfig &&
    (supabaseConfig.url !== config.url || supabaseConfig.anonKey !== config.anonKey)
  ) {
    console.warn("initSupabase: ignoring new config; the existing client is kept.");
  }
  return supabaseClient;
}

export function getSupabaseClient(): BackendSupabaseClient {
  if (!supabaseClient) {
    throw new Error(
      "Supabase client is not initialized. Render <BackendProviders supabase={...}> or call initSupabase() first.",
    );
  }
  return supabaseClient;
}

export function resetSupabaseClientForTesting(): void {
  supabaseClient = null;
  supabaseConfig = null;
}

import type { SupabaseConfig } from "proclaimer-core";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabaseConfig: SupabaseConfig | null =
  supabaseUrl && supabaseAnonKey ? { url: supabaseUrl, anonKey: supabaseAnonKey } : null;

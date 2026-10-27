import { useState, type ReactNode } from "react";

import { QueryClientProvider } from "@tanstack/react-query";

import { getBackendQueryClient } from "./query-client.ts";
import { initSupabase, type SupabaseConfig } from "./supabase.ts";

export interface BackendProvidersProps {
  children: ReactNode;
  supabase?: SupabaseConfig | null;
}

export function BackendProviders({ children, supabase }: BackendProvidersProps) {
  const [queryClient] = useState(() => {
    if (supabase) {
      initSupabase(supabase);
    }
    return getBackendQueryClient();
  });

  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}

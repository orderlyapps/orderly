import { QueryClient } from "@tanstack/react-query";

export function createBackendQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 30_000,
        retry: 1,
      },
    },
  });
}

let defaultQueryClient: QueryClient | null = null;

export function getBackendQueryClient(): QueryClient {
  if (!defaultQueryClient) {
    defaultQueryClient = createBackendQueryClient();
  }
  return defaultQueryClient;
}

export function resetBackendQueryClientForTesting(): void {
  defaultQueryClient = null;
}

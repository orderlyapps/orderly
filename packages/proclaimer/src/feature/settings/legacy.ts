import type { StorageApi } from "@tanstack/react-db";

import { isCongregationId } from "./schema.ts";

// The previous proclaimer app stored the selected congregation as a JSON object under
// this localStorage key; migrate its id into settings when the key is present.
export const LEGACY_SELECTED_CONGREGATION_KEY = "selected_congregation";

export function readLegacyCongregationId(storage: StorageApi): string | null {
  try {
    const raw = storage.getItem(LEGACY_SELECTED_CONGREGATION_KEY);
    if (!raw) {
      return null;
    }
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed !== "object" || parsed === null) {
      return null;
    }
    const id = (parsed as { id?: unknown }).id;
    if (!isCongregationId(id) || id.trim().length === 0) {
      return null;
    }
    return id;
  } catch {
    return null;
  }
}

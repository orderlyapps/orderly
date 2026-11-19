import { getDefaultStorage, readSettingsSnapshot, SETTINGS_STORAGE_KEY } from "../settings/db.ts";
import type { Version } from "./schema.ts";

function currentUserId(): string {
  return readSettingsSnapshot(getDefaultStorage(), SETTINGS_STORAGE_KEY)?.publisherId ?? "";
}

export function createVersion(): Version {
  const user = currentUserId();
  const now = Date.now();
  return { created_by: user, updated_by: user, created_at: now, updated_at: now };
}

export function touchVersion(version: Version): Version {
  return { ...version, updated_by: currentUserId(), updated_at: Date.now() };
}

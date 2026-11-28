import type { StorageApi } from "@tanstack/react-db";
import { z } from "zod";

import { midweekParticipationIds, type MidweekParticipationId } from "../midweek-meeting/schema.ts";
import {
  isCongregationId,
  isPublisherId,
  midweekSelectorSettingsSchema,
  type MidweekSelectorSettingsByType,
} from "./schema.ts";

// The previous proclaimer app stored the selected congregation as a JSON object under
// this localStorage key; migrate its id into settings when the key is present.
export const LEGACY_SELECTED_CONGREGATION_KEY = "selected_congregation";

// The previous proclaimer app stored the selected publisher as a JSON object under
// this localStorage key; migrate its id into settings when it belongs to the
// selected congregation.
export const LEGACY_SELECTED_PUBLISHER_KEY = "selected_publisher";

const legacyCongregationSchema = z.looseObject({ id: z.string() });

const legacyPublisherSchema = z.looseObject({
  id: z.string(),
  congregation_id: z.unknown().optional(),
});

export function readLegacyCongregationId(storage: StorageApi): string | null {
  try {
    const raw = storage.getItem(LEGACY_SELECTED_CONGREGATION_KEY);
    if (!raw) {
      return null;
    }
    const parsed = legacyCongregationSchema.safeParse(JSON.parse(raw));
    if (
      !parsed.success ||
      !isCongregationId(parsed.data.id) ||
      parsed.data.id.trim().length === 0
    ) {
      return null;
    }
    return parsed.data.id;
  } catch {
    return null;
  }
}

export interface LegacyPublisherSelection {
  id: string;
  congregationId: string;
}

export function readLegacyPublisher(storage: StorageApi): LegacyPublisherSelection | null {
  try {
    const raw = storage.getItem(LEGACY_SELECTED_PUBLISHER_KEY);
    if (!raw) {
      return null;
    }
    const parsed = legacyPublisherSchema.safeParse(JSON.parse(raw));
    if (!parsed.success || !isPublisherId(parsed.data.id) || parsed.data.id.trim().length === 0) {
      return null;
    }
    return {
      id: parsed.data.id,
      congregationId: isCongregationId(parsed.data.congregation_id)
        ? parsed.data.congregation_id
        : "",
    };
  } catch {
    return null;
  }
}

export const LEGACY_MIDWEEK_SELECTOR_SETTINGS_PREFIX = "proclaimer:midweekSelectorSettings:";

export function legacyMidweekSelectorSettingsKey(participationId: MidweekParticipationId): string {
  return `${LEGACY_MIDWEEK_SELECTOR_SETTINGS_PREFIX}${participationId}`;
}

export function readLegacyMidweekSelectorSettings(
  storage: StorageApi,
): MidweekSelectorSettingsByType {
  const settings: MidweekSelectorSettingsByType = {};
  for (const participationId of midweekParticipationIds) {
    try {
      const raw = storage.getItem(legacyMidweekSelectorSettingsKey(participationId));
      if (!raw) {
        continue;
      }
      const parsed = midweekSelectorSettingsSchema.safeParse(JSON.parse(raw));
      if (parsed.success) {
        settings[participationId] = parsed.data;
      }
    } catch {
      continue;
    }
  }
  return settings;
}

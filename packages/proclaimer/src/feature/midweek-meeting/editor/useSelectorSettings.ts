import { useCallback } from "react";

import type { MidweekParticipationId } from "../schema.ts";
import { getSettingsStore, type SettingsStore } from "../../settings/db.ts";
import { useSettings } from "../../settings/hooks.ts";
import {
  DEFAULT_MIDWEEK_SELECTOR_SETTINGS,
  type MidweekSelectorSettings,
} from "../../settings/schema.ts";

export type PublisherSelectorSettings = MidweekSelectorSettings;

let selectorSettingsUpdateQueue: Promise<void> = Promise.resolve();

export function queueMidweekSelectorSettingsUpdate(
  participationId: MidweekParticipationId,
  patch: Partial<PublisherSelectorSettings>,
  existingStore?: SettingsStore,
): Promise<void> {
  if (patch.gender === undefined && patch.statParticipationTypes === undefined) {
    return Promise.resolve();
  }
  const update = selectorSettingsUpdateQueue
    .then(async () => {
      const store = existingStore ?? (await getSettingsStore());
      const current = await store.getSettings();
      const existing =
        current.midweekSelectorSettings[participationId] ?? DEFAULT_MIDWEEK_SELECTOR_SETTINGS;
      await store.updateSettings({
        midweekSelectorSettings: {
          ...current.midweekSelectorSettings,
          [participationId]: {
            gender: patch.gender ?? existing.gender,
            statParticipationTypes: patch.statParticipationTypes
              ? [...patch.statParticipationTypes]
              : [...existing.statParticipationTypes],
          },
        },
      });
    })
    .catch(() => {
      // Persisting selector preferences is best-effort
    });
  selectorSettingsUpdateQueue = update;
  return update;
}

export function useSelectorSettings(participationId: MidweekParticipationId | null) {
  const settingsApi = useSettings();

  const settings = participationId
    ? (settingsApi.settings.midweekSelectorSettings[participationId] ??
      DEFAULT_MIDWEEK_SELECTOR_SETTINGS)
    : DEFAULT_MIDWEEK_SELECTOR_SETTINGS;

  const setSettings = useCallback(
    (patch: Partial<PublisherSelectorSettings>) => {
      if (!participationId) {
        return;
      }
      void queueMidweekSelectorSettingsUpdate(
        participationId,
        patch,
        settingsApi.store ?? undefined,
      );
    },
    [participationId, settingsApi.store],
  );

  return { settings, setSettings };
}

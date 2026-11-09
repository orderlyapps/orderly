import { useCallback, useState } from "react";

import type { MidweekParticipationId } from "../schema.ts";
import { midweekParticipationIds } from "../schema.ts";
import type { GenderFilter } from "./assignments.ts";
import { getDefaultStorage } from "../../settings/db.ts";

export interface PublisherSelectorSettings {
  gender: GenderFilter;
  /** Participation types whose past assignments feed the "weeks away" stat. */
  statParticipationTypes: MidweekParticipationId[];
}

const GENDER_VALUES: GenderFilter[] = ["all", "male", "female"];
const PARTICIPATION_VALUES = new Set<string>(midweekParticipationIds);

function storageKey(participationId: MidweekParticipationId): string {
  return `proclaimer:midweekSelectorSettings:${participationId}`;
}

function defaultSettings(participationId: MidweekParticipationId): PublisherSelectorSettings {
  return { gender: "all", statParticipationTypes: [participationId] };
}

function readStoredSettings(participationId: MidweekParticipationId): PublisherSelectorSettings {
  const defaults = defaultSettings(participationId);
  let raw: string | null = null;
  try {
    raw = getDefaultStorage().getItem(storageKey(participationId));
  } catch {
    return defaults;
  }
  if (!raw) {
    return defaults;
  }
  try {
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed !== "object" || parsed === null) {
      return defaults;
    }
    const p = parsed as Record<string, unknown>;
    return {
      gender: GENDER_VALUES.includes(p.gender as GenderFilter)
        ? (p.gender as GenderFilter)
        : defaults.gender,
      statParticipationTypes:
        Array.isArray(p.statParticipationTypes) &&
        p.statParticipationTypes.length > 0 &&
        p.statParticipationTypes.every((t) => PARTICIPATION_VALUES.has(t as string))
          ? (p.statParticipationTypes as MidweekParticipationId[])
          : defaults.statParticipationTypes,
    };
  } catch {
    return defaults;
  }
}

export function useSelectorSettings(participationId: MidweekParticipationId | null) {
  const [state, setState] = useState<{
    type: MidweekParticipationId | null;
    settings: PublisherSelectorSettings;
  }>(() => ({
    type: participationId,
    settings: participationId ? readStoredSettings(participationId) : defaultSettings("prayer"),
  }));

  if (state.type !== participationId) {
    setState({
      type: participationId,
      settings: participationId ? readStoredSettings(participationId) : defaultSettings("prayer"),
    });
  }

  const setSettings = useCallback(
    (next: PublisherSelectorSettings) => {
      if (!participationId) {
        return;
      }
      try {
        getDefaultStorage().setItem(storageKey(participationId), JSON.stringify(next));
      } catch {
        // Persisting selector preferences is best-effort
      }
      setState({ type: participationId, settings: next });
    },
    [participationId],
  );

  return { settings: state.settings, setSettings };
}

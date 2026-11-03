import { useEffect, useState } from "react";

import {
  getDefaultStorage,
  getSettingsStore,
  readSettingsSnapshot,
  SETTINGS_STORAGE_KEY,
  type SettingsStore,
} from "./db.ts";
import { readLegacyCongregationId, readLegacyPublisher } from "./legacy.ts";
import {
  areSettingsEqual,
  DEFAULT_SETTINGS,
  DEFAULT_SETTINGS_ID,
  normalizeSettingsDocument,
  type SettingsDocument,
  type SettingsKey,
  type SettingsPatch,
  type ThemeMode,
} from "./schema.ts";
import { applyTheme } from "./theme.ts";

export interface UseSettingsResult {
  settings: SettingsDocument;
  theme: ThemeMode;
  isLoading: boolean;
  error: Error | null;
  updateSettings: (patch: SettingsPatch) => Promise<SettingsDocument>;
  setSetting: <K extends SettingsKey>(
    key: K,
    value: SettingsDocument[K],
  ) => Promise<SettingsDocument>;
  setTheme: (theme: ThemeMode) => Promise<SettingsDocument>;
  store: SettingsStore | null;
}

function getInitialSettings(customStore?: SettingsStore): SettingsDocument {
  const existing = customStore?.collection.get(DEFAULT_SETTINGS_ID);
  if (existing) {
    return normalizeSettingsDocument(existing);
  }
  const storage = customStore ? customStore.storage : getDefaultStorage();
  const storageKey = customStore ? customStore.storageKey : SETTINGS_STORAGE_KEY;
  const initial = readSettingsSnapshot(storage, storageKey) ?? { ...DEFAULT_SETTINGS };
  let resolved = initial;
  if (resolved.congregationId.trim().length === 0) {
    const legacyCongregationId = readLegacyCongregationId(storage);
    if (legacyCongregationId) {
      resolved = { ...resolved, congregationId: legacyCongregationId };
    }
  }
  if (resolved.publisherId.trim().length === 0 && resolved.congregationId.trim().length > 0) {
    const legacyPublisher = readLegacyPublisher(storage);
    if (legacyPublisher?.congregationId === resolved.congregationId) {
      resolved = { ...resolved, publisherId: legacyPublisher.id };
    }
  }
  return resolved;
}

export function useSettings(customStore?: SettingsStore): UseSettingsResult {
  const [store, setStore] = useState<SettingsStore | null>(customStore ?? null);
  const [settings, setSettings] = useState<SettingsDocument>(() => getInitialSettings(customStore));
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    let active = true;
    let unsubscribeCollection: (() => void) | undefined;
    setIsLoading(true);
    setError(null);

    const init = async () => {
      const resolvedStore = customStore ?? (await getSettingsStore());
      if (!active) {
        return;
      }
      setStore(resolvedStore);

      const subscription = resolvedStore.collection.subscribeChanges(
        () => {
          if (!active) {
            return;
          }
          const current = resolvedStore.collection.get(DEFAULT_SETTINGS_ID);
          const normalized = current ? normalizeSettingsDocument(current) : { ...DEFAULT_SETTINGS };
          setSettings((prev) => (areSettingsEqual(prev, normalized) ? prev : normalized));
        },
        { includeInitialState: true },
      );
      unsubscribeCollection = () => subscription.unsubscribe();

      const initial = await resolvedStore.getSettings();
      if (!active) {
        return;
      }
      setSettings((prev) => (areSettingsEqual(prev, initial) ? prev : initial));
      setIsLoading(false);
    };

    init().catch((err: unknown) => {
      if (!active) {
        return;
      }
      setError(err instanceof Error ? err : new Error(String(err)));
      setIsLoading(false);
    });

    return () => {
      active = false;
      unsubscribeCollection?.();
    };
  }, [customStore]);

  const handleUpdateSettings = async (patch: SettingsPatch): Promise<SettingsDocument> => {
    const resolvedStore = customStore ?? store ?? (await getSettingsStore());
    const updated = await resolvedStore.updateSettings(patch);
    setSettings(updated);
    return updated;
  };

  const handleSetSetting = async <K extends SettingsKey>(
    key: K,
    value: SettingsDocument[K],
  ): Promise<SettingsDocument> => {
    return handleUpdateSettings({ [key]: value } as SettingsPatch);
  };

  const handleSetTheme = async (nextTheme: ThemeMode): Promise<SettingsDocument> => {
    return handleSetSetting("theme", nextTheme);
  };

  return {
    settings,
    theme: settings.theme,
    isLoading,
    error,
    updateSettings: handleUpdateSettings,
    setSetting: handleSetSetting,
    setTheme: handleSetTheme,
    store,
  };
}

export function useThemeEffect(customStore?: SettingsStore): ThemeMode {
  const { theme } = useSettings(customStore);

  useEffect(() => {
    applyTheme(theme);

    if (
      theme !== "system" ||
      typeof window === "undefined" ||
      typeof window.matchMedia !== "function"
    ) {
      return;
    }

    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    const listener = () => {
      applyTheme("system");
    };
    mediaQuery.addEventListener("change", listener);
    return () => {
      mediaQuery.removeEventListener("change", listener);
    };
  }, [theme]);

  return theme;
}

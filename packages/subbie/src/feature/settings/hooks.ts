import { useEffect, useState } from "react";

import { getSettingsStore, type SettingsStore } from "./db.ts";
import {
  DEFAULT_SETTINGS,
  DEFAULT_SETTINGS_ID,
  type SettingsDocument,
  type ThemeMode,
} from "./schema.ts";
import { applyTheme, getCachedTheme, setCachedTheme } from "./theme.ts";

export interface UseSettingsResult {
  settings: SettingsDocument;
  theme: ThemeMode;
  isLoading: boolean;
  error: Error | null;
  setTheme: (theme: ThemeMode) => Promise<SettingsDocument>;
  store: SettingsStore | null;
}

export function useSettings(customStore?: SettingsStore): UseSettingsResult {
  const [store, setStore] = useState<SettingsStore | null>(customStore ?? null);
  const [settings, setSettings] = useState<SettingsDocument>(() => {
    const cachedTheme = getCachedTheme();
    return cachedTheme ? { ...DEFAULT_SETTINGS, theme: cachedTheme } : DEFAULT_SETTINGS;
  });
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

      const subscription = resolvedStore.collection.subscribeChanges(() => {
        const current = resolvedStore.collection.get(DEFAULT_SETTINGS_ID);
        if (current && active) {
          setCachedTheme(current.theme);
          setSettings((prev) =>
            prev.id === current.id && prev.theme === current.theme
              ? prev
              : { id: current.id, theme: current.theme },
          );
        }
      });
      unsubscribeCollection = () => subscription.unsubscribe();

      const initial = await resolvedStore.getSettings();
      if (!active) {
        return;
      }
      setCachedTheme(initial.theme);
      setSettings((prev) =>
        prev.id === initial.id && prev.theme === initial.theme ? prev : initial,
      );
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

  const handleSetTheme = async (nextTheme: ThemeMode): Promise<SettingsDocument> => {
    const resolvedStore = store ?? customStore ?? (await getSettingsStore());
    const updated = await resolvedStore.setTheme(nextTheme);
    setCachedTheme(updated.theme);
    setSettings(updated);
    return updated;
  };

  return {
    settings,
    theme: settings.theme,
    isLoading,
    error,
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

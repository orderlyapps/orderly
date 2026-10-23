import { isThemeMode, THEME_MODES, type ThemeMode } from "./schema.ts";

export const DARK_PALETTE_CLASS = "ion-palette-dark";
export const THEME_STORAGE_KEY = "subbie:theme";

export const THEME_LABELS: Record<ThemeMode, string> = {
  light: "Light",
  dark: "Dark",
  system: "System",
};

export const THEME_OPTIONS: ReadonlyArray<{ value: ThemeMode; label: string }> = THEME_MODES.map(
  (value) => ({
    value,
    label: THEME_LABELS[value],
  }),
);

export function getCachedTheme(): ThemeMode | null {
  try {
    if (typeof localStorage === "undefined") {
      return null;
    }
    const raw = localStorage.getItem(THEME_STORAGE_KEY);
    return isThemeMode(raw) ? raw : null;
  } catch {
    return null;
  }
}

export function setCachedTheme(theme: ThemeMode): void {
  try {
    if (typeof localStorage !== "undefined") {
      localStorage.setItem(THEME_STORAGE_KEY, theme);
    }
  } catch {
    // Ignore storage quota or access errors
  }
}

export function resolveIsDarkTheme(theme: ThemeMode): boolean {
  if (theme === "dark") {
    return true;
  }
  if (theme === "light") {
    return false;
  }
  if (typeof window !== "undefined" && typeof window.matchMedia === "function") {
    return window.matchMedia("(prefers-color-scheme: dark)").matches;
  }
  return false;
}

export function applyTheme(theme: ThemeMode, rootElement?: HTMLElement | null): boolean {
  const isDark = resolveIsDarkTheme(theme);
  const target = rootElement ?? (typeof document !== "undefined" ? document.documentElement : null);
  if (target) {
    target.classList.toggle(DARK_PALETTE_CLASS, isDark);
    target.dataset.theme = theme;
  }
  return isDark;
}

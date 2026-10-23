import { THEME_MODES, type ThemeMode } from "./schema.ts";

export const DARK_PALETTE_CLASS = "ion-palette-dark";

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
  if (typeof document !== "undefined") {
    const themeColor = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]');
    if (themeColor) {
      themeColor.content = isDark ? "#000000" : "#ffffff";
    }
  }
  return isDark;
}

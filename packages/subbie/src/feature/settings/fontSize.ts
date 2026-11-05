import { FONT_SIZES, type FontSize } from "./schema.ts";

export const FONT_SIZE_LABELS: Record<FontSize, string> = {
  small: "Small",
  medium: "Medium",
  large: "Large",
  "extra-large": "Extra Large",
};

export const FONT_SIZE_OPTIONS: ReadonlyArray<{ value: FontSize; label: string }> = FONT_SIZES.map(
  (value) => ({
    value,
    label: FONT_SIZE_LABELS[value],
  }),
);

export const FONT_SIZE_PERCENTAGES: Record<FontSize, number> = {
  small: 85,
  medium: 100,
  large: 115,
  "extra-large": 130,
};

export function applyFontSize(fontSize: FontSize, rootElement?: HTMLElement | null): void {
  const target = rootElement ?? (typeof document !== "undefined" ? document.documentElement : null);
  if (!target) {
    return;
  }
  const percentage = FONT_SIZE_PERCENTAGES[fontSize];
  target.style.fontSize = `${percentage}%`;
  target.style.setProperty("--ion-dynamic-font", `${percentage}% var(--ion-font-family)`);
  target.dataset.fontSize = fontSize;
}

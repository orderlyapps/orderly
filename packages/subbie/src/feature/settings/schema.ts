import type { RxJsonSchema } from "rxdb/plugins/core";

export const THEME_MODES = ["light", "dark", "system"] as const;

export type ThemeMode = (typeof THEME_MODES)[number];

export interface SettingsDocument {
  id: string;
  theme: ThemeMode;
}

export const DEFAULT_SETTINGS_ID = "default";

export const DEFAULT_SETTINGS: SettingsDocument = {
  id: DEFAULT_SETTINGS_ID,
  theme: "system",
};

export function isThemeMode(value: unknown): value is ThemeMode {
  return typeof value === "string" && (THEME_MODES as readonly string[]).includes(value);
}

export function isSettingsDocument(value: unknown): value is SettingsDocument {
  if (typeof value !== "object" || value === null) {
    return false;
  }
  const candidate = value as Record<string, unknown>;
  return (
    typeof candidate.id === "string" && candidate.id.length > 0 && isThemeMode(candidate.theme)
  );
}

export const settingsRxSchema: RxJsonSchema<SettingsDocument> = {
  title: "settings",
  version: 0,
  primaryKey: "id",
  type: "object",
  properties: {
    id: {
      type: "string",
      maxLength: 64,
    },
    theme: {
      type: "string",
      enum: [...THEME_MODES],
    },
  },
  required: ["id", "theme"],
};

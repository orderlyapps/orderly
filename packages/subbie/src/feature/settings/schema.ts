import type { RxJsonSchema } from "rxdb/plugins/core";

export const THEME_MODES = ["light", "dark", "system"] as const;

export type ThemeMode = (typeof THEME_MODES)[number];

export interface SettingsDocument {
  id: string;
  theme: ThemeMode;
}

export type SettingsKey = Exclude<keyof SettingsDocument, "id">;

export type SettingsPatch = Partial<Omit<SettingsDocument, "id">>;

export const SETTINGS_ID_MAX_LENGTH = 64;

export const DEFAULT_SETTINGS_ID = "default";

export const DEFAULT_SETTINGS: SettingsDocument = {
  id: DEFAULT_SETTINGS_ID,
  theme: "system",
};

export function isThemeMode(value: unknown): value is ThemeMode {
  return typeof value === "string" && (THEME_MODES as readonly string[]).includes(value);
}

export function isValidSettingsId(value: unknown): value is string {
  return typeof value === "string" && value.length > 0 && value.length <= SETTINGS_ID_MAX_LENGTH;
}

type SettingsValidatorMap = {
  [K in SettingsKey]: (value: unknown) => value is SettingsDocument[K];
};

const SETTINGS_VALIDATORS: SettingsValidatorMap = {
  theme: isThemeMode,
};

export const SETTINGS_KEYS: readonly SettingsKey[] = Object.freeze(
  Object.keys(SETTINGS_VALIDATORS) as SettingsKey[],
);

export function isSettingValue<K extends SettingsKey>(
  key: K,
  value: unknown,
): value is SettingsDocument[K] {
  return SETTINGS_VALIDATORS[key](value);
}

function copyValidSetting<K extends SettingsKey>(
  source: Partial<Record<SettingsKey, unknown>>,
  target: Partial<SettingsDocument>,
  key: K,
): void {
  const candidate = source[key];
  if (isSettingValue(key, candidate)) {
    target[key] = candidate;
  }
}

export function isSettingsDocument(value: unknown): value is SettingsDocument {
  if (typeof value !== "object" || value === null) {
    return false;
  }
  const candidate = value as Record<string, unknown>;
  if (!isValidSettingsId(candidate.id)) {
    return false;
  }
  return SETTINGS_KEYS.every((key) => isSettingValue(key, candidate[key]));
}

export function normalizeSettingsDocument(
  value?: Partial<SettingsDocument> | null,
): SettingsDocument {
  const normalized: SettingsDocument = {
    ...DEFAULT_SETTINGS,
    id: isValidSettingsId(value?.id) ? value.id : DEFAULT_SETTINGS.id,
  };
  if (value) {
    for (const key of SETTINGS_KEYS) {
      copyValidSetting(value, normalized, key);
    }
  }
  return normalized;
}

export function toSettingsPatch(value: Partial<SettingsDocument>): SettingsPatch {
  const patch: SettingsPatch = {};
  for (const key of SETTINGS_KEYS) {
    copyValidSetting(value, patch, key);
  }
  return patch;
}

export function areSettingsEqual(a: SettingsDocument, b: SettingsDocument): boolean {
  if (a.id !== b.id) {
    return false;
  }
  return SETTINGS_KEYS.every((key) => a[key] === b[key]);
}

export const settingsRxSchema: RxJsonSchema<SettingsDocument> = {
  title: "settings",
  version: 0,
  primaryKey: "id",
  type: "object",
  properties: {
    id: {
      type: "string",
      maxLength: SETTINGS_ID_MAX_LENGTH,
    },
    theme: {
      type: "string",
      enum: [...THEME_MODES],
    },
  },
  required: ["id", ...SETTINGS_KEYS],
};

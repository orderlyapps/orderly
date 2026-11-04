import { z } from "zod";

export const THEME_MODES = ["light", "dark", "system"] as const;

export const themeModeSchema = z.enum(THEME_MODES);

export type ThemeMode = z.infer<typeof themeModeSchema>;

export const CONGREGATION_ID_MAX_LENGTH = 64;

export const PUBLISHER_ID_MAX_LENGTH = 64;

export const SETTINGS_ID_MAX_LENGTH = 64;

const optionalIdString = (maxLength: number) =>
  z
    .string()
    .max(maxLength)
    .refine((value) => value.length === 0 || value.trim().length > 0);

export const congregationIdSchema = optionalIdString(CONGREGATION_ID_MAX_LENGTH);

export const publisherIdSchema = optionalIdString(PUBLISHER_ID_MAX_LENGTH);

export const settingsIdSchema = z.string().min(1).max(SETTINGS_ID_MAX_LENGTH);

const SETTINGS_FIELD_SCHEMAS = {
  theme: themeModeSchema,
  congregationId: congregationIdSchema,
  publisherId: publisherIdSchema,
} as const;

export const settingsDocumentSchema = z.object({
  id: settingsIdSchema,
  ...SETTINGS_FIELD_SCHEMAS,
});

export const settingsPatchSchema = z.object(SETTINGS_FIELD_SCHEMAS).partial();

export type SettingsDocument = z.infer<typeof settingsDocumentSchema>;

export type SettingsKey = Exclude<keyof SettingsDocument, "id">;

export type SettingsPatch = z.infer<typeof settingsPatchSchema>;

export const DEFAULT_SETTINGS_ID = "default";

export const DEFAULT_SETTINGS: SettingsDocument = {
  id: DEFAULT_SETTINGS_ID,
  theme: "system",
  congregationId: "",
  publisherId: "",
};

export function isThemeMode(value: unknown): value is ThemeMode {
  return themeModeSchema.safeParse(value).success;
}

export function isCongregationId(value: unknown): value is string {
  return congregationIdSchema.safeParse(value).success;
}

export function isPublisherId(value: unknown): value is string {
  return publisherIdSchema.safeParse(value).success;
}

export function isValidSettingsId(value: unknown): value is string {
  return settingsIdSchema.safeParse(value).success;
}

export const SETTINGS_KEYS: readonly SettingsKey[] = Object.freeze(
  Object.keys(SETTINGS_FIELD_SCHEMAS) as SettingsKey[],
);

export function isSettingValue<K extends SettingsKey>(
  key: K,
  value: unknown,
): value is SettingsDocument[K] {
  return SETTINGS_FIELD_SCHEMAS[key].safeParse(value).success;
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
  return settingsDocumentSchema.safeParse(value).success;
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

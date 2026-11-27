import { z } from "zod";

export const THEME_MODES = ["light", "dark", "system"] as const;

export const themeModeSchema = z.enum(THEME_MODES);

export type ThemeMode = z.infer<typeof themeModeSchema>;

export const CONGREGATION_ID_MAX_LENGTH = 64;

export const PUBLISHER_ID_MAX_LENGTH = 64;

export const SELECTED_MAP_MAX_LENGTH = 256;

export const SETTINGS_ID_MAX_LENGTH = 64;

const optionalIdString = (maxLength: number) =>
  z
    .string()
    .max(maxLength)
    .refine((value) => value.length === 0 || value.trim().length > 0);

export const congregationIdSchema = optionalIdString(CONGREGATION_ID_MAX_LENGTH);

export const publisherIdSchema = optionalIdString(PUBLISHER_ID_MAX_LENGTH);

export const selectedMapSchema = z
  .string()
  .min(1)
  .max(SELECTED_MAP_MAX_LENGTH)
  .refine((value) => value.trim().length > 0);

export const selectedMapsSchema = z.record(
  z.string().min(1).max(CONGREGATION_ID_MAX_LENGTH),
  selectedMapSchema,
);

export const settingsIdSchema = z.string().min(1).max(SETTINGS_ID_MAX_LENGTH);

export const NOT_AT_HOME_VISIBILITIES = ["all", "hide_old", "hide_new"] as const;

export const notAtHomeVisibilitySchema = z.enum(NOT_AT_HOME_VISIBILITIES);

export type NotAtHomeVisibility = z.infer<typeof notAtHomeVisibilitySchema>;

export const MAP_EDIT_COLOR_SCHEMES = ["standard", "multicolored"] as const;

export const mapEditColorSchemeSchema = z.enum(MAP_EDIT_COLOR_SCHEMES);

export type MapEditColorScheme = z.infer<typeof mapEditColorSchemeSchema>;

export const NOT_AT_HOME_STALE_DAYS_MAX = 365;

export const notAtHomeStaleDaysSchema = z.number().int().min(0).max(NOT_AT_HOME_STALE_DAYS_MAX);

export const RECENT_MAP_COUNT_CHOICES = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10] as const;

export const RECENT_MAP_COUNT_MAX = Math.max(...RECENT_MAP_COUNT_CHOICES);

export const RECENT_SELECTED_MAPS_MAX_LENGTH = RECENT_MAP_COUNT_MAX;

export const recentMapCountSchema = z.number().int().min(0).max(RECENT_MAP_COUNT_MAX);

export const recentSelectedMapsSchema = z.record(
  z.string().min(1).max(CONGREGATION_ID_MAX_LENGTH),
  z.array(selectedMapSchema).max(RECENT_SELECTED_MAPS_MAX_LENGTH),
);

const SETTINGS_FIELD_SCHEMAS = {
  theme: themeModeSchema,
  congregationId: congregationIdSchema,
  publisherId: publisherIdSchema,
  selectedMaps: selectedMapsSchema,
  recentSelectedMaps: recentSelectedMapsSchema,
  recentMapCount: recentMapCountSchema,
  notAtHomeStaleDays: notAtHomeStaleDaysSchema,
  notAtHomeVisibility: notAtHomeVisibilitySchema,
  mapEditColorScheme: mapEditColorSchemeSchema,
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
  selectedMaps: {},
  recentSelectedMaps: {},
  recentMapCount: 5,
  notAtHomeStaleDays: 90,
  notAtHomeVisibility: "all",
  mapEditColorScheme: "multicolored",
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

export function isSelectedMap(value: unknown): value is string {
  return selectedMapSchema.safeParse(value).success;
}

export function isSelectedMaps(value: unknown): value is Record<string, string> {
  return selectedMapsSchema.safeParse(value).success;
}

export function isRecentMapCount(value: unknown): value is number {
  return recentMapCountSchema.safeParse(value).success;
}

export function isRecentSelectedMaps(value: unknown): value is Record<string, string[]> {
  return recentSelectedMapsSchema.safeParse(value).success;
}

export function recordRecentMapSelection(
  recentSelectedMaps: Record<string, string[]>,
  congregationId: string,
  mapKey: string,
  seedKey?: string | null,
): Record<string, string[]> {
  const stored = recentSelectedMaps[congregationId] ?? [];
  const existing = stored.length > 0 ? stored : seedKey ? [seedKey] : [];
  return {
    ...recentSelectedMaps,
    [congregationId]: [mapKey, ...existing.filter((key) => key !== mapKey)].slice(
      0,
      RECENT_SELECTED_MAPS_MAX_LENGTH,
    ),
  };
}

export function isNotAtHomeStaleDays(value: unknown): value is number {
  return notAtHomeStaleDaysSchema.safeParse(value).success;
}

export function isNotAtHomeVisibility(value: unknown): value is NotAtHomeVisibility {
  return notAtHomeVisibilitySchema.safeParse(value).success;
}

export function isMapEditColorScheme(value: unknown): value is MapEditColorScheme {
  return mapEditColorSchemeSchema.safeParse(value).success;
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

function areStringArraysEqual(a: string[], b: string[]): boolean {
  return a.length === b.length && a.every((value, index) => value === b[index]);
}

function areSelectedMapsEqual(a: Record<string, string>, b: Record<string, string>): boolean {
  const aKeys = Object.keys(a);
  const bKeys = Object.keys(b);
  return aKeys.length === bKeys.length && aKeys.every((key) => a[key] === b[key]);
}

function areRecentSelectedMapsEqual(
  a: Record<string, string[]>,
  b: Record<string, string[]>,
): boolean {
  const aKeys = Object.keys(a);
  const bKeys = Object.keys(b);
  return (
    aKeys.length === bKeys.length &&
    aKeys.every((key) => Array.isArray(b[key]) && areStringArraysEqual(a[key] ?? [], b[key] ?? []))
  );
}

export function areSettingsEqual(a: SettingsDocument, b: SettingsDocument): boolean {
  if (a.id !== b.id) {
    return false;
  }
  return SETTINGS_KEYS.every((key) => {
    if (key === "selectedMaps") {
      return areSelectedMapsEqual(a[key], b[key]);
    }
    if (key === "recentSelectedMaps") {
      return areRecentSelectedMapsEqual(a[key], b[key]);
    }
    return a[key] === b[key];
  });
}

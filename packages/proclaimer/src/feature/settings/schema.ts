import { z } from "zod";

import { midweekParticipationIds, type MidweekParticipationId } from "../midweek-meeting/schema.ts";
import { publisherTypeSchema, type PublisherType } from "../publisher/index.ts";

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

export const emergencyContactsVisibleTypesSchema = z.array(publisherTypeSchema);

export const emergencyContactsShowArchivedSchema = z.boolean();

export type EmergencyContactsVisibleTypes = PublisherType[];

export const DEFAULT_EMERGENCY_CONTACTS_VISIBLE_TYPES: EmergencyContactsVisibleTypes = [
  ...publisherTypeSchema.options,
];

export const MIDWEEK_SELECTOR_GENDERS = ["all", "male", "female"] as const;

export const midweekSelectorGenderSchema = z.enum(MIDWEEK_SELECTOR_GENDERS);

export type MidweekSelectorGender = z.infer<typeof midweekSelectorGenderSchema>;

export const MIDWEEK_SELECTOR_SORTS = ["same_type", "any"] as const;

export const midweekSelectorSortSchema = z.enum(MIDWEEK_SELECTOR_SORTS);

export type MidweekSelectorSort = z.infer<typeof midweekSelectorSortSchema>;

export const midweekParticipationIdSchema = z.enum(midweekParticipationIds);

export const midweekSelectorSettingsSchema = z.object({
  gender: midweekSelectorGenderSchema,
  /** Participation types whose past assignments feed the "weeks away" stat. */
  statParticipationTypes: z.array(midweekParticipationIdSchema),
  sortBy: midweekSelectorSortSchema.default("any"),
});

export type MidweekSelectorSettings = z.infer<typeof midweekSelectorSettingsSchema>;

export const midweekSelectorSettingsByTypeSchema = z.partialRecord(
  midweekParticipationIdSchema,
  midweekSelectorSettingsSchema,
);

export type MidweekSelectorSettingsByType = z.infer<typeof midweekSelectorSettingsByTypeSchema>;

export const DEFAULT_MIDWEEK_ANY_STAT_PARTICIPATION_TYPES: MidweekParticipationId[] =
  midweekParticipationIds.filter((id) => id !== "talk");

export const DEFAULT_MIDWEEK_SELECTOR_SETTINGS: MidweekSelectorSettings = {
  gender: "all",
  statParticipationTypes: [...DEFAULT_MIDWEEK_ANY_STAT_PARTICIPATION_TYPES],
  sortBy: "any",
};

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
  emergencyContactsVisibleTypes: emergencyContactsVisibleTypesSchema,
  emergencyContactsShowArchived: emergencyContactsShowArchivedSchema,
  midweekSelectorSettings: midweekSelectorSettingsByTypeSchema,
} as const;

export const settingsDocumentSchema = z.object({
  id: settingsIdSchema,
  ...SETTINGS_FIELD_SCHEMAS,
});

export const settingsPatchSchema = z.object(SETTINGS_FIELD_SCHEMAS).partial();

export type SettingsDocument = z.infer<typeof settingsDocumentSchema>;

export type SettingsKey = Exclude<keyof SettingsDocument, "id">;

export type RecordSettingsKey = "selectedMaps" | "recentSelectedMaps" | "midweekSelectorSettings";

export type ScalarSettingsKey = Exclude<SettingsKey, RecordSettingsKey>;

export type SettingsUpdatedAt = Partial<Record<ScalarSettingsKey, number>> & {
  selectedMaps?: Record<string, number>;
  recentSelectedMaps?: Record<string, number>;
  midweekSelectorSettings?: Partial<Record<MidweekParticipationId, number>>;
};

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
  emergencyContactsVisibleTypes: [...DEFAULT_EMERGENCY_CONTACTS_VISIBLE_TYPES],
  emergencyContactsShowArchived: false,
  midweekSelectorSettings: {},
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

export function isEmergencyContactsVisibleTypes(
  value: unknown,
): value is EmergencyContactsVisibleTypes {
  return emergencyContactsVisibleTypesSchema.safeParse(value).success;
}

export function isEmergencyContactsShowArchived(value: unknown): value is boolean {
  return emergencyContactsShowArchivedSchema.safeParse(value).success;
}

export function isValidSettingsId(value: unknown): value is string {
  return settingsIdSchema.safeParse(value).success;
}

export const SETTINGS_KEYS: readonly SettingsKey[] = Object.freeze(
  Object.keys(SETTINGS_FIELD_SCHEMAS) as SettingsKey[],
);

export function isRecordSettingsKey(key: SettingsKey): key is RecordSettingsKey {
  return (
    key === "selectedMaps" || key === "recentSelectedMaps" || key === "midweekSelectorSettings"
  );
}

function isValidTimestamp(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value) && value >= 0;
}

function normalizeEntryTimestamps(
  value: unknown,
  isValidEntryKey: (key: string) => boolean,
): Record<string, number> {
  const normalized: Record<string, number> = {};
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return normalized;
  }
  for (const [key, timestamp] of Object.entries(value)) {
    if (isValidEntryKey(key) && isValidTimestamp(timestamp)) {
      normalized[key] = timestamp;
    }
  }
  return normalized;
}

function isValidSettingsEntryKey(key: string): boolean {
  return key.length > 0 && key.length <= CONGREGATION_ID_MAX_LENGTH;
}

export function normalizeSettingsUpdatedAt(value: unknown): SettingsUpdatedAt {
  const normalized: SettingsUpdatedAt = {};
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return normalized;
  }
  const record = value as Record<string, unknown>;
  for (const key of SETTINGS_KEYS) {
    const timestamp = record[key];
    if (isRecordSettingsKey(key)) {
      const isValidEntryKey =
        key === "midweekSelectorSettings"
          ? (entryKey: string) =>
              midweekParticipationIds.includes(entryKey as MidweekParticipationId)
          : isValidSettingsEntryKey;
      const entryTimestamps = normalizeEntryTimestamps(timestamp, isValidEntryKey);
      if (Object.keys(entryTimestamps).length > 0) {
        if (key === "midweekSelectorSettings") {
          normalized.midweekSelectorSettings = entryTimestamps as Partial<
            Record<MidweekParticipationId, number>
          >;
        } else if (key === "selectedMaps") {
          normalized.selectedMaps = entryTimestamps;
        } else {
          normalized.recentSelectedMaps = entryTimestamps;
        }
      }
    } else if (isValidTimestamp(timestamp)) {
      (normalized as Partial<Record<SettingsKey, number>>)[key] = timestamp;
    }
  }
  return normalized;
}

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
  const parsed = SETTINGS_FIELD_SCHEMAS[key].safeParse(source[key]);
  if (parsed.success) {
    (target as Partial<Record<SettingsKey, unknown>>)[key] = parsed.data;
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

function areStringArraysEqual(a: readonly string[], b: readonly string[]): boolean {
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

function areMidweekSelectorSettingValuesEqual(
  a: MidweekSelectorSettings | undefined,
  b: MidweekSelectorSettings | undefined,
): boolean {
  if (!a || !b) {
    return a === b;
  }
  return (
    a.gender === b.gender &&
    a.sortBy === b.sortBy &&
    areStringArraysEqual(a.statParticipationTypes, b.statParticipationTypes)
  );
}

export function areSettingsRecordEntriesEqual(
  key: RecordSettingsKey,
  a: unknown,
  b: unknown,
): boolean {
  if (a === undefined || b === undefined) {
    return a === b;
  }
  if (key === "selectedMaps") {
    return a === b;
  }
  if (key === "recentSelectedMaps") {
    return (
      Array.isArray(a) && Array.isArray(b) && areStringArraysEqual(a as string[], b as string[])
    );
  }
  const parsedA = midweekSelectorSettingsSchema.safeParse(a);
  const parsedB = midweekSelectorSettingsSchema.safeParse(b);
  return (
    parsedA.success &&
    parsedB.success &&
    areMidweekSelectorSettingValuesEqual(parsedA.data, parsedB.data)
  );
}

function areMidweekSelectorSettingsEqual(
  a: MidweekSelectorSettingsByType,
  b: MidweekSelectorSettingsByType,
): boolean {
  const aKeys = Object.keys(a) as MidweekParticipationId[];
  const bKeys = Object.keys(b) as MidweekParticipationId[];
  return (
    aKeys.length === bKeys.length &&
    aKeys.every((key) => {
      const aValue = a[key];
      const bValue = b[key];
      if (!aValue || !bValue) {
        return aValue === bValue;
      }
      return (
        aValue.gender === bValue.gender &&
        aValue.sortBy === bValue.sortBy &&
        areStringArraysEqual(aValue.statParticipationTypes, bValue.statParticipationTypes)
      );
    })
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
    if (key === "emergencyContactsVisibleTypes") {
      return areStringArraysEqual(a[key], b[key]);
    }
    if (key === "midweekSelectorSettings") {
      return areMidweekSelectorSettingsEqual(a[key], b[key]);
    }
    return a[key] === b[key];
  });
}

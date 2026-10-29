import { BANK_GST_RATE, isBankGstType, type BankGstType } from "../banking/lines/gst.ts";
import { DEFAULT_PAYMENT_TERMS_DAYS } from "../invoices/schema.ts";

export const THEME_MODES = ["light", "dark", "system"] as const;

export type ThemeMode = (typeof THEME_MODES)[number];

export const PAYMENT_TERMS_DAYS_MAX = 365;

export const INVOICE_NOTES_MAX_LENGTH = 4000;

export const GST_RATE_MAX = 1;

export const BUSINESS_NAME_MAX_LENGTH = 64;

export const ABN_MAX_LENGTH = 14;

export const BANK_ACCOUNT_NAME_MAX_LENGTH = 64;

export const BANK_BSB_MAX_LENGTH = 7;

export const BANK_ACCOUNT_NUMBER_MAX_LENGTH = 16;

export { DEFAULT_PAYMENT_TERMS_DAYS };

export interface SettingsDocument {
  id: string;
  theme: ThemeMode;
  defaultPaymentTermsDays: number;
  defaultInvoiceNotes: string;
  gstRegistered: boolean;
  gstRate: number;
  defaultGstType: BankGstType;
  businessName: string;
  abn: string;
  bankAccountName: string;
  bankBsb: string;
  bankAccountNumber: string;
}

export type SettingsKey = Exclude<keyof SettingsDocument, "id">;

export type SettingsPatch = Partial<Omit<SettingsDocument, "id">>;

export const SETTINGS_ID_MAX_LENGTH = 64;

export const DEFAULT_SETTINGS_ID = "default";

export const DEFAULT_SETTINGS: SettingsDocument = {
  id: DEFAULT_SETTINGS_ID,
  theme: "system",
  defaultPaymentTermsDays: DEFAULT_PAYMENT_TERMS_DAYS,
  defaultInvoiceNotes: "",
  gstRegistered: true,
  gstRate: BANK_GST_RATE,
  defaultGstType: "gst",
  businessName: "",
  abn: "",
  bankAccountName: "",
  bankBsb: "",
  bankAccountNumber: "",
};

export function isThemeMode(value: unknown): value is ThemeMode {
  return typeof value === "string" && (THEME_MODES as readonly string[]).includes(value);
}

export function isValidSettingsId(value: unknown): value is string {
  return typeof value === "string" && value.length > 0 && value.length <= SETTINGS_ID_MAX_LENGTH;
}

export function isPaymentTermsDays(value: unknown): value is number {
  return (
    typeof value === "number" &&
    Number.isInteger(value) &&
    value >= 0 &&
    value <= PAYMENT_TERMS_DAYS_MAX
  );
}

export function isInvoiceNotes(value: unknown): value is string {
  return typeof value === "string" && value.length <= INVOICE_NOTES_MAX_LENGTH;
}

export function isGstRegistered(value: unknown): value is boolean {
  return typeof value === "boolean";
}

export function isGstRate(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value) && value > 0 && value <= GST_RATE_MAX;
}

export function isBusinessName(value: unknown): value is string {
  return typeof value === "string" && value.length <= BUSINESS_NAME_MAX_LENGTH;
}

export function isAbn(value: unknown): value is string {
  return typeof value === "string" && value.length <= ABN_MAX_LENGTH;
}

export function isBankAccountName(value: unknown): value is string {
  return typeof value === "string" && value.length <= BANK_ACCOUNT_NAME_MAX_LENGTH;
}

export function isBankBsb(value: unknown): value is string {
  return typeof value === "string" && value.length <= BANK_BSB_MAX_LENGTH;
}

export function isBankAccountNumber(value: unknown): value is string {
  return typeof value === "string" && value.length <= BANK_ACCOUNT_NUMBER_MAX_LENGTH;
}

type SettingsValidatorMap = {
  [K in SettingsKey]: (value: unknown) => value is SettingsDocument[K];
};

const SETTINGS_VALIDATORS: SettingsValidatorMap = {
  theme: isThemeMode,
  defaultPaymentTermsDays: isPaymentTermsDays,
  defaultInvoiceNotes: isInvoiceNotes,
  gstRegistered: isGstRegistered,
  gstRate: isGstRate,
  defaultGstType: isBankGstType,
  businessName: isBusinessName,
  abn: isAbn,
  bankAccountName: isBankAccountName,
  bankBsb: isBankBsb,
  bankAccountNumber: isBankAccountNumber,
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

import {
  isAbn,
  isBusinessName,
  type SettingsDocument,
  type SettingsPatch,
} from "../settings/schema.ts";

export interface OnboardingDetails {
  businessName: string;
  abn?: string;
  gstRegistered?: boolean | null;
}

export function isOnboardingComplete(settings: SettingsDocument): boolean {
  return settings.businessName.trim().length > 0;
}

export function createOnboardingPatch(details: OnboardingDetails): SettingsPatch | null {
  const businessName = details.businessName.trim();
  if (!isBusinessName(businessName) || businessName.length === 0) {
    return null;
  }
  const abn = details.abn?.trim() ?? "";
  if (!isAbn(abn)) {
    return null;
  }
  const patch: SettingsPatch = { businessName, abn };
  if (typeof details.gstRegistered === "boolean") {
    patch.gstRegistered = details.gstRegistered;
  }
  return patch;
}

import { isCongregationId, type SettingsDocument, type SettingsPatch } from "../settings/schema.ts";

export interface OnboardingDetails {
  congregationId: string;
}

export function isOnboardingComplete(settings: SettingsDocument): boolean {
  return settings.congregationId.trim().length > 0;
}

export function createOnboardingPatch(details: OnboardingDetails): SettingsPatch | null {
  const congregationId = details.congregationId.trim();
  if (!isCongregationId(congregationId) || congregationId.length === 0) {
    return null;
  }
  return { congregationId };
}

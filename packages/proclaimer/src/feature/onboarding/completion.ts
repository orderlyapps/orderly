import {
  isCongregationId,
  isPublisherId,
  type SettingsDocument,
  type SettingsPatch,
} from "../settings/schema.ts";

export interface OnboardingDetails {
  congregationId: string;
  publisherId?: string;
}

export function isOnboardingComplete(settings: SettingsDocument): boolean {
  return settings.congregationId.trim().length > 0;
}

export function createOnboardingPatch(details: OnboardingDetails): SettingsPatch | null {
  const congregationId = details.congregationId.trim();
  if (!isCongregationId(congregationId) || congregationId.length === 0) {
    return null;
  }
  const publisherId = details.publisherId?.trim() ?? "";
  return {
    congregationId,
    publisherId: isPublisherId(publisherId) ? publisherId : "",
  };
}

import type { ReactNode } from "react";

import type { SettingsStore } from "../settings/db.ts";
import { useSettings } from "../settings/hooks.ts";
import { isOnboardingComplete } from "./onboarding.ts";

export interface OnboardingGateProps {
  store?: SettingsStore;
  onboarding: ReactNode;
  children?: ReactNode;
}

export const OnboardingGate = ({ store, onboarding, children }: OnboardingGateProps) => {
  const { settings } = useSettings(store);
  return isOnboardingComplete(settings) ? <>{children}</> : <>{onboarding}</>;
};

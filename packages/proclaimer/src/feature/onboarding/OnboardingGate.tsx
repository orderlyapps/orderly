import type { ReactNode } from "react";

import { IonText } from "@ionic/react";

import type { SettingsStore } from "../settings/db.ts";
import { useSettings } from "../settings/hooks.ts";
import { isOnboardingComplete } from "./completion.ts";

export interface OnboardingGateProps {
  store?: SettingsStore;
  onboarding: ReactNode;
  children?: ReactNode;
}

export const OnboardingGate = ({ store, onboarding, children }: OnboardingGateProps) => {
  const { settings, error } = useSettings(store);
  if (error) {
    return (
      <div className="ion-padding">
        <IonText color="danger">
          <p>{error.message || "Failed to load your settings"}</p>
        </IonText>
      </div>
    );
  }
  return isOnboardingComplete(settings) ? <>{children}</> : <>{onboarding}</>;
};

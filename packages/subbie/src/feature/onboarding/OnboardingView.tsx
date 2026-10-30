import { useEffect, useState } from "react";

import {
  IonButton,
  IonInput,
  IonItem,
  IonItemGroup,
  IonLabel,
  IonList,
  IonListHeader,
  IonNote,
  IonSelect,
  IonSelectOption,
  IonSpinner,
  IonText,
} from "@ionic/react";

import { useSettings } from "../settings/hooks.ts";
import type { SettingsStore } from "../settings/db.ts";
import {
  ABN_MAX_LENGTH,
  BUSINESS_NAME_MAX_LENGTH,
  isAbn,
  isBusinessName,
  type SettingsDocument,
} from "../settings/schema.ts";
import { createOnboardingPatch } from "./onboarding.ts";

export interface OnboardingViewProps {
  store?: SettingsStore;
  onComplete?: (settings: SettingsDocument) => void;
}

export const OnboardingView = ({ store: customStore, onComplete }: OnboardingViewProps) => {
  const { settings, updateSettings } = useSettings(customStore);
  const [businessName, setBusinessName] = useState(() => settings.businessName);
  const [abn, setAbn] = useState(() => settings.abn);
  const [gstRegistered, setGstRegistered] = useState(() => settings.gstRegistered);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [touched, setTouched] = useState(false);

  useEffect(() => {
    if (!touched) {
      setBusinessName(settings.businessName);
      setAbn(settings.abn);
      setGstRegistered(settings.gstRegistered);
    }
  }, [settings, touched]);

  const canSubmit =
    isBusinessName(businessName.trim()) &&
    businessName.trim().length > 0 &&
    isAbn(abn.trim()) &&
    !isSubmitting;

  const handleSubmit = async () => {
    const patch = createOnboardingPatch({ businessName, abn, gstRegistered });
    if (!patch) {
      setStatusMessage(
        businessName.trim().length === 0
          ? "Enter your business name to continue"
          : "Check your details and try again",
      );
      return;
    }
    setIsSubmitting(true);
    try {
      const updated = await updateSettings(patch);
      setStatusMessage(null);
      onComplete?.(updated);
    } catch (error) {
      setStatusMessage(
        error instanceof Error ? error.message : "Failed to save your business details",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <div className="ion-padding">
        <IonText>
          <h1>Welcome to Subbie</h1>
          <p>Tell us about your business to get started.</p>
        </IonText>
      </div>
      <IonList inset>
        <IonItemGroup>
          <IonListHeader>
            <IonLabel>Business details</IonLabel>
          </IonListHeader>
          <IonItem>
            <IonInput
              label="Business name"
              labelPlacement="stacked"
              autocapitalize="words"
              maxlength={BUSINESS_NAME_MAX_LENGTH}
              value={businessName}
              onIonInput={(event) => {
                setTouched(true);
                setBusinessName(event.detail.value ?? "");
              }}
            />
          </IonItem>
          <IonItem>
            <IonInput
              label="ABN (optional)"
              labelPlacement="stacked"
              inputmode="numeric"
              placeholder="51 824 753 556"
              maxlength={ABN_MAX_LENGTH}
              value={abn}
              onIonInput={(event) => {
                setTouched(true);
                setAbn(event.detail.value ?? "");
              }}
            />
          </IonItem>
          <IonItem>
            <IonSelect
              label="Registered for GST?"
              labelPlacement="stacked"
              interface="popover"
              value={gstRegistered}
              onIonChange={(event) => {
                if (typeof event.detail.value === "boolean") {
                  setTouched(true);
                  setGstRegistered(event.detail.value);
                }
              }}
            >
              <IonSelectOption value={true}>Yes</IonSelectOption>
              <IonSelectOption value={false}>No</IonSelectOption>
            </IonSelect>
          </IonItem>
          {statusMessage ? (
            <IonItem lines="none">
              <IonNote>{statusMessage}</IonNote>
            </IonItem>
          ) : null}
        </IonItemGroup>
      </IonList>
      <div className="ion-padding">
        <IonButton
          expand="block"
          disabled={!canSubmit}
          onClick={() => {
            void handleSubmit();
          }}
        >
          {isSubmitting ? <IonSpinner name="crescent" /> : "Continue"}
        </IonButton>
      </div>
    </>
  );
};

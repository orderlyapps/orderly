import { useEffect, useState } from "react";

import {
  IonButton,
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

import type { CongregationCollection } from "../congregation/collection.ts";
import { useCongregations } from "../congregation/hooks.ts";
import { isCongregationRowId } from "../congregation/schema.ts";
import { useSettings } from "../settings/hooks.ts";
import type { SettingsStore } from "../settings/db.ts";
import { isCongregationId, type SettingsDocument } from "../settings/schema.ts";
import { createOnboardingPatch } from "./completion.ts";

export interface OnboardingViewProps {
  store?: SettingsStore;
  collection?: CongregationCollection;
  onComplete?: (settings: SettingsDocument) => void;
}

export const OnboardingView = ({
  store: customStore,
  collection,
  onComplete,
}: OnboardingViewProps) => {
  const { settings, updateSettings } = useSettings(customStore);
  const { congregations, isLoading, error, retry, canRetry } = useCongregations(collection);
  const [congregationId, setCongregationId] = useState(() => settings.congregationId);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [touched, setTouched] = useState(false);

  useEffect(() => {
    if (!touched) {
      setCongregationId(settings.congregationId);
    }
  }, [settings, touched]);

  const canSubmit =
    isCongregationId(congregationId) && congregationId.trim().length > 0 && !isSubmitting;

  const handleSubmit = async () => {
    const patch = createOnboardingPatch({ congregationId });
    if (!patch) {
      setStatusMessage("Choose your congregation to continue");
      return;
    }
    setIsSubmitting(true);
    try {
      const updated = await updateSettings(patch);
      setStatusMessage(null);
      onComplete?.(updated);
    } catch (submitError) {
      setStatusMessage(
        submitError instanceof Error ? submitError.message : "Failed to save your congregation",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <div className="ion-padding">
        <IonText>
          <h1>Welcome to Proclaimer</h1>
          <p>Choose your congregation to get started.</p>
        </IonText>
      </div>
      <IonList inset>
        <IonItemGroup>
          <IonListHeader>
            <IonLabel>Congregation</IonLabel>
          </IonListHeader>
          <IonItem>
            <IonSelect
              label="Which congregation do you belong to?"
              labelPlacement="stacked"
              value={congregationId}
              onIonChange={(event) => {
                if (typeof event.detail.value === "string") {
                  setTouched(true);
                  setCongregationId(event.detail.value);
                }
              }}
            >
              {congregations
                .filter(
                  (congregation) =>
                    isCongregationRowId(congregation.id) && !congregation.congregation_id,
                )
                .map((congregation) => (
                  <IonSelectOption key={congregation.id} value={congregation.id}>
                    {congregation.name}
                  </IonSelectOption>
                ))}
            </IonSelect>
          </IonItem>
          {isLoading ? (
            <IonItem lines="none">
              <IonSpinner name="crescent" />
              <IonNote className="ion-padding-start">Loading congregations…</IonNote>
            </IonItem>
          ) : null}
          {error ? (
            <IonItem lines="none">
              <IonNote color="danger">{error.message || "Failed to load congregations"}</IonNote>
              {canRetry ? (
                <IonButton
                  slot="end"
                  size="small"
                  fill="outline"
                  onClick={() => {
                    void retry();
                  }}
                >
                  Retry
                </IonButton>
              ) : null}
            </IonItem>
          ) : null}
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

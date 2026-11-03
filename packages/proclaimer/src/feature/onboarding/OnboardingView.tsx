import { useEffect, useState } from "react";

import {
  IonButton,
  IonInput,
  IonItem,
  IonItemGroup,
  IonList,
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
  const [password, setPassword] = useState("");
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [touched, setTouched] = useState(false);

  useEffect(() => {
    if (!touched) {
      setCongregationId(settings.congregationId);
    }
  }, [settings, touched]);

  const selectableCongregations = congregations.filter(
    (congregation) => isCongregationRowId(congregation.id) && !congregation.congregation_id,
  );
  const selectedCongregation = selectableCongregations.find(
    (congregation) => congregation.id === congregationId,
  );
  const requiredPassword = selectedCongregation?.password ?? "";
  const passwordRequired = requiredPassword.length > 0;
  const passwordMatches = !passwordRequired || password === requiredPassword;

  const canSubmit =
    isCongregationId(congregationId) &&
    congregationId.trim().length > 0 &&
    selectedCongregation != null &&
    passwordMatches &&
    !isSubmitting;

  const handleSubmit = async () => {
    if (!selectedCongregation) {
      setStatusMessage("Choose your congregation to continue");
      return;
    }
    if (!passwordMatches) {
      setStatusMessage("Incorrect congregation password");
      return;
    }
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
          <IonItem>
            <IonSelect
              label="Congregation"
              labelPlacement="stacked"
              interface="popover"
              value={congregationId}
              onIonChange={(event) => {
                if (typeof event.detail.value === "string") {
                  setTouched(true);
                  setCongregationId(event.detail.value);
                  setPassword("");
                }
              }}
            >
              {selectableCongregations.map((congregation) => (
                <IonSelectOption key={congregation.id} value={congregation.id}>
                  {congregation.name}
                </IonSelectOption>
              ))}
            </IonSelect>
          </IonItem>
          {passwordRequired ? (
            <IonItem>
              <IonInput
                label="Password"
                labelPlacement="stacked"
                type="password"
                value={password}
                onIonInput={(event) => {
                  setTouched(true);
                  setPassword(event.detail.value ?? "");
                }}
              />
            </IonItem>
          ) : null}
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
      {selectedCongregation != null && passwordMatches ? (
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
      ) : null}
    </>
  );
};

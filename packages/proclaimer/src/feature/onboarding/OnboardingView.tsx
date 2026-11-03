import { useEffect, useState } from "react";

import {
  IonButton,
  IonButtons,
  IonContent,
  IonHeader,
  IonInput,
  IonItem,
  IonItemGroup,
  IonList,
  IonNote,
  IonSelect,
  IonSelectOption,
  IonSpinner,
  IonText,
  IonTitle,
  IonToolbar,
} from "@ionic/react";

import { PublisherSignIn } from "../auth/PublisherSignIn.tsx";
import type { CongregationCollection } from "../congregation/collection.ts";
import { useCongregations } from "../congregation/hooks.ts";
import { isCongregationRowId } from "../congregation/schema.ts";
import type { PublisherCollection } from "../publisher/collection.ts";
import { usePublishers } from "../publisher/hooks.ts";
import { PublisherAutocomplete } from "../publisher/PublisherAutocomplete.tsx";
import { useSettings } from "../settings/hooks.ts";
import type { SettingsStore } from "../settings/db.ts";
import { isCongregationId, type SettingsDocument } from "../settings/schema.ts";
import { createOnboardingPatch } from "./completion.ts";

export type OnboardingStep = "congregation" | "publisher" | "signin";

interface OnboardingHeaderProps {
  isSubmitting: boolean;
  onBack?: () => void;
  onSkip?: () => void;
  isSkipDisabled?: boolean;
}

const OnboardingHeader = ({
  isSubmitting,
  onBack,
  onSkip,
  isSkipDisabled = false,
}: OnboardingHeaderProps) => (
  <IonHeader>
    <IonToolbar>
      {onBack ? (
        <IonButtons slot="start">
          <IonButton disabled={isSubmitting} onClick={onBack}>
            Back
          </IonButton>
        </IonButtons>
      ) : null}
      <IonTitle>Welcome</IonTitle>
      {onSkip ? (
        <IonButtons slot="end">
          <IonButton disabled={isSubmitting || isSkipDisabled} onClick={onSkip}>
            {isSubmitting ? <IonSpinner name="crescent" /> : "Skip"}
          </IonButton>
        </IonButtons>
      ) : null}
    </IonToolbar>
  </IonHeader>
);

export interface OnboardingViewProps {
  store?: SettingsStore;
  collection?: CongregationCollection;
  publisherCollection?: PublisherCollection;
  initialStep?: OnboardingStep;
  onComplete?: (settings: SettingsDocument) => void;
}

export const OnboardingView = ({
  store: customStore,
  collection,
  publisherCollection,
  initialStep = "congregation",
  onComplete,
}: OnboardingViewProps) => {
  const { settings, updateSettings } = useSettings(customStore);
  const { congregations, isLoading, error, retry, canRetry } = useCongregations(collection);
  const [congregationId, setCongregationId] = useState(() => settings.congregationId);
  const [publisherId, setPublisherId] = useState(() => settings.publisherId);
  const [password, setPassword] = useState("");
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [touched, setTouched] = useState(false);
  const [step, setStep] = useState<OnboardingStep>(initialStep);

  useEffect(() => {
    if (!touched) {
      setCongregationId(settings.congregationId);
      setPublisherId(settings.publisherId);
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

  const {
    publishers,
    isLoading: publishersLoading,
    error: publishersError,
    retry: retryPublishers,
    canRetry: canRetryPublishers,
  } = usePublishers(selectedCongregation?.id, publisherCollection);

  // Only a publisher that belongs to the selected congregation may be saved
  const selectedPublisher = publishers.find((p) => p.id === publisherId);
  const selectedPublisherId = selectedPublisher ? publisherId : "";

  const canContinue =
    isCongregationId(congregationId) &&
    congregationId.trim().length > 0 &&
    selectedCongregation != null &&
    passwordMatches;

  const handleContinue = () => {
    if (!canContinue) {
      setStatusMessage("Choose your congregation to continue");
      return;
    }
    setStatusMessage(null);
    setStep("publisher");
  };

  const handleFinish = async () => {
    const patch = createOnboardingPatch({ congregationId, publisherId: selectedPublisherId });
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
        submitError instanceof Error ? submitError.message : "Failed to save your selection",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  if (step === "signin" && selectedPublisher?.auth_id) {
    return (
      <>
        <OnboardingHeader
          isSubmitting={isSubmitting}
          onBack={() => {
            setStep("publisher");
          }}
          onSkip={() => {
            void handleFinish();
          }}
        />
        <IonContent fullscreen>
          <div className="ion-padding">
            <IonText>
              <h1>Sign in</h1>
              <p>
                This name is linked to an account. Sign in to enable account features on this
                device.
              </p>
            </IonText>
          </div>
          <PublisherSignIn
            key={selectedPublisherId}
            publisherId={selectedPublisherId}
            onSignIn={() => {
              void handleFinish();
            }}
          />
          {statusMessage ? (
            <div className="ion-padding">
              <IonNote>{statusMessage}</IonNote>
            </div>
          ) : null}
        </IonContent>
      </>
    );
  }

  if (step === "publisher") {
    return (
      <>
        <OnboardingHeader
          isSubmitting={isSubmitting}
          onBack={() => {
            setStep("congregation");
          }}
          onSkip={
            selectedPublisherId
              ? undefined
              : () => {
                  void handleFinish();
                }
          }
          isSkipDisabled={publishersLoading}
        />
        <IonContent fullscreen>
          <div className="ion-padding">
            <IonText>
              <h1>Who are you?</h1>
              <p>
                Search for your name to personalise your experience, or skip for now — you can
                always do this later from Settings.
              </p>
            </IonText>
          </div>
          <PublisherAutocomplete
            publishers={publishers}
            selectedId={selectedPublisherId}
            isLoading={publishersLoading}
            error={publishersError}
            canRetry={canRetryPublishers}
            onRetry={() => {
              void retryPublishers();
            }}
            onSelect={(id) => {
              setPublisherId(id);
            }}
          >
            {statusMessage ? (
              <IonItem lines="none">
                <IonNote>{statusMessage}</IonNote>
              </IonItem>
            ) : null}
          </PublisherAutocomplete>
          {selectedPublisherId ? (
            <div className="ion-padding">
              <IonButton
                expand="block"
                disabled={isSubmitting || publishersLoading}
                onClick={() => {
                  if (selectedPublisher?.auth_id) {
                    setStep("signin");
                  } else {
                    void handleFinish();
                  }
                }}
              >
                {isSubmitting ? (
                  <IonSpinner name="crescent" />
                ) : selectedPublisher?.auth_id ? (
                  "Continue"
                ) : (
                  "Finish"
                )}
              </IonButton>
            </div>
          ) : null}
        </IonContent>
      </>
    );
  }

  return (
    <>
      <OnboardingHeader isSubmitting={isSubmitting} />
      <IonContent fullscreen>
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
                    setPublisherId("");
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
            <IonButton expand="block" disabled={!canContinue} onClick={handleContinue}>
              Continue
            </IonButton>
          </div>
        ) : null}
      </IonContent>
    </>
  );
};

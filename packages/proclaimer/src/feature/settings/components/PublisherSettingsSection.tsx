import { useState } from "react";

import {
  IonButton,
  IonButtons,
  IonContent,
  IonHeader,
  IonIcon,
  IonItem,
  IonLabel,
  IonModal,
  IonNote,
  IonTitle,
  IonToolbar,
} from "@ionic/react";
import { checkmarkCircle } from "ionicons/icons";

import { publisherAuthEmail } from "../../auth/email.ts";
import { PublisherSignIn } from "../../auth/PublisherSignIn.tsx";
import { useAuthSession } from "../../auth/session.ts";
import type { PublisherCollection } from "../../publisher/collection.ts";
import { usePublishers } from "../../publisher/hooks.ts";
import { PublisherAutocomplete } from "../../publisher/PublisherAutocomplete.tsx";
import { getPublisherDisplayName } from "../../publisher/schema.ts";
import { SettingsSection } from "./SettingsSection.tsx";

export interface PublisherSettingsSectionProps {
  congregationId: string;
  publisherId: string;
  onPublisherChange?: (publisherId: string) => void;
  publisherCollection?: PublisherCollection;
  statusMessage?: string | null;
}

export const PublisherSettingsSection = ({
  congregationId,
  publisherId,
  onPublisherChange,
  publisherCollection,
  statusMessage,
}: PublisherSettingsSectionProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isSignInOpen, setIsSignInOpen] = useState(false);
  const session = useAuthSession();
  const { publishers, isLoading, error, canRetry, retry } = usePublishers(
    congregationId,
    publisherCollection,
  );
  const selectedPublisher = publishers.find((publisher) => publisher.id === publisherId);
  const hasCongregation = congregationId.trim().length > 0;
  const isSignedIn =
    selectedPublisher != null && session?.user.email === publisherAuthEmail(publisherId);

  return (
    <SettingsSection title="Publisher" statusMessage={statusMessage}>
      {hasCongregation ? (
        <IonItem
          button
          detail={false}
          onClick={() => {
            setIsOpen(true);
          }}
        >
          <IonLabel>
            {selectedPublisher ? getPublisherDisplayName(selectedPublisher) : "Select your name"}
          </IonLabel>
        </IonItem>
      ) : (
        <IonItem lines="none">
          <IonNote>Select a congregation before choosing a publisher</IonNote>
        </IonItem>
      )}
      {selectedPublisher?.auth_id ? (
        <IonItem
          button
          detail={false}
          onClick={() => {
            setIsSignInOpen(true);
          }}
        >
          <IonLabel>{isSignedIn ? "Signed in" : "Sign in to your account"}</IonLabel>
          {isSignedIn ? <IonIcon icon={checkmarkCircle} color="success" slot="end" /> : null}
        </IonItem>
      ) : null}
      <IonModal
        isOpen={isOpen}
        onDidDismiss={() => {
          setIsOpen(false);
        }}
      >
        <IonHeader>
          <IonToolbar>
            <IonTitle>Select Publisher</IonTitle>
            <IonButtons slot="end">
              <IonButton
                onClick={() => {
                  setIsOpen(false);
                }}
              >
                Close
              </IonButton>
            </IonButtons>
          </IonToolbar>
        </IonHeader>
        <IonContent>
          <PublisherAutocomplete
            publishers={publishers}
            selectedId={selectedPublisher?.id}
            isLoading={isLoading}
            error={error}
            canRetry={canRetry}
            onRetry={() => {
              void retry();
            }}
            onSelect={(id) => {
              if (id) {
                onPublisherChange?.(id);
                setIsOpen(false);
              }
            }}
          />
        </IonContent>
      </IonModal>
      <IonModal
        isOpen={isSignInOpen}
        onDidDismiss={() => {
          setIsSignInOpen(false);
        }}
      >
        <IonHeader>
          <IonToolbar>
            <IonTitle>Sign in</IonTitle>
            <IonButtons slot="end">
              <IonButton
                onClick={() => {
                  setIsSignInOpen(false);
                }}
              >
                Close
              </IonButton>
            </IonButtons>
          </IonToolbar>
        </IonHeader>
        <IonContent>
          {isSignInOpen && selectedPublisher ? (
            <PublisherSignIn key={publisherId} publisherId={publisherId} />
          ) : null}
        </IonContent>
      </IonModal>
    </SettingsSection>
  );
};

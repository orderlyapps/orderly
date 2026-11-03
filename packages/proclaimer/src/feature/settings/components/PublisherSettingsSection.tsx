import { useState } from "react";

import {
  IonButton,
  IonButtons,
  IonContent,
  IonHeader,
  IonItem,
  IonLabel,
  IonModal,
  IonNote,
  IonTitle,
  IonToolbar,
} from "@ionic/react";

import type { PublisherCollection } from "../../publisher/collection.ts";
import { usePublishers } from "../../publisher/hooks.ts";
import { PublisherSelect } from "../../publisher/PublisherSelect.tsx";
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
  const { publishers, isLoading, error, canRetry, retry } = usePublishers(
    congregationId,
    publisherCollection,
  );
  const selectedPublisher = publishers.find((publisher) => publisher.id === publisherId);
  const hasCongregation = congregationId.trim().length > 0;

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
          <PublisherSelect
            publishers={publishers}
            selectedId={selectedPublisher?.id}
            isLoading={isLoading}
            error={error}
            canRetry={canRetry}
            onRetry={() => {
              void retry();
            }}
            onSelect={(id) => {
              onPublisherChange?.(id);
              setIsOpen(false);
            }}
          />
        </IonContent>
      </IonModal>
    </SettingsSection>
  );
};

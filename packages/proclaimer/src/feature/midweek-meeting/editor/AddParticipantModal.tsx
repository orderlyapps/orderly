import { useState } from "react";

import {
  IonButton,
  IonButtons,
  IonContent,
  IonHeader,
  IonItem,
  IonLabel,
  IonList,
  IonModal,
  IonSearchbar,
  IonSkeletonText,
  IonTitle,
  IonToolbar,
} from "@ionic/react";

import type { Publisher } from "../../publisher/schema.ts";
import { getPublisherDisplayName } from "../../publisher/schema.ts";
import type { MidweekParticipationId } from "../schema.ts";
import { midweekParticipationTypeLabels, participationTypesByPublisher } from "./assignments.ts";

export interface AddParticipantModalProps {
  participationId: MidweekParticipationId;
  isOpen: boolean;
  isLoading: boolean;
  onDismiss: () => void;
  onAdd: (publisherId: string) => void;
  publishers: Publisher[];
  participations: {
    participant_id: string;
    participation_id: string;
    is_participant: boolean;
  }[];
}

export function AddParticipantModal({
  participationId,
  isOpen,
  isLoading,
  onDismiss,
  onAdd,
  publishers,
  participations,
}: AddParticipantModalProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const participationTypes = participationTypesByPublisher(participations);

  const nonParticipants = publishers
    .filter(
      (publisher) =>
        publisher.id &&
        !publisher.archived_at &&
        !(participationTypes.get(publisher.id)?.has(participationId) ?? false),
    )
    .map((publisher) => ({ publisher, displayName: getPublisherDisplayName(publisher) }))
    .sort((a, b) => a.displayName.localeCompare(b.displayName));

  const query = searchQuery.trim().toLowerCase();
  const filtered = nonParticipants.filter(({ displayName }) =>
    displayName.toLowerCase().includes(query),
  );

  function handleDismiss() {
    setSearchQuery("");
    onDismiss();
  }

  function handleSelect(publisherId: string) {
    onAdd(publisherId);
    handleDismiss();
  }

  return (
    <IonModal isOpen={isOpen} onDidDismiss={handleDismiss}>
      <IonHeader>
        <IonToolbar>
          <IonTitle>Add {midweekParticipationTypeLabels[participationId]} Participant</IonTitle>
          <IonButtons slot="end">
            <IonButton onClick={handleDismiss}>Close</IonButton>
          </IonButtons>
        </IonToolbar>
        <IonToolbar>
          <IonSearchbar
            value={searchQuery}
            onIonInput={(event) => setSearchQuery(event.detail.value ?? "")}
            debounce={100}
            placeholder="Search names"
          />
        </IonToolbar>
      </IonHeader>
      <IonContent>
        <IonList>
          {isLoading ? (
            [1, 2, 3].map((i) => (
              <IonItem key={i}>
                <IonLabel>
                  <IonSkeletonText style={{ width: "60%" }} />
                </IonLabel>
              </IonItem>
            ))
          ) : filtered.length === 0 ? (
            <IonItem lines="none">
              <IonLabel color="medium">
                {query ? "No matching publishers." : "No available publishers."}
              </IonLabel>
            </IonItem>
          ) : (
            filtered.map(({ publisher, displayName }) => (
              <IonItem
                key={publisher.id}
                button
                detail={false}
                onClick={() => handleSelect(publisher.id ?? "")}
              >
                <IonLabel>{displayName}</IonLabel>
              </IonItem>
            ))
          )}
        </IonList>
      </IonContent>
    </IonModal>
  );
}

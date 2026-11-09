import {
  IonButton,
  IonButtons,
  IonContent,
  IonHeader,
  IonModal,
  IonTitle,
  IonToolbar,
  useIonAlert,
} from "@ionic/react";

import type { Publisher } from "../../publisher/schema.ts";
import type { MidweekMeetingAssignment, MidweekParticipationId } from "../schema.ts";
import { midweekParticipationTypeLabels, participationTypesByPublisher } from "./assignments.ts";
import { AssignmentHistory } from "./AssignmentHistory.tsx";

export interface PublisherSelectModalProps {
  isOpen: boolean;
  publisher: Publisher | undefined;
  onDismiss: () => void;
  onConfirm: () => void;
  onRemoveParticipant: (publisherId: string) => void;
  weekId: string;
  assignments: MidweekMeetingAssignment[];
  publishers: Publisher[];
  participations: {
    participant_id: string;
    participation_id: string;
    is_participant: boolean;
  }[];
  participationId: MidweekParticipationId;
}

export function PublisherSelectModal({
  isOpen,
  publisher,
  onDismiss,
  onConfirm,
  onRemoveParticipant,
  weekId,
  assignments,
  publishers,
  participations,
  participationId,
}: PublisherSelectModalProps) {
  const [presentAlert] = useIonAlert();

  const participationTypes = participationTypesByPublisher(participations);
  const isParticipant =
    !!publisher?.id && (participationTypes.get(publisher.id)?.has(participationId) ?? false);

  function handleConfirm() {
    onConfirm();
    onDismiss();
  }

  function handleRemove() {
    if (!publisher?.id) {
      return;
    }
    const publisherId = publisher.id;
    void presentAlert({
      header: "Remove Participation",
      message: `Remove ${publisher.first_name} ${publisher.last_name} as a ${midweekParticipationTypeLabels[participationId]} participant?`,
      buttons: [
        { text: "Cancel", role: "cancel" },
        {
          text: "Remove",
          role: "destructive",
          handler: () => {
            onRemoveParticipant(publisherId);
            onDismiss();
          },
        },
      ],
    });
  }

  return (
    <IonModal
      isOpen={isOpen}
      onDidDismiss={onDismiss}
      initialBreakpoint={0.6}
      breakpoints={[0, 0.6, 0.9]}
    >
      <IonHeader>
        <IonToolbar>
          <IonTitle>
            {publisher ? `${publisher.first_name} ${publisher.last_name}` : "Confirm Assignment"}
          </IonTitle>
          <IonButtons slot="end">
            <IonButton onClick={onDismiss}>Close</IonButton>
          </IonButtons>
        </IonToolbar>
      </IonHeader>
      <IonContent>
        {publisher?.id && (
          <AssignmentHistory
            publisherId={publisher.id}
            weekId={weekId}
            assignments={assignments}
            publishers={publishers}
          />
        )}
        <div className="ion-padding">
          <IonButton expand="block" onClick={handleConfirm}>
            Assign to Schedule
          </IonButton>
          {isParticipant && (
            <IonButton expand="block" fill="clear" color="danger" onClick={handleRemove}>
              Remove {midweekParticipationTypeLabels[participationId]} Participation
            </IonButton>
          )}
        </div>
      </IonContent>
    </IonModal>
  );
}

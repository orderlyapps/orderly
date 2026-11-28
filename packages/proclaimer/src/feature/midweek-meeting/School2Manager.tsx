import { useMemo, useState } from "react";

import {
  IonButton,
  IonButtons,
  IonContent,
  IonHeader,
  IonIcon,
  IonItem,
  IonLabel,
  IonList,
  IonModal,
  IonNote,
  IonTitle,
  IonToolbar,
  useIonAlert,
} from "@ionic/react";
import { useLiveQuery } from "@tanstack/react-db";
import { addOutline, schoolOutline, trashOutline } from "ionicons/icons";

import { getPublisherDisplayName } from "../publisher/schema.ts";
import { getPublisherCollection } from "../publisher/collection.ts";
import {
  getMidweekAssignmentCollection,
  getMidweekParticipationCollection,
  midweekAssignmentKey,
  midweekParticipationKey,
} from "./collection.ts";
import { computeAssignmentStats, participationTypesByPublisher } from "./editor/assignments.ts";
import { AddParticipantModal } from "./editor/AddParticipantModal.tsx";
import { PublisherList } from "./editor/PublisherList.tsx";
import { deleteSchoolAssignments } from "./schoolAssignments.ts";

export interface School2ManagerProps {
  weekId: string;
  congregationId?: string | null;
  canEdit: boolean;
}

function collectionError(collections: {
  assignments: ReturnType<typeof getMidweekAssignmentCollection> | null;
  publishers: ReturnType<typeof getPublisherCollection> | null;
  participations: ReturnType<typeof getMidweekParticipationCollection> | null;
}): Error | null {
  for (const collection of [
    collections.assignments,
    collections.publishers,
    collections.participations,
  ]) {
    if (collection?.utils.isError && collection.utils.lastError != null) {
      const value = collection.utils.lastError;
      return value instanceof Error ? value : new Error("Failed to load school 2 settings");
    }
  }
  return null;
}

export function School2Manager({ weekId, congregationId, canEdit }: School2ManagerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [presentAlert] = useIonAlert();

  const collections = useMemo(() => {
    if (!congregationId) {
      return { assignments: null, publishers: null, participations: null };
    }
    try {
      return {
        assignments: getMidweekAssignmentCollection(congregationId),
        publishers: getPublisherCollection(congregationId),
        participations: getMidweekParticipationCollection(),
      };
    } catch {
      return { assignments: null, publishers: null, participations: null };
    }
  }, [congregationId]);

  const { data: assignmentRows, isLoading: assignmentsLoading } = useLiveQuery({
    query: (q) => (collections.assignments ? q.from({ a: collections.assignments }) : undefined),
  });
  const { data: publishers, isLoading: publishersLoading } = useLiveQuery({
    query: (q) => (collections.publishers ? q.from({ p: collections.publishers }) : undefined),
  });
  const { data: participations, isLoading: participationsLoading } = useLiveQuery({
    query: (q) =>
      collections.participations ? q.from({ p: collections.participations }) : undefined,
  });

  const assignments = useMemo(() => assignmentRows ?? [], [assignmentRows]);
  const allPublishers = useMemo(() => publishers ?? [], [publishers]);
  const participationRows = useMemo(() => participations ?? [], [participations]);
  const weekAssignments = useMemo(
    () => assignments.filter((assignment) => assignment.week_id === weekId),
    [assignments, weekId],
  );
  const counselorAssignment = weekAssignments.find(
    (assignment) => assignment.assignment_id === "chairman_2",
  );
  const counselor = allPublishers.find(
    (publisher) => publisher.id === counselorAssignment?.participant_id,
  );
  const stats = useMemo(
    () => computeAssignmentStats(assignments, ["counselor"], weekId, "counselor"),
    [assignments, weekId],
  );
  const participationTypes = useMemo(
    () => participationTypesByPublisher(participationRows),
    [participationRows],
  );
  const weekAssignmentIds = useMemo(
    () => new Set(weekAssignments.map((assignment) => assignment.participant_id)),
    [weekAssignments],
  );
  const isLoading = assignmentsLoading || publishersLoading || participationsLoading;
  const error = collectionError(collections);

  function assignCounselor(publisherId: string) {
    const collection = collections.assignments;
    if (!canEdit || !collection || !congregationId) {
      return;
    }
    const key = midweekAssignmentKey("chairman_2", congregationId, weekId);
    if (collection.get(key)) {
      collection.update(key, (draft) => {
        draft.participant_id = publisherId;
      });
    } else {
      collection.insert({
        assignment_id: "chairman_2",
        congregation_id: congregationId,
        week_id: weekId,
        participant_id: publisherId,
      });
    }
  }

  function addCounselorParticipant(publisherId: string) {
    const collection = collections.participations;
    if (!canEdit || !collection) {
      return;
    }
    const key = midweekParticipationKey(publisherId, "counselor");
    if (collection.get(key)) {
      collection.update(key, (draft) => {
        draft.is_participant = true;
      });
    } else {
      collection.insert({
        participant_id: publisherId,
        participation_id: "counselor",
        is_participant: true,
      });
    }
  }

  function removeSchool2Assignments() {
    const collection = collections.assignments;
    if (!canEdit || !collection || !congregationId) {
      return;
    }
    deleteSchoolAssignments(collection, 2, congregationId, weekId);
  }

  function confirmRemoveSchool() {
    void presentAlert({
      header: "Remove School 2?",
      message:
        "This will remove the School 2 counselor, Bible Reading, student, and assistant assignments for this week.",
      buttons: [
        { text: "Cancel", role: "cancel" },
        { text: "Remove", role: "destructive", handler: removeSchool2Assignments },
      ],
    });
  }

  return (
    <>
      <IonButton
        fill="clear"
        aria-label="Manage School 2"
        disabled={!canEdit || !congregationId}
        onClick={() => setIsOpen(true)}
      >
        <IonIcon icon={schoolOutline} slot="icon-only" />
      </IonButton>
      <IonModal isOpen={isOpen} onDidDismiss={() => setIsOpen(false)}>
        <IonHeader>
          <IonToolbar>
            <IonTitle>School 2</IonTitle>
            <IonButtons slot="end">
              <IonButton onClick={() => setIsOpen(false)}>Close</IonButton>
            </IonButtons>
          </IonToolbar>
        </IonHeader>
        <IonContent>
          <IonList inset>
            <IonItem lines="none">
              <IonLabel>
                <div style={{ fontSize: 17, fontWeight: 700 }}>Counselor</div>
                <div style={{ paddingTop: 3, fontSize: 14, color: "var(--ion-color-medium)" }}>
                  Assign a counselor to activate School 2 for this week.
                </div>
              </IonLabel>
            </IonItem>
            {counselor && (
              <IonItem lines="none">
                <IonLabel>{getPublisherDisplayName(counselor)}</IonLabel>
                <IonButton
                  fill="clear"
                  slot="end"
                  aria-label="Remove School 2"
                  onClick={confirmRemoveSchool}
                >
                  <IonIcon icon={trashOutline} color="danger" />
                </IonButton>
              </IonItem>
            )}
          </IonList>
          {error ? (
            <div style={{ padding: "24px", textAlign: "center" }}>
              <IonNote color="danger">{error.message}</IonNote>
            </div>
          ) : isLoading ? (
            <IonList inset>
              <IonItem lines="none">
                <IonLabel color="medium">Loading counselors…</IonLabel>
              </IonItem>
            </IonList>
          ) : (
            <>
              {canEdit && (
                <IonList inset>
                  <IonItem button detail={false} lines="none" onClick={() => setAddModalOpen(true)}>
                    <IonIcon icon={addOutline} slot="start" color="primary" />
                    <IonLabel color="primary">Add Counselor Participant</IonLabel>
                  </IonItem>
                </IonList>
              )}
              <PublisherList
                publishers={allPublishers}
                selectedId={counselor?.id}
                onSelect={assignCounselor}
                stats={stats}
                gender={null}
                participationId="counselor"
                participationTypes={participationTypes}
                weekAssignmentIds={weekAssignmentIds}
              />
            </>
          )}
        </IonContent>
      </IonModal>
      <AddParticipantModal
        participationId="counselor"
        isOpen={addModalOpen}
        isLoading={isLoading}
        onDismiss={() => setAddModalOpen(false)}
        onAdd={addCounselorParticipant}
        publishers={allPublishers}
        participations={participationRows}
      />
    </>
  );
}

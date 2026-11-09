import { useMemo, useState } from "react";

import {
  IonAccordion,
  IonAccordionGroup,
  IonButton,
  IonIcon,
  IonItem,
  IonLabel,
  IonList,
  IonNote,
  IonSegment,
  IonSegmentButton,
  IonSelect,
  IonSelectOption,
  useIonAlert,
} from "@ionic/react";
import { addOutline, trashOutline } from "ionicons/icons";

import type { Publisher } from "../../publisher/schema.ts";
import { getPublisherDisplayName } from "../../publisher/schema.ts";
import { MeetingProgramLoading } from "../../meeting/components.tsx";
import type { MeetingSectionColor } from "../../meeting/types.ts";
import type { MidweekParticipationId } from "../schema.ts";
import { midweekParticipationIds } from "../schema.ts";
import {
  computeAssignmentStats,
  midweekParticipationTypeLabels,
  participationTypesByPublisher,
  usesGenderFilter,
  type GenderFilter,
} from "./assignments.ts";
import { AddParticipantModal } from "./AddParticipantModal.tsx";
import { PublisherList } from "./PublisherList.tsx";
import { PublisherSelectModal } from "./PublisherSelectModal.tsx";
import { useMidweekAssignmentEditor } from "./useMidweekAssignmentEditor.ts";
import { useSelectorSettings } from "./useSelectorSettings.ts";

const SECTION_COLOR_VARS: Record<MeetingSectionColor, string> = {
  medium: "var(--ion-color-medium)",
  jw_slate: "var(--ion-color-jw_slate, var(--ion-color-medium))",
  jw_brown: "var(--ion-color-jw_brown, var(--ion-color-medium))",
  jw_red: "var(--ion-color-jw_red, var(--ion-color-medium))",
};

const STAT_TYPE_OPTIONS = midweekParticipationIds.filter((id) => id !== "talk");

const GENDER_OPTIONS: { label: string; value: GenderFilter }[] = [
  { label: "Both", value: "all" },
  { label: "Male", value: "male" },
  { label: "Female", value: "female" },
];

export interface MidweekAssignmentEditorProps {
  weekId: string;
  assignmentId: string;
  congregationId?: string | null;
  canEdit: boolean;
}

type SelectionMode = "assignee" | "assistant";

export function MidweekAssignmentEditor({
  weekId,
  assignmentId,
  congregationId,
  canEdit,
}: MidweekAssignmentEditorProps) {
  const {
    isLoading,
    error,
    canRetry,
    retry,
    item,
    participationId,
    assignee,
    assigneeLabel,
    assistantId,
    assistantAssignee,
    assistantLabel,
    assistantParticipationId,
    assignments,
    publishers,
    participations,
    weekAssignmentIds,
    selectAssignee,
    removeAssignee,
    selectAssistant,
    removeAssistant,
    addParticipant,
    removeParticipant,
  } = useMidweekAssignmentEditor({ weekId, assignmentId, congregationId, canEdit });

  const assigneeSettingsApi = useSelectorSettings(participationId);
  const assistantSettingsApi = useSelectorSettings(assistantParticipationId ?? null);

  const [segment, setSegment] = useState<SelectionMode>("assignee");
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedPublisher, setSelectedPublisher] = useState<Publisher | undefined>();
  const [selectionMode, setSelectionMode] = useState<SelectionMode>("assignee");
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [presentAlert] = useIonAlert();

  const activeParticipationId =
    segment === "assistant" ? (assistantParticipationId ?? "assistant") : participationId;
  const activeSettings = segment === "assistant" ? assistantSettingsApi : assigneeSettingsApi;

  const participationTypes = useMemo(
    () => participationTypesByPublisher(participations),
    [participations],
  );

  const stats = useMemo(
    () =>
      computeAssignmentStats(assignments, activeSettings.settings.statParticipationTypes, weekId),
    [assignments, activeSettings.settings.statParticipationTypes, weekId],
  );

  const modalParticipationId =
    selectionMode === "assistant" ? (assistantParticipationId ?? "assistant") : participationId;

  function openSelect(publisherId: string, mode: SelectionMode) {
    setSelectedPublisher(publishers.find((p) => p.id === publisherId));
    setSelectionMode(mode);
    setModalOpen(true);
  }

  function handleConfirm() {
    if (!selectedPublisher?.id) {
      return;
    }
    if (selectionMode === "assignee") {
      selectAssignee(selectedPublisher.id);
    } else {
      selectAssistant(selectedPublisher.id);
    }
  }

  function confirmRemove(label: string, name: string, action: () => void) {
    void presentAlert({
      header: "Remove Assignment",
      message: `Remove ${name} as ${label}?`,
      buttons: [
        { text: "Cancel", role: "cancel" },
        { text: "Remove", role: "destructive", handler: action },
      ],
    });
  }

  if (error) {
    return (
      <div style={{ padding: "40px 24px", textAlign: "center" }}>
        <IonNote color="danger">{error.message}</IonNote>
        {canRetry && (
          <div>
            <IonButton fill="clear" size="small" onClick={() => void retry()}>
              Try Again
            </IonButton>
          </div>
        )}
      </div>
    );
  }

  if (isLoading) {
    return <MeetingProgramLoading />;
  }

  const settingsContent = (type: MidweekParticipationId) => (
    <>
      {usesGenderFilter(type) && (
        <IonItem>
          <IonSelect
            label="Gender"
            labelPlacement="stacked"
            interface="popover"
            value={activeSettings.settings.gender}
            onIonChange={(event) =>
              activeSettings.setSettings({
                ...activeSettings.settings,
                gender: event.detail.value as GenderFilter,
              })
            }
          >
            {GENDER_OPTIONS.map((option) => (
              <IonSelectOption key={option.value} value={option.value}>
                {option.label}
              </IonSelectOption>
            ))}
          </IonSelect>
        </IonItem>
      )}
      <IonItem>
        <IonSelect
          label="Weeks away calculated from"
          labelPlacement="stacked"
          interface="popover"
          multiple
          value={activeSettings.settings.statParticipationTypes}
          onIonChange={(event) => {
            const value = event.detail.value as MidweekParticipationId[] | undefined;
            if (Array.isArray(value) && value.length > 0) {
              activeSettings.setSettings({
                ...activeSettings.settings,
                statParticipationTypes: value,
              });
            }
          }}
        >
          {STAT_TYPE_OPTIONS.map((type) => (
            <IonSelectOption key={type} value={type}>
              {midweekParticipationTypeLabels[type]}
            </IonSelectOption>
          ))}
        </IonSelect>
      </IonItem>
      {canEdit && (
        <IonItem button detail={false} lines="none" onClick={() => setAddModalOpen(true)}>
          <IonIcon icon={addOutline} slot="start" color="primary" />
          <IonLabel color="primary">Add Participant</IonLabel>
        </IonItem>
      )}
    </>
  );

  const listFor = (mode: SelectionMode) => {
    const type = mode === "assistant" ? (assistantParticipationId ?? "assistant") : participationId;
    const settings = mode === "assistant" ? assistantSettingsApi : assigneeSettingsApi;
    return (
      <PublisherList
        publishers={publishers}
        selectedId={mode === "assistant" ? assistantAssignee?.id : assignee?.id}
        onSelect={(id) => openSelect(id, mode)}
        stats={stats}
        gender={usesGenderFilter(type) ? settings.settings.gender : null}
        participationId={type}
        participationTypes={participationTypes}
        weekAssignmentIds={weekAssignmentIds}
      />
    );
  };

  return (
    <>
      <IonList inset>
        <IonItem lines="none">
          <IonLabel>
            <div
              style={{
                fontSize: 17,
                fontWeight: 700,
                color: SECTION_COLOR_VARS[item.color],
              }}
            >
              {item.title}
            </div>
            {item.subtitle && (
              <div
                style={{
                  paddingTop: 3,
                  fontSize: 14,
                  color: "var(--ion-color-medium)",
                  whiteSpace: "normal",
                }}
              >
                {item.subtitle}
              </div>
            )}
          </IonLabel>
          {item.minutes !== undefined && <IonNote slot="end">{item.minutes} min</IonNote>}
        </IonItem>
      </IonList>

      {(assignee || (assistantId && assistantAssignee)) && (
        <IonList inset>
          {assignee && (
            <IonItem lines={assistantAssignee ? "inset" : "none"}>
              <IonLabel>
                <div style={{ fontSize: 12, color: "var(--ion-color-medium)" }}>
                  {assigneeLabel}
                </div>
                <div style={{ fontSize: 16 }}>{getPublisherDisplayName(assignee)}</div>
              </IonLabel>
              {canEdit && (
                <IonButton
                  fill="clear"
                  slot="end"
                  aria-label={`Remove ${assigneeLabel}`}
                  onClick={() =>
                    confirmRemove(
                      assigneeLabel.toLowerCase(),
                      getPublisherDisplayName(assignee),
                      removeAssignee,
                    )
                  }
                >
                  <IonIcon icon={trashOutline} color="danger" />
                </IonButton>
              )}
            </IonItem>
          )}
          {assistantId && assistantAssignee && (
            <IonItem lines="none">
              <IonLabel>
                <div style={{ fontSize: 12, color: "var(--ion-color-medium)" }}>
                  {assistantLabel}
                </div>
                <div style={{ fontSize: 16 }}>{getPublisherDisplayName(assistantAssignee)}</div>
              </IonLabel>
              {canEdit && (
                <IonButton
                  fill="clear"
                  slot="end"
                  aria-label={`Remove ${assistantLabel}`}
                  onClick={() =>
                    confirmRemove(
                      assistantLabel.toLowerCase(),
                      getPublisherDisplayName(assistantAssignee),
                      removeAssistant,
                    )
                  }
                >
                  <IonIcon icon={trashOutline} color="danger" />
                </IonButton>
              )}
            </IonItem>
          )}
        </IonList>
      )}

      {assistantId && (
        <div className="ion-padding-horizontal">
          <IonSegment
            value={segment}
            onIonChange={(event) => setSegment(event.detail.value as SelectionMode)}
          >
            <IonSegmentButton value="assignee">
              <IonLabel>{assigneeLabel}</IonLabel>
            </IonSegmentButton>
            <IonSegmentButton value="assistant">
              <IonLabel>{assistantLabel}</IonLabel>
            </IonSegmentButton>
          </IonSegment>
        </div>
      )}

      <IonAccordionGroup>
        <IonAccordion value="settings">
          <IonItem slot="header" lines="none">
            <IonLabel>List options</IonLabel>
          </IonItem>
          <div slot="content">
            <IonList inset>{settingsContent(activeParticipationId)}</IonList>
          </div>
        </IonAccordion>
      </IonAccordionGroup>

      {listFor(segment)}

      <PublisherSelectModal
        isOpen={modalOpen}
        publisher={selectedPublisher}
        onDismiss={() => setModalOpen(false)}
        onConfirm={handleConfirm}
        onRemoveParticipant={(id) => removeParticipant(id, modalParticipationId)}
        weekId={weekId}
        assignments={assignments}
        publishers={publishers}
        participations={participations}
        participationId={modalParticipationId}
      />

      <AddParticipantModal
        participationId={activeParticipationId}
        isOpen={addModalOpen}
        isLoading={isLoading}
        onDismiss={() => setAddModalOpen(false)}
        onAdd={(id) => addParticipant(id, activeParticipationId)}
        publishers={publishers}
        participations={participations}
      />
    </>
  );
}

import { IonChip, IonItem, IonLabel, IonList, IonNote } from "@ionic/react";

import type { Publisher } from "../../publisher/schema.ts";
import { getPublisherDisplayName } from "../../publisher/schema.ts";
import type { MidweekParticipationId } from "../schema.ts";
import type { GenderFilter, PublisherAssignmentStats } from "./assignments.ts";
import { eligiblePublishers, sortPublishersByStats, statLabelFor } from "./assignments.ts";

export interface PublisherListProps {
  publishers: Publisher[];
  selectedId: string | undefined;
  onSelect: (publisherId: string) => void;
  stats: Map<string, PublisherAssignmentStats>;
  gender: GenderFilter | null;
  participationId: MidweekParticipationId;
  participationTypes: Map<string, Set<MidweekParticipationId>>;
  weekAssignmentIds?: Set<string>;
}

export function PublisherList({
  publishers,
  selectedId,
  onSelect,
  stats,
  gender,
  participationId,
  participationTypes,
  weekAssignmentIds,
}: PublisherListProps) {
  const filtered = eligiblePublishers(publishers, participationTypes, participationId, gender);

  if (filtered.length === 0) {
    return (
      <IonList inset>
        <IonItem lines="none">
          <IonLabel color="medium">No participants for this part yet.</IonLabel>
        </IonItem>
      </IonList>
    );
  }

  const sorted = sortPublishersByStats(filtered, stats);

  return (
    <>
      <IonList inset>
        <IonItem lines="none">
          <IonLabel>{filtered.length} participants</IonLabel>
          <IonNote slot="end">{publishers.length} total</IonNote>
        </IonItem>
      </IonList>
      <IonList inset>
        {sorted.map((publisher, index) => {
          const publisherId = publisher.id ?? "";
          const selected = selectedId === publisherId;
          const hasWeekAssignment = weekAssignmentIds?.has(publisherId) ?? false;
          const statLabel = statLabelFor(publisherId, stats);
          return (
            <IonItem
              key={publisherId}
              button
              detail={false}
              lines={index === sorted.length - 1 ? "none" : "inset"}
              color={selected ? "primary" : undefined}
              onClick={() => onSelect(publisherId)}
            >
              <IonLabel color={!selected && hasWeekAssignment ? "warning" : undefined}>
                {getPublisherDisplayName(publisher)}
              </IonLabel>
              {statLabel && <IonChip color={selected ? "primary" : "medium"}>{statLabel}</IonChip>}
            </IonItem>
          );
        })}
      </IonList>
    </>
  );
}

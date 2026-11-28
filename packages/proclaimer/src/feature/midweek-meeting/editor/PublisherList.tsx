import { IonItem, IonLabel, IonList } from "@ionic/react";

import type { Publisher } from "../../publisher/schema.ts";
import { getPublisherDisplayName } from "../../publisher/schema.ts";
import type { MidweekParticipationId } from "../schema.ts";
import type { GenderFilter, PublisherAssignmentStats } from "./assignments.ts";
import {
  eligiblePublishers,
  sameTypeStatLabelFor,
  sortPublishersByStats,
  statLabelFor,
} from "./assignments.ts";

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

const statsGridStyle = {
  display: "grid",
  gridTemplateColumns: "40px 40px",
  gap: 8,
  textAlign: "right",
} as const;

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
          <IonLabel>
            {filtered.length} participants{" "}
            <span style={{ color: "var(--ion-color-medium)", fontSize: 13 }}>
              · {publishers.length} total
            </span>
          </IonLabel>
          <div
            slot="end"
            style={{
              ...statsGridStyle,
              color: "var(--ion-color-medium)",
              fontSize: 12,
            }}
          >
            <span>This</span>
            <span>Any</span>
          </div>
        </IonItem>
      </IonList>
      <IonList inset>
        {sorted.map((publisher, index) => {
          const publisherId = publisher.id ?? "";
          const selected = selectedId === publisherId;
          const hasWeekAssignment = weekAssignmentIds?.has(publisherId) ?? false;
          const anyStatLabel = statLabelFor(publisherId, stats) ?? "—";
          const thisStatLabel = sameTypeStatLabelFor(publisherId, stats) ?? "—";
          return (
            <IonItem
              key={publisherId}
              button
              detail={false}
              lines={index === sorted.length - 1 ? "none" : "inset"}
              onClick={() => onSelect(publisherId)}
            >
              <IonLabel
                color={selected ? "primary" : hasWeekAssignment ? "warning" : undefined}
                style={selected ? { fontSize: 17, fontWeight: 700 } : undefined}
              >
                {getPublisherDisplayName(publisher)}
              </IonLabel>
              <div slot="end" style={{ ...statsGridStyle, fontSize: 14 }}>
                <span>{thisStatLabel}</span>
                <span>{anyStatLabel}</span>
              </div>
            </IonItem>
          );
        })}
      </IonList>
    </>
  );
}

import {
  IonButton,
  IonItem,
  IonLabel,
  IonList,
  IonNote,
  IonSkeletonText,
  IonText,
} from "@ionic/react";

import type { EventCollection } from "./collection.ts";
import { EventListRow } from "./EventListRow.tsx";
import { useEvents } from "./hooks.ts";
import { groupUpcomingEvents, type EventGroup } from "./presentation.ts";

export interface EventsViewProps {
  congregationId?: string | null;
  collection?: EventCollection;
}

function MonthHeader({ label }: { label: string }) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 10,
        padding: "18px 20px 6px",
        color: "var(--ion-color-medium)",
        fontSize: 12,
        fontWeight: 700,
        letterSpacing: "0.06em",
        textTransform: "uppercase",
      }}
    >
      <span>{label}</span>
      <span
        style={{
          flex: 1,
          height: 1,
          background: "color-mix(in srgb, var(--ion-color-medium) 35%, transparent)",
        }}
      />
    </div>
  );
}

function EventGroupSection({ group }: { group: EventGroup }) {
  return (
    <div>
      <MonthHeader label={group.label} />
      <IonList inset lines="none" style={{ marginTop: 4 }}>
        {group.events.map((event, index) => (
          <EventListRow key={event.id} event={event} isLast={index === group.events.length - 1} />
        ))}
      </IonList>
    </div>
  );
}

function LoadingBody() {
  return (
    <IonList inset>
      {[0, 1, 2, 3].map((row) => (
        <IonItem key={row} lines={row === 3 ? "none" : "inset"}>
          <IonLabel>
            <IonSkeletonText animated style={{ width: "40%", height: 13 }} />
            <p>
              <IonSkeletonText animated style={{ width: "65%", height: 11 }} />
            </p>
          </IonLabel>
        </IonItem>
      ))}
    </IonList>
  );
}

export function EventsView({ congregationId, collection }: EventsViewProps) {
  const { events, isLoading, error, canRetry, retry } = useEvents(congregationId, collection);
  const groups = groupUpcomingEvents(events);

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
    return <LoadingBody />;
  }

  if (groups.length === 0) {
    return (
      <div style={{ padding: "40px 24px", textAlign: "center" }}>
        <IonText color="medium">
          <p>No upcoming events.</p>
        </IonText>
      </div>
    );
  }

  return (
    <>
      {groups.map((group) => (
        <EventGroupSection key={group.key} group={group} />
      ))}
    </>
  );
}

import { IonItem, IonLabel, IonList } from "@ionic/react";

import type { EventCollection } from "../event/collection.ts";
import { EventListRow } from "../event/EventListRow.tsx";
import { useEvents } from "../event/hooks.ts";
import { groupUpcomingEvents } from "../event/presentation.ts";

export interface HomeEventsProps {
  congregationId?: string | null;
  collection?: EventCollection;
  now?: Date;
}

export function HomeEvents({ congregationId, collection, now }: HomeEventsProps) {
  const { events, isLoading } = useEvents(congregationId, collection);
  const upcoming = groupUpcomingEvents(events, now)
    .flatMap((group) => group.events)
    .slice(0, 3);

  if (isLoading || upcoming.length === 0) {
    return null;
  }

  return (
    <div style={{ paddingBottom: 16 }}>
      <IonItem lines="inset">
        <IonLabel>
          <span style={{ color: "var(--ion-color-primary)", fontSize: "1.125rem" }}>Events</span>
        </IonLabel>
      </IonItem>
      <IonList>
        {upcoming.map((event, index) => (
          <EventListRow
            key={event.id}
            event={event}
            isLast={index === upcoming.length - 1}
            dateOnTop
          />
        ))}
      </IonList>
    </div>
  );
}

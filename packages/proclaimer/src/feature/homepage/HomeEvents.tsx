import { IonItem, IonLabel, IonList } from "@ionic/react";

import type { EventCollection } from "../event/collection.ts";
import { EventListRow } from "../event/EventListRow.tsx";
import { useEvents } from "../event/hooks.ts";
import { groupUpcomingEvents } from "../event/presentation.ts";

export interface HomeEventsProps {
  congregationId?: string | null;
  collection?: EventCollection;
  now?: Date;
  routerLink?: string;
}

export function HomeEvents({
  congregationId,
  collection,
  now,
  routerLink = "/home/events",
}: HomeEventsProps) {
  const { events, isLoading } = useEvents(congregationId, collection);
  const upcoming = groupUpcomingEvents(events, now).flatMap((group) => group.events);
  const preview = upcoming.slice(0, 3);

  if (isLoading || preview.length === 0) {
    return null;
  }

  const showSeeMore = upcoming.length > preview.length;

  return (
    <div style={{ paddingBottom: 16 }}>
      <IonItem lines="inset">
        <IonLabel>
          <span style={{ color: "var(--ion-color-primary)", fontSize: "1.125rem" }}>Events</span>
        </IonLabel>
      </IonItem>
      <IonList>
        {preview.map((event, index) => (
          <EventListRow
            key={event.id}
            event={event}
            isLast={index === preview.length - 1 && !showSeeMore}
          />
        ))}
      </IonList>
      {showSeeMore && (
        <IonItem button detail routerLink={routerLink} lines="none">
          <IonLabel className="ion-text-end" color="primary" style={{ fontSize: "0.875rem" }}>
            See more
          </IonLabel>
        </IonItem>
      )}
    </div>
  );
}

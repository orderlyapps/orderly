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
import { useEvents } from "./hooks.ts";
import {
  eventDateMeta,
  eventDayChip,
  eventMonthChip,
  eventSubtitle,
  eventTitle,
  groupUpcomingEvents,
  type EventGroup,
} from "./presentation.ts";
import type { EventRow } from "./schema.ts";

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

function DateChip({ event }: { event: EventRow }) {
  // The date is also announced by the meta line below; the chip is decorative.
  const day = eventDayChip(event);
  return (
    <div
      slot="start"
      aria-hidden="true"
      style={{
        minWidth: 40,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        paddingTop: 2,
      }}
    >
      <span
        style={{
          fontSize: 10,
          fontWeight: 700,
          letterSpacing: "0.08em",
          color: "var(--ion-color-primary)",
        }}
      >
        {eventMonthChip(event)}
      </span>
      <span
        style={{
          fontSize: day.includes("–") ? 13 : 17,
          fontWeight: 600,
          lineHeight: 1.2,
          whiteSpace: "nowrap",
        }}
      >
        {day}
      </span>
    </div>
  );
}

function EventListRow({ event, isLast }: { event: EventRow; isLast: boolean }) {
  const detail = [eventSubtitle(event), event.description.trim(), event.address.trim()]
    .filter((part): part is string => Boolean(part))
    .filter((part, index, all) => all.indexOf(part) === index)
    .join(" · ");
  return (
    <IonItem lines={isLast ? "none" : "inset"} style={{ "--min-height": "52px" }}>
      <DateChip event={event} />
      <IonLabel style={{ marginBlock: 8 }}>
        <div style={{ fontSize: 15, fontWeight: 600 }}>{eventTitle(event)}</div>
        <div style={{ paddingTop: 2, fontSize: 13, color: "var(--ion-color-medium)" }}>
          {eventDateMeta(event)}
        </div>
        {detail && (
          <div
            style={{
              paddingTop: 2,
              fontSize: 13,
              color: "var(--ion-color-medium)",
              whiteSpace: "normal",
            }}
          >
            {detail}
          </div>
        )}
      </IonLabel>
    </IonItem>
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

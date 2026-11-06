import { IonItem, IonLabel } from "@ionic/react";

import {
  eventDateMeta,
  eventDayChip,
  eventMonthChip,
  eventSubtitle,
  eventTitle,
} from "./presentation.ts";
import type { EventRow } from "./schema.ts";

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

export function EventListRow({
  event,
  isLast,
  dateOnTop = false,
}: {
  event: EventRow;
  isLast: boolean;
  dateOnTop?: boolean;
}) {
  const detail = [eventSubtitle(event), event.description.trim(), event.address.trim()]
    .filter((part): part is string => Boolean(part))
    .filter((part, index, all) => all.indexOf(part) === index)
    .join(" · ");
  return (
    <IonItem lines={isLast ? "none" : "inset"} style={{ "--min-height": "52px" }}>
      {!dateOnTop && <DateChip event={event} />}
      <IonLabel style={{ marginBlock: 8 }}>
        {dateOnTop && (
          <div style={{ fontSize: 13, fontWeight: 600, color: "var(--ion-text-color)" }}>
            {eventDateMeta(event)}
          </div>
        )}
        <div
          style={{
            paddingTop: dateOnTop ? 2 : 0,
            fontSize: 15,
            fontWeight: dateOnTop ? 400 : 600,
          }}
        >
          {eventTitle(event)}
        </div>
        {!dateOnTop && (
          <div style={{ paddingTop: 2, fontSize: 13, color: "var(--ion-color-medium)" }}>
            {eventDateMeta(event)}
          </div>
        )}
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

import { IonItem, IonLabel } from "@ionic/react";

import { eventDateMeta, eventSubtitle, eventTitle } from "./presentation.ts";
import type { EventRow } from "./schema.ts";

export function EventListRow({ event, isLast }: { event: EventRow; isLast: boolean }) {
  const detail = [eventSubtitle(event), event.description.trim(), event.address.trim()]
    .filter((part): part is string => Boolean(part))
    .filter((part, index, all) => all.indexOf(part) === index)
    .join(" · ");
  return (
    <IonItem lines={isLast ? "none" : "inset"} style={{ "--min-height": "52px" }}>
      <IonLabel style={{ marginBlock: 8 }}>
        <p style={{ color: "var(--ion-text-color)", fontWeight: 600 }}>{eventDateMeta(event)}</p>
        <div style={{ paddingTop: 2, fontSize: 15 }}>{eventTitle(event)}</div>
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

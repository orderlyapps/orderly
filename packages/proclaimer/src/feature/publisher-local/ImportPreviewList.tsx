import { IonItem, IonLabel, IonList, IonNote } from "@ionic/react";

import type { Publisher } from "../publisher/schema.ts";
import type { NameLookup } from "./address.ts";
import { buildImportPreviewItems } from "./preview.ts";
import type { PublisherLocal } from "./schema.ts";

export interface ImportPreviewListProps {
  records: PublisherLocal[];
  existing: PublisherLocal[];
  publishers: Publisher[];
  suburbs?: NameLookup[];
  streets?: NameLookup[];
}

export function ImportPreviewList({
  records,
  existing,
  publishers,
  suburbs = [],
  streets = [],
}: ImportPreviewListProps) {
  const items = buildImportPreviewItems({ records, existing, publishers, suburbs, streets });

  if (items.length === 0) {
    return (
      <IonNote color="medium" style={{ display: "block", marginBottom: "0.5rem" }}>
        No new or updated publisher data found in this import.
      </IonNote>
    );
  }

  return (
    <div>
      <IonNote style={{ display: "block", marginBottom: "0.5rem" }}>
        {items.length} publisher{items.length !== 1 ? "s" : ""} will be updated:
      </IonNote>
      <IonList>
        {items.map((item) => (
          <div key={item.publisher_id}>
            <IonItem lines="none">
              <IonLabel className="ion-text-wrap">
                <h2>{item.publisher_name}</h2>
              </IonLabel>
            </IonItem>
            {item.fields.map((field) => (
              <IonItem key={field.key} lines="none">
                <IonLabel className="ion-text-wrap">
                  <p>{field.label}</p>
                  <h3>{field.value}</h3>
                </IonLabel>
              </IonItem>
            ))}
          </div>
        ))}
      </IonList>
    </div>
  );
}

import { useEffect, useState } from "react";

import {
  IonAccordion,
  IonAccordionGroup,
  IonItem,
  IonLabel,
  IonList,
  IonNote,
  IonSpinner,
} from "@ionic/react";

import type { Publisher } from "../publisher/schema.ts";
import type { NameLookup } from "./address.ts";
import { buildImportPreviewItems, type PublisherImportPreviewItem } from "./preview.ts";
import type { PublisherLocal } from "./schema.ts";

export interface ImportPreviewListProps {
  records: PublisherLocal[];
  existing: PublisherLocal[];
  publishers: Publisher[];
  suburbs?: NameLookup[];
  streets?: NameLookup[];
}

// Shared empty defaults — a fresh `[]` per render would churn the useEffect
// dependency array and loop the deferred diff forever.
const EMPTY_LOOKUPS: NameLookup[] = [];

export function ImportPreviewList({
  records,
  existing,
  publishers,
  suburbs = EMPTY_LOOKUPS,
  streets = EMPTY_LOOKUPS,
}: ImportPreviewListProps) {
  const [result, setResult] = useState<{
    records: PublisherLocal[];
    existing: PublisherLocal[];
    publishers: Publisher[];
    suburbs: NameLookup[];
    streets: NameLookup[];
    items: PublisherImportPreviewItem[];
  } | null>(null);

  useEffect(() => {
    // Defer the synchronous diff so the loading indicator can paint first.
    const timer = setTimeout(() => {
      setResult({
        records,
        existing,
        publishers,
        suburbs,
        streets,
        items: buildImportPreviewItems({ records, existing, publishers, suburbs, streets }),
      });
    }, 0);
    return () => clearTimeout(timer);
  }, [records, existing, publishers, suburbs, streets]);

  // Only trust a result computed from the current inputs — anything older is
  // stale and would paint the previous preview until the effect reruns.
  const items =
    result &&
    result.records === records &&
    result.existing === existing &&
    result.publishers === publishers &&
    result.suburbs === suburbs &&
    result.streets === streets
      ? result.items
      : null;

  if (items === null) {
    return (
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <IonSpinner name="crescent" />
        <IonNote color="medium">Comparing with existing data…</IonNote>
      </div>
    );
  }

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
      <IonAccordionGroup>
        {items.map((item) => (
          <IonAccordion key={item.publisher_id} value={item.publisher_id}>
            <IonItem slot="header">
              <IonLabel className="ion-text-wrap">
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                  }}
                >
                  <span>{item.publisher_name}</span>
                  <IonNote style={{ marginInlineEnd: 8 }}>
                    {item.fields.length} update{item.fields.length !== 1 ? "s" : ""}
                  </IonNote>
                </div>
              </IonLabel>
            </IonItem>
            <div slot="content">
              <IonList>
                {item.fields.map((field) => (
                  <IonItem key={field.key} lines="none">
                    <IonLabel className="ion-text-wrap">
                      <p>{field.label}</p>
                      {field.previousValue != null && (
                        <p>
                          <IonNote>Current: {field.previousValue}</IonNote>
                        </p>
                      )}
                      <h3>New: {field.value}</h3>
                    </IonLabel>
                  </IonItem>
                ))}
              </IonList>
            </div>
          </IonAccordion>
        ))}
      </IonAccordionGroup>
    </div>
  );
}

import { useState } from "react";

import {
  IonAccordion,
  IonAccordionGroup,
  IonItem,
  IonLabel,
  IonList,
  IonNote,
  IonSpinner,
} from "@ionic/react";

import type { PublisherImportPreviewItem } from "./preview.ts";

export interface ImportPreviewListProps {
  /** Null while the diff against existing data is still being computed. */
  items: PublisherImportPreviewItem[] | null;
}

export function ImportPreviewList({ items }: ImportPreviewListProps) {
  const [openId, setOpenId] = useState<string | undefined>(undefined);
  if (items === null) {
    return (
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 8,
        }}
      >
        <IonSpinner name="crescent" />
        <IonNote color="medium">Comparing with existing data…</IonNote>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <IonNote color="danger" style={{ display: "block", marginBottom: "0.5rem" }}>
        No new or updated publisher data found in this file.
      </IonNote>
    );
  }

  return (
    <div>
      <IonNote style={{ display: "block", marginBottom: "0.5rem" }}>
        {items.length} publisher{items.length !== 1 ? "s" : ""} will be updated:
      </IonNote>
      <IonAccordionGroup
        onIonChange={(e) => {
          const value = e.detail.value;
          setOpenId(typeof value === "string" ? value : undefined);
        }}
      >
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
                  <span
                    style={
                      item.publisher_id === openId
                        ? { fontWeight: "bold", fontSize: "1.1rem" }
                        : undefined
                    }
                  >
                    {item.publisher_name}
                  </span>
                  <IonNote style={{ marginInlineEnd: 8 }}>
                    {item.fields.length} update{item.fields.length !== 1 ? "s" : ""}
                  </IonNote>
                </div>
              </IonLabel>
            </IonItem>
            <div slot="content" style={{ paddingBottom: "2.5rem" }}>
              <IonList>
                {item.fields.map((field) => (
                  <IonItem key={field.key} lines="none">
                    <IonLabel className="ion-text-wrap" style={{ margin: "0.375rem 0" }}>
                      <p style={{ color: "var(--ion-color-secondary)" }}>{field.label}</p>
                      <div
                        style={{
                          display: "inline-grid",
                          gridTemplateColumns: "auto auto",
                          columnGap: "0.75rem",
                          textAlign: "left",
                          // These <p>s aren't direct slotted children of
                          // ion-label, so they miss its ::slotted(p) styles —
                          // reapply the same size/margins here.
                          fontSize: "0.875rem",
                        }}
                      >
                        {field.previousValue != null && (
                          <>
                            <p style={{ margin: 0, color: "var(--ion-color-medium)" }}>Current:</p>
                            <p
                              style={{
                                margin: 0,
                                color:
                                  "var(--ion-color-step-600, var(--ion-text-color-step-400, #666666))",
                              }}
                            >
                              {field.previousValue}
                            </p>
                          </>
                        )}
                        <p style={{ margin: 0, color: "var(--ion-color-medium)" }}>New:</p>
                        <p
                          style={{
                            margin: 0,
                            color:
                              "var(--ion-color-step-600, var(--ion-text-color-step-400, #666666))",
                          }}
                        >
                          {field.value}
                        </p>
                      </div>
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

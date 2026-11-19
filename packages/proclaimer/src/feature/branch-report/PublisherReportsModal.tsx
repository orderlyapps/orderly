import { useState } from "react";

import {
  IonButton,
  IonButtons,
  IonContent,
  IonHeader,
  IonItem,
  IonLabel,
  IonList,
  IonListHeader,
  IonModal,
  IonNote,
  IonSearchbar,
  IonSkeletonText,
  IonTitle,
  IonToolbar,
} from "@ionic/react";

import { monthLabel } from "../../util/month.ts";
import { getPublisherDisplayName, type Publisher } from "../publisher/schema.ts";
import type { ReportStatEntry } from "./stats.ts";

export interface PublisherReportsModalProps {
  isOpen: boolean;
  isLoading: boolean;
  monthId: string;
  /** Singular/plural reporter labels, e.g. "auxiliary pioneer"/"auxiliary pioneers". */
  singular: string;
  plural: string;
  /** Publishers counted in the "Number of Reports" stat, in name order. */
  entries: ReportStatEntry[];
  /** Active reports that could not be resolved to a name on this device. */
  unresolvedCount: number;
  /** Called with a tapped publisher (e.g. to open their report history). */
  onSelectPublisher?: (publisher: Publisher) => void;
  onDismiss: () => void;
}

/** Lists the publishers counted in the "Number of Reports" stat. */
export function PublisherReportsModal({
  isOpen,
  isLoading,
  monthId,
  singular,
  plural,
  entries,
  unresolvedCount,
  onSelectPublisher,
  onDismiss,
}: PublisherReportsModalProps) {
  const [searchQuery, setSearchQuery] = useState("");

  const query = searchQuery.trim().toLowerCase();
  const filtered = entries
    .map((entry) => ({ ...entry, displayName: getPublisherDisplayName(entry.publisher) }))
    .filter(({ displayName }) => displayName.toLowerCase().includes(query));

  function handleDismiss() {
    setSearchQuery("");
    onDismiss();
  }

  return (
    <IonModal isOpen={isOpen} onDidDismiss={handleDismiss}>
      <IonHeader>
        <IonToolbar>
          <IonTitle>Number of Reports</IonTitle>
          <IonButtons slot="end">
            <IonButton onClick={handleDismiss}>Close</IonButton>
          </IonButtons>
        </IonToolbar>
        <IonToolbar>
          <IonSearchbar
            value={searchQuery}
            onIonInput={(event) => setSearchQuery(event.detail.value ?? "")}
            debounce={100}
            placeholder="Search names"
          />
        </IonToolbar>
      </IonHeader>
      <IonContent>
        <IonList>
          <IonListHeader>
            <IonLabel>
              <IonNote>
                {plural[0].toUpperCase() + plural.slice(1)} reporting in {monthLabel(monthId)}
              </IonNote>
            </IonLabel>
          </IonListHeader>
          {isLoading ? (
            [1, 2, 3].map((i) => (
              <IonItem key={i}>
                <IonLabel>
                  <IonSkeletonText style={{ width: "60%" }} />
                </IonLabel>
              </IonItem>
            ))
          ) : (
            <>
              {filtered.length === 0 && unresolvedCount === 0 ? (
                <IonItem lines="none">
                  <IonLabel color="medium">
                    {query ? `No matching ${plural}.` : `No ${plural} reported this month.`}
                  </IonLabel>
                </IonItem>
              ) : (
                filtered.map(({ publisher, displayName }) => {
                  const selectable = onSelectPublisher != null && publisher.id != null;
                  return (
                    <IonItem
                      key={publisher.id ?? displayName}
                      button={selectable}
                      detail={selectable}
                      onClick={
                        selectable
                          ? () => {
                              onSelectPublisher(publisher);
                              handleDismiss();
                            }
                          : undefined
                      }
                    >
                      <IonLabel>{displayName}</IonLabel>
                    </IonItem>
                  );
                })
              )}
              {unresolvedCount > 0 && (
                <IonItem lines="none">
                  <IonNote>
                    {unresolvedCount} more {unresolvedCount === 1 ? singular : plural} could not be
                    matched to a name on this device.
                  </IonNote>
                </IonItem>
              )}
            </>
          )}
        </IonList>
      </IonContent>
    </IonModal>
  );
}

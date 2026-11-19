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
import { getPublisherDisplayName } from "../publisher/schema.ts";
import type { PublisherReportEntry } from "./stats.ts";

export interface BibleStudiesModalProps {
  isOpen: boolean;
  isLoading: boolean;
  monthId: string;
  /** Publishers counted in the "Bible Studies" stat, in name order. */
  entries: PublisherReportEntry[];
  /** Sum of bible studies across `entries`. */
  total: number;
  /** Reports with studies that could not be resolved to a name on this device. */
  unresolvedCount: number;
  onDismiss: () => void;
}

/** Lists the publishers counted in the "Bible Studies" stat with their study counts. */
export function BibleStudiesModal({
  isOpen,
  isLoading,
  monthId,
  entries,
  total,
  unresolvedCount,
  onDismiss,
}: BibleStudiesModalProps) {
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
          <IonTitle>Bible Studies</IonTitle>
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
                {isLoading
                  ? `Studies reported in ${monthLabel(monthId)}`
                  : `${total} ${total === 1 ? "study" : "studies"} reported in ${monthLabel(monthId)}`}
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
                    {query ? "No matching publishers." : "No bible studies reported this month."}
                  </IonLabel>
                </IonItem>
              ) : (
                filtered.map(({ publisher, displayName, bibleStudies }) => (
                  <IonItem key={publisher.id ?? displayName}>
                    <IonLabel>{displayName}</IonLabel>
                    <IonNote slot="end">{bibleStudies ?? 0}</IonNote>
                  </IonItem>
                ))
              )}
              {unresolvedCount > 0 && (
                <IonItem lines="none">
                  <IonNote>
                    Studies reported by {unresolvedCount} more{" "}
                    {unresolvedCount === 1 ? "publisher" : "publishers"} could not be matched to a
                    name on this device.
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

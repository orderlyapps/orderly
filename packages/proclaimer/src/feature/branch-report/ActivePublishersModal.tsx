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

import { monthLabel, shiftMonthId } from "../../util/month.ts";
import { getPublisherDisplayName, type Publisher } from "../publisher/schema.ts";
import { ACTIVE_PUBLISHER_WINDOW_MONTHS } from "./stats.ts";

export interface ActivePublishersModalProps {
  isOpen: boolean;
  isLoading: boolean;
  monthId: string;
  publishers: Publisher[];
  /** Active reporters that could not be resolved to a name on this device. */
  unresolvedCount: number;
  onDismiss: () => void;
}

/** Lists the publishers counted in the "All Active Publishers" stat. */
export function ActivePublishersModal({
  isOpen,
  isLoading,
  monthId,
  publishers,
  unresolvedCount,
  onDismiss,
}: ActivePublishersModalProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const windowStart = shiftMonthId(monthId, -(ACTIVE_PUBLISHER_WINDOW_MONTHS - 1));

  const query = searchQuery.trim().toLowerCase();
  const filtered = publishers
    .map((publisher) => ({ publisher, displayName: getPublisherDisplayName(publisher) }))
    .filter(({ displayName }) => displayName.toLowerCase().includes(query));

  function handleDismiss() {
    setSearchQuery("");
    onDismiss();
  }

  return (
    <IonModal isOpen={isOpen} onDidDismiss={handleDismiss}>
      <IonHeader>
        <IonToolbar>
          <IonTitle>All Active Publishers</IonTitle>
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
                Active at least once, {monthLabel(windowStart)} – {monthLabel(monthId)}
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
                    {query ? "No matching publishers." : "No active publishers in this period."}
                  </IonLabel>
                </IonItem>
              ) : (
                filtered.map(({ publisher, displayName }) => (
                  <IonItem key={publisher.id ?? displayName}>
                    <IonLabel>{displayName}</IonLabel>
                  </IonItem>
                ))
              )}
              {unresolvedCount > 0 && (
                <IonItem lines="none">
                  <IonNote>
                    {unresolvedCount} more active{" "}
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

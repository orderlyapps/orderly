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
import type { Report } from "./schema.ts";
import type { ReportStatEntry } from "./stats.ts";

export interface ReportValuesModalProps {
  isOpen: boolean;
  isLoading: boolean;
  monthId: string;
  /** Modal title, e.g. "Hours" or "Bible Studies". */
  title: string;
  /** Singular/plural reporter labels, e.g. "auxiliary pioneer"/"auxiliary pioneers". */
  singular: string;
  plural: string;
  /** Singular/plural unit labels, e.g. "hour"/"hours" or "study"/"studies". */
  unitSingular: string;
  unitPlural: string;
  /** Publishers counted in the stat, in name order. */
  entries: ReportStatEntry[];
  /** Reads the stat's value off a publisher's report. */
  valueOf: (report: Report) => number | null;
  /** Sum of the stat's value across `entries`. */
  total: number;
  /** Reports with a value that could not be resolved to a name on this device. */
  unresolvedCount: number;
  /** Called with a tapped publisher (e.g. to open their report history). */
  onSelectPublisher?: (publisher: Publisher) => void;
  onDismiss: () => void;
}

/** Lists the publishers counted in a value stat (hours, bible studies) with their reported values. */
export function ReportValuesModal({
  isOpen,
  isLoading,
  monthId,
  title,
  singular,
  plural,
  unitSingular,
  unitPlural,
  entries,
  valueOf,
  total,
  unresolvedCount,
  onSelectPublisher,
  onDismiss,
}: ReportValuesModalProps) {
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
          <IonTitle>{title}</IonTitle>
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
                  ? `${unitPlural[0].toUpperCase() + unitPlural.slice(1)} reported by ${plural} in ${monthLabel(monthId)}`
                  : `${total} ${total === 1 ? unitSingular : unitPlural} reported by ${plural} in ${monthLabel(monthId)}`}
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
                    {query ? `No matching ${plural}.` : `No ${unitPlural} reported this month.`}
                  </IonLabel>
                </IonItem>
              ) : (
                filtered.map(({ publisher, displayName, report }) => {
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
                      <IonNote slot="end">{valueOf(report) ?? 0}</IonNote>
                    </IonItem>
                  );
                })
              )}
              {unresolvedCount > 0 && (
                <IonItem lines="none">
                  <IonNote>
                    {unitPlural[0].toUpperCase() + unitPlural.slice(1)} reported by{" "}
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

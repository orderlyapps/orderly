import { useState } from "react";

import {
  IonButton,
  IonItem,
  IonLabel,
  IonList,
  IonNote,
  IonSearchbar,
  IonSkeletonText,
} from "@ionic/react";

import {
  getPublisherDisplayName,
  usePublishers,
  type PublisherCollection,
} from "../publisher/index.ts";
import { filterDirectoryPublishers } from "./directory.ts";

export interface PublisherDirectoryViewProps {
  congregationId?: string | null;
  collection?: PublisherCollection;
  /** Base route for publisher detail pages; the publisher id is appended. */
  detailBasePath?: string;
  /** Include archived publishers, speakers, and congregation entries. */
  includeRestricted?: boolean;
}

export function PublisherDirectoryView({
  congregationId,
  collection,
  detailBasePath = "/publishers/all",
  includeRestricted = false,
}: PublisherDirectoryViewProps) {
  const { publishers, isLoading, error, canRetry, retry } = usePublishers(
    congregationId,
    collection,
  );
  const [query, setQuery] = useState("");
  const visible = filterDirectoryPublishers(publishers, {
    query,
    includeRestricted,
  });

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

  return (
    <>
      <IonSearchbar
        value={query}
        placeholder="Search by name"
        debounce={150}
        onIonInput={(event) => {
          setQuery(event.detail.value ?? "");
        }}
      />
      <IonList>
        {isLoading ? (
          [0, 1, 2, 3].map((key) => (
            <IonItem key={key} lines={key === 3 ? "none" : "inset"}>
              <IonLabel>
                <IonSkeletonText animated style={{ width: "55%", height: 13 }} />
              </IonLabel>
            </IonItem>
          ))
        ) : visible.length === 0 ? (
          <IonItem lines="none">
            <IonNote>{query.trim() ? "No matching publishers" : "No publishers"}</IonNote>
          </IonItem>
        ) : (
          visible.map((publisher, index) => (
            <IonItem
              key={publisher.id ?? index}
              lines={index === visible.length - 1 ? "none" : "inset"}
              button={publisher.id != null}
              detail={publisher.id != null}
              routerLink={
                publisher.id != null
                  ? `${detailBasePath}/${encodeURIComponent(publisher.id)}`
                  : undefined
              }
            >
              <IonLabel>{getPublisherDisplayName(publisher)}</IonLabel>
            </IonItem>
          ))
        )}
      </IonList>
    </>
  );
}

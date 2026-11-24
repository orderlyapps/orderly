import { IonButton, IonItem, IonLabel, IonList, IonNote, IonSkeletonText } from "@ionic/react";

import {
  getPublisherDisplayName,
  isArchived,
  isElder,
  isMinisterialServant,
  isRemoved,
  pioneerBadgeLabel,
  publisherStandingLabel,
  usePublishers,
  type Publisher,
  type PublisherCollection,
} from "../publisher/index.ts";

export interface PublisherDirectoryViewProps {
  congregationId?: string | null;
  collection?: PublisherCollection;
  /** Base route for publisher detail pages; the publisher id is appended. */
  detailBasePath?: string;
}

function directoryNote(publisher: Publisher): string | null {
  if (isArchived(publisher)) {
    return "Archived";
  }
  if (isRemoved(publisher)) {
    return "Removed";
  }
  if (isElder(publisher) || isMinisterialServant(publisher)) {
    return publisherStandingLabel(publisher);
  }
  return pioneerBadgeLabel(publisher);
}

export function PublisherDirectoryView({
  congregationId,
  collection,
  detailBasePath = "/publishers/directory",
}: PublisherDirectoryViewProps) {
  const { publishers, isLoading, error, canRetry, retry } = usePublishers(
    congregationId,
    collection,
  );

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
    <IonList>
      {isLoading ? (
        [0, 1, 2, 3].map((key) => (
          <IonItem key={key} lines={key === 3 ? "none" : "inset"}>
            <IonLabel>
              <IonSkeletonText animated style={{ width: "55%", height: 13 }} />
            </IonLabel>
          </IonItem>
        ))
      ) : publishers.length === 0 ? (
        <IonItem lines="none">
          <IonNote>No publishers</IonNote>
        </IonItem>
      ) : (
        publishers.map((publisher, index) => {
          const note = directoryNote(publisher);
          return (
            <IonItem
              key={publisher.id ?? index}
              lines={index === publishers.length - 1 ? "none" : "inset"}
              button={publisher.id != null}
              detail={publisher.id != null}
              routerLink={
                publisher.id != null
                  ? `${detailBasePath}/${encodeURIComponent(publisher.id)}`
                  : undefined
              }
            >
              <IonLabel>{getPublisherDisplayName(publisher)}</IonLabel>
              {note && <IonNote slot="end">{note}</IonNote>}
            </IonItem>
          );
        })
      )}
    </IonList>
  );
}

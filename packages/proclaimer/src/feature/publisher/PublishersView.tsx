import {
  IonAccordion,
  IonAccordionGroup,
  IonButton,
  IonItem,
  IonLabel,
  IonList,
  IonNote,
  IonSkeletonText,
} from "@ionic/react";

import type { PublisherCollection } from "./collection.ts";
import { usePublishers } from "./hooks.ts";
import { groupPublishers, pioneerBadgeLabel } from "./presentation.ts";
import { getPublisherDisplayName, type Publisher } from "./schema.ts";

export interface PublishersViewProps {
  congregationId?: string | null;
  collection?: PublisherCollection;
}

interface PublisherAccordionProps {
  value: string;
  label: string;
  emptyLabel: string;
  publishers: Publisher[];
  isLoading: boolean;
}

function PublisherAccordion({
  value,
  label,
  emptyLabel,
  publishers,
  isLoading,
}: PublisherAccordionProps) {
  return (
    <IonAccordion value={value}>
      <IonItem slot="header" lines="inset">
        <IonLabel>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <span style={{ color: "var(--ion-color-primary)", fontSize: "1.125rem" }}>{label}</span>
            {!isLoading && <IonNote style={{ marginInlineEnd: 8 }}>{publishers.length}</IonNote>}
          </div>
        </IonLabel>
      </IonItem>
      <div slot="content" style={{ paddingBottom: 16 }}>
        <IonList>
          {isLoading ? (
            <IonItem lines="none">
              <IonLabel>
                <IonSkeletonText animated style={{ width: "50%", height: 13 }} />
              </IonLabel>
            </IonItem>
          ) : publishers.length === 0 ? (
            <IonItem lines="none">
              <IonNote>{emptyLabel}</IonNote>
            </IonItem>
          ) : (
            publishers.map((publisher, index) => (
              <IonItem
                key={publisher.id ?? index}
                lines={index === publishers.length - 1 ? "none" : "inset"}
              >
                <IonLabel>{getPublisherDisplayName(publisher)}</IonLabel>
                {pioneerBadgeLabel(publisher) && (
                  <IonNote slot="end">{pioneerBadgeLabel(publisher)}</IonNote>
                )}
              </IonItem>
            ))
          )}
        </IonList>
      </div>
    </IonAccordion>
  );
}

export function PublishersView({ congregationId, collection }: PublishersViewProps) {
  const { publishers, isLoading, error, canRetry, retry } = usePublishers(
    congregationId,
    collection,
  );
  const groups = groupPublishers(publishers);

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
    <IonAccordionGroup>
      <PublisherAccordion
        value="elders"
        label="Elders"
        emptyLabel="No elders"
        publishers={groups.elders}
        isLoading={isLoading}
      />
      <PublisherAccordion
        value="ministerial-servants"
        label="Ministerial Servants"
        emptyLabel="No ministerial servants"
        publishers={groups.ministerialServants}
        isLoading={isLoading}
      />
      <PublisherAccordion
        value="pioneers"
        label="Pioneers"
        emptyLabel="No pioneers"
        publishers={groups.pioneers}
        isLoading={isLoading}
      />
    </IonAccordionGroup>
  );
}

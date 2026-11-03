import { type ReactNode, useState } from "react";

import {
  IonButton,
  IonIcon,
  IonItem,
  IonItemGroup,
  IonLabel,
  IonList,
  IonNote,
  IonSearchbar,
  IonSpinner,
} from "@ionic/react";
import { checkmark } from "ionicons/icons";

import { getPublisherDisplayName, isPublisherRowId, type Publisher } from "./schema.ts";

export interface PublisherSelectProps {
  publishers: Publisher[];
  selectedId?: string;
  isLoading?: boolean;
  error?: Error | null;
  canRetry?: boolean;
  onRetry?: () => void;
  onSelect?: (publisherId: string) => void;
  children?: ReactNode;
}

export const PublisherSelect = ({
  publishers,
  selectedId,
  isLoading,
  error,
  canRetry,
  onRetry,
  onSelect,
  children,
}: PublisherSelectProps) => {
  const [query, setQuery] = useState("");

  const normalizedQuery = query.trim().toLowerCase();
  const filteredPublishers = publishers.filter((publisher) => {
    if (normalizedQuery.length === 0) {
      return true;
    }
    const displayName = getPublisherDisplayName(publisher).toLowerCase();
    const naturalName = `${publisher.first_name} ${publisher.last_name}`.toLowerCase();
    return displayName.includes(normalizedQuery) || naturalName.includes(normalizedQuery);
  });

  return (
    <>
      <IonSearchbar
        value={query}
        placeholder="Search publishers"
        onIonInput={(event) => {
          setQuery(event.detail.value ?? "");
        }}
      />
      <IonList inset>
        <IonItemGroup>
          {isLoading ? (
            <IonItem lines="none">
              <IonSpinner name="crescent" />
              <IonNote className="ion-padding-start">Loading publishers…</IonNote>
            </IonItem>
          ) : null}
          {error ? (
            <IonItem lines="none">
              <IonNote color="danger">{error.message || "Failed to load publishers"}</IonNote>
              {canRetry ? (
                <IonButton slot="end" size="small" fill="outline" onClick={onRetry}>
                  Retry
                </IonButton>
              ) : null}
            </IonItem>
          ) : null}
          {!isLoading && !error && filteredPublishers.length === 0 ? (
            <IonItem lines="none">
              <IonNote>No publishers found</IonNote>
            </IonItem>
          ) : null}
          {filteredPublishers.map((publisher) => {
            const id = publisher.id;
            if (!isPublisherRowId(id)) {
              return null;
            }
            return (
              <IonItem
                key={id}
                button
                detail={false}
                onClick={() => {
                  onSelect?.(id);
                }}
              >
                <IonLabel>{getPublisherDisplayName(publisher)}</IonLabel>
                {id === selectedId ? <IonIcon icon={checkmark} slot="end" color="primary" /> : null}
              </IonItem>
            );
          })}
          {children}
        </IonItemGroup>
      </IonList>
    </>
  );
};

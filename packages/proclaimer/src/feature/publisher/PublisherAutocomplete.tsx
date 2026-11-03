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

const MAX_SUGGESTIONS = 10;

export interface PublisherAutocompleteProps {
  publishers: Publisher[];
  selectedId?: string;
  isLoading?: boolean;
  error?: Error | null;
  canRetry?: boolean;
  onRetry?: () => void;
  onSelect?: (publisherId: string) => void;
  children?: ReactNode;
}

export const PublisherAutocomplete = ({
  publishers,
  selectedId,
  isLoading,
  error,
  canRetry,
  onRetry,
  onSelect,
  children,
}: PublisherAutocompleteProps) => {
  const [draft, setDraft] = useState<string | null>(null);

  const selectedPublisher = publishers.find(
    (publisher) => publisher.id === selectedId && isPublisherRowId(publisher.id),
  );
  const selectedName = selectedPublisher ? getPublisherDisplayName(selectedPublisher) : "";
  const value = draft ?? selectedName;

  const normalizedQuery = value.trim().toLowerCase();
  const isSearching = draft !== null && normalizedQuery.length > 0;
  const matches = isSearching
    ? publishers.filter((publisher) => {
        const displayName = getPublisherDisplayName(publisher).toLowerCase();
        const naturalName = `${publisher.first_name} ${publisher.last_name}`.toLowerCase();
        return displayName.includes(normalizedQuery) || naturalName.includes(normalizedQuery);
      })
    : [];
  const suggestions = matches.slice(0, MAX_SUGGESTIONS);

  return (
    <>
      <IonSearchbar
        value={value}
        placeholder="Search for your name"
        onIonInput={(event) => {
          setDraft(event.detail.value ?? "");
          if (selectedId) {
            onSelect?.("");
          }
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
          {!isLoading && !error && !isSearching ? (
            selectedPublisher ? (
              <IonItem
                button
                detail={false}
                onClick={() => {
                  onSelect?.("");
                }}
              >
                <IonLabel>{selectedName}</IonLabel>
                <IonIcon icon={checkmark} slot="end" color="primary" />
              </IonItem>
            ) : (
              <IonItem lines="none">
                <IonNote>Start typing your name to search</IonNote>
              </IonItem>
            )
          ) : null}
          {isSearching && !isLoading && !error && matches.length === 0 ? (
            <IonItem lines="none">
              <IonNote>No publishers found</IonNote>
            </IonItem>
          ) : null}
          {isSearching
            ? suggestions.map((publisher) => {
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
                      setDraft(null);
                      onSelect?.(id);
                    }}
                  >
                    <IonLabel>{getPublisherDisplayName(publisher)}</IonLabel>
                    {id === selectedId ? (
                      <IonIcon icon={checkmark} slot="end" color="primary" />
                    ) : null}
                  </IonItem>
                );
              })
            : null}
          {isSearching && matches.length > suggestions.length ? (
            <IonItem lines="none">
              <IonNote>{matches.length - suggestions.length} more matches — keep typing</IonNote>
            </IonItem>
          ) : null}
          {children}
        </IonItemGroup>
      </IonList>
    </>
  );
};

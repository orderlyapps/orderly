import {
  IonButton,
  IonButtons,
  IonContent,
  IonHeader,
  IonItem,
  IonItemGroup,
  IonLabel,
  IonList,
  IonModal,
  IonNote,
  IonSpinner,
  IonTitle,
  IonToolbar,
} from "@ionic/react";

import { territoryMapBounds, type TerritoryMap } from "./territory.ts";

export interface MapListModalProps {
  isOpen: boolean;
  maps: TerritoryMap[];
  isLoading?: boolean;
  error?: Error | null;
  onRetry?: () => void;
  onSelect: (map: TerritoryMap) => void;
  onDidDismiss: () => void;
}

export const MapListModal = ({
  isOpen,
  maps,
  isLoading,
  error,
  onRetry,
  onSelect,
  onDidDismiss,
}: MapListModalProps) => {
  return (
    <IonModal isOpen={isOpen} onDidDismiss={onDidDismiss}>
      <IonHeader>
        <IonToolbar>
          <IonTitle>Maps</IonTitle>
          <IonButtons slot="end">
            <IonButton onClick={onDidDismiss}>Close</IonButton>
          </IonButtons>
        </IonToolbar>
      </IonHeader>
      <IonContent>
        <IonList inset>
          <IonItemGroup>
            {isLoading ? (
              <IonItem lines="none">
                <IonSpinner name="crescent" />
                <IonNote className="ion-padding-start">Loading maps…</IonNote>
              </IonItem>
            ) : null}
            {error ? (
              <IonItem lines="none">
                <IonNote color="danger">{error.message || "Failed to load maps"}</IonNote>
                {onRetry ? (
                  <IonButton slot="end" size="small" fill="outline" onClick={onRetry}>
                    Retry
                  </IonButton>
                ) : null}
              </IonItem>
            ) : null}
            {!isLoading && !error && maps.length === 0 ? (
              <IonItem lines="none">
                <IonNote>No maps for this congregation</IonNote>
              </IonItem>
            ) : null}
            {maps.map((territoryMap, index) => {
              const hasGeometry = territoryMapBounds(territoryMap) !== null;
              return (
                <IonItem
                  key={territoryMap.id ?? index}
                  button
                  detail={false}
                  disabled={!hasGeometry}
                  onClick={() => {
                    onSelect(territoryMap);
                  }}
                >
                  <IonLabel>
                    <h2>{territoryMap.name}</h2>
                    {territoryMap.details ? (
                      <IonNote>{territoryMap.details}</IonNote>
                    ) : !hasGeometry ? (
                      <IonNote>No boundary</IonNote>
                    ) : null}
                  </IonLabel>
                </IonItem>
              );
            })}
          </IonItemGroup>
        </IonList>
      </IonContent>
    </IonModal>
  );
};

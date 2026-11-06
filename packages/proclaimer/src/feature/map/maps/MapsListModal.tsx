import {
  IonButton,
  IonButtons,
  IonContent,
  IonHeader,
  IonIcon,
  IonItem,
  IonLabel,
  IonList,
  IonModal,
  IonNote,
  IonSpinner,
  IonTitle,
  IonToolbar,
} from "@ionic/react";
import { checkmarkOutline, mapOutline } from "ionicons/icons";

import { useMapPolygons } from "./hooks.ts";
import { mapRowKey } from "./schema.ts";

export interface MapsListModalProps {
  isOpen: boolean;
  onDidDismiss: () => void;
  onSelect: (mapKey: string) => void;
  congregationId?: string;
  selectedMap?: string | null;
}

export function MapsListModal({
  isOpen,
  onDidDismiss,
  onSelect,
  congregationId,
  selectedMap = null,
}: MapsListModalProps) {
  const { maps, isLoading, error } = useMapPolygons(congregationId);

  return (
    <IonModal
      isOpen={isOpen}
      onDidDismiss={onDidDismiss}
      breakpoints={[0, 0.7, 1]}
      initialBreakpoint={0.7}
      handleBehavior="cycle"
    >
      <IonHeader>
        <IonToolbar>
          <IonTitle>Select Map</IonTitle>
          <IonButtons slot="end">
            <IonButton onClick={onDidDismiss}>Close</IonButton>
          </IonButtons>
        </IonToolbar>
      </IonHeader>
      <IonContent>
        {maps.length === 0 && isLoading ? (
          <div style={{ display: "flex", justifyContent: "center", padding: "48px 16px" }}>
            <IonSpinner />
          </div>
        ) : maps.length === 0 ? (
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 8,
              padding: "48px 16px",
            }}
          >
            <IonIcon icon={mapOutline} style={{ fontSize: 32, opacity: 0.4 }} />
            {error ? (
              <IonNote color="danger">{error.message}</IonNote>
            ) : (
              <IonNote color="medium">No maps available</IonNote>
            )}
          </div>
        ) : (
          <IonList>
            {maps.map((map, index) => {
              const key = mapRowKey(map);
              return (
                <IonItem
                  key={`${key}:${index}`}
                  button
                  detail={false}
                  onClick={() => onSelect(key)}
                >
                  <IonLabel>
                    <h2>{map.name}</h2>
                    {map.details ? <p>{map.details}</p> : null}
                  </IonLabel>
                  {key === selectedMap ? <IonIcon slot="end" icon={checkmarkOutline} /> : null}
                </IonItem>
              );
            })}
          </IonList>
        )}
      </IonContent>
    </IonModal>
  );
}

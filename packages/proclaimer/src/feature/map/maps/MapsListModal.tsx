import { useMemo, useState } from "react";

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
  IonSearchbar,
  IonSpinner,
  IonTitle,
  IonToolbar,
} from "@ionic/react";
import { checkmarkOutline, imageOutline, mapOutline } from "ionicons/icons";

import { MonthHeader } from "../../../components/MonthHeader.tsx";
import { useMapPolygons } from "./hooks.ts";
import { MapImageModal } from "./MapImageModal.tsx";
import { buildMapRowListSections, mapRowKey, type MapRow } from "./schema.ts";

export interface MapsListModalProps {
  isOpen: boolean;
  onDidDismiss: () => void;
  onSelect: (mapKey: string) => void;
  congregationId?: string;
  selectedMap?: string | null;
  recentMapKeys?: readonly string[];
  recentMapCount?: number;
}

export function MapsListModal({
  isOpen,
  onDidDismiss,
  onSelect,
  congregationId,
  selectedMap = null,
  recentMapKeys = [],
  recentMapCount = 0,
}: MapsListModalProps) {
  const { maps, isLoading, error } = useMapPolygons(congregationId);
  const [query, setQuery] = useState("");
  const [viewingMap, setViewingMap] = useState<MapRow | null>(null);

  const effectiveRecentMapKeys = useMemo(
    () => (recentMapKeys.length > 0 ? recentMapKeys : selectedMap ? [selectedMap] : []),
    [recentMapKeys, selectedMap],
  );
  const sections = useMemo(
    () => buildMapRowListSections(maps, query, effectiveRecentMapKeys, recentMapCount),
    [maps, query, effectiveRecentMapKeys, recentMapCount],
  );

  const handleDidDismiss = () => {
    setQuery("");
    onDidDismiss();
  };

  const renderMapItem = (map: MapRow, index: number) => {
    const key = mapRowKey(map);
    return (
      <IonItem key={`${key}:${index}`} button detail={false} onClick={() => onSelect(key)}>
        <IonLabel>
          <h2>{map.name}</h2>
          {map.details ? <p>{map.details}</p> : null}
        </IonLabel>
        {key === selectedMap ? <IonIcon slot="end" icon={checkmarkOutline} /> : null}
        {map.url ? (
          <IonButton
            slot="end"
            fill="clear"
            aria-label={`View ${map.name} image`}
            onClick={(event) => {
              event.preventDefault();
              event.stopPropagation();
              setViewingMap(map);
            }}
          >
            <IonIcon slot="icon-only" icon={imageOutline} />
          </IonButton>
        ) : null}
      </IonItem>
    );
  };

  return (
    <>
      <IonModal isOpen={isOpen} onDidDismiss={handleDidDismiss}>
        <IonHeader>
          <IonToolbar>
            <IonTitle>Select Map</IonTitle>
            <IonButtons slot="end">
              <IonButton onClick={handleDidDismiss}>Close</IonButton>
            </IonButtons>
          </IonToolbar>
          <IonToolbar>
            <IonSearchbar
              value={query}
              placeholder="Search maps"
              onIonInput={(event) => {
                setQuery(event.detail.value ?? "");
              }}
            />
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
            <>
              {sections.recentRows.length > 0 ? (
                <>
                  <MonthHeader label="Recent Maps" />
                  <IonList style={{ marginTop: 4 }}>
                    {sections.recentRows.map(renderMapItem)}
                  </IonList>
                </>
              ) : null}
              <MonthHeader label="All Maps" />
              <IonList style={{ marginTop: 4 }}>
                {sections.allRows.length === 0 ? (
                  <IonItem lines="none">
                    <IonNote>No maps found</IonNote>
                  </IonItem>
                ) : null}
                {sections.allRows.map(renderMapItem)}
              </IonList>
            </>
          )}
        </IonContent>
      </IonModal>
      <MapImageModal
        isOpen={viewingMap !== null}
        onDidDismiss={() => setViewingMap(null)}
        url={viewingMap?.url ?? null}
        title={viewingMap?.name}
      />
    </>
  );
}

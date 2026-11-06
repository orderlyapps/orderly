import { useState } from "react";

import {
  IonBackButton,
  IonButton,
  IonButtons,
  IonContent,
  IonHeader,
  IonIcon,
  IonPage,
  IonTitle,
  IonToolbar,
} from "@ionic/react";
import { map as mapIcon } from "ionicons/icons";
import {
  MAP_VIEW_STATE_STORAGE_KEY,
  MapListModal,
  MapView,
  TERRITORY_FIT_BOUNDS_OPTIONS,
  territoryMapBounds,
  useSettings,
  useTerritoryLayers,
  type MapboxMap,
} from "proclaimer-core";

import { mapboxAccessToken } from "../../config";

const Map = () => {
  const { settings } = useSettings();
  const [map, setMap] = useState<MapboxMap | null>(null);
  const [isMapListOpen, setMapListOpen] = useState(false);

  const {
    maps,
    isLoading: mapsLoading,
    error: mapsError,
    retry: retryMaps,
  } = useTerritoryLayers({
    map,
    congregationId: settings.congregationId || undefined,
    viewStateStorageKey: MAP_VIEW_STATE_STORAGE_KEY,
  });

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonButtons slot="start">
            <IonBackButton defaultHref="/ministry" />
          </IonButtons>
          <IonTitle>Map</IonTitle>
          <IonButtons slot="end">
            <IonButton
              aria-label="Show maps"
              disabled={!settings.congregationId}
              onClick={() => {
                setMapListOpen(true);
              }}
            >
              <IonIcon slot="icon-only" icon={mapIcon} />
            </IonButton>
          </IonButtons>
        </IonToolbar>
      </IonHeader>
      <IonContent fullscreen scrollY={false}>
        <MapView
          accessToken={mapboxAccessToken}
          showNavigationControl={false}
          viewStateStorageKey={MAP_VIEW_STATE_STORAGE_KEY}
          onLoad={setMap}
        />
        <MapListModal
          isOpen={isMapListOpen}
          maps={maps}
          isLoading={mapsLoading}
          error={mapsError}
          onRetry={() => {
            void retryMaps();
          }}
          onSelect={(territoryMap) => {
            const bounds = territoryMapBounds(territoryMap);
            if (bounds) {
              map?.fitBounds(bounds, TERRITORY_FIT_BOUNDS_OPTIONS);
            }
            setMapListOpen(false);
          }}
          onDidDismiss={() => {
            setMapListOpen(false);
          }}
        />
      </IonContent>
    </IonPage>
  );
};

export default Map;

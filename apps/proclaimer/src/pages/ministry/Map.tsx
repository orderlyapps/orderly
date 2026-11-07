import { useState } from "react";

import {
  IonBackButton,
  IonButton,
  IonButtons,
  IonContent,
  IonHeader,
  IonIcon,
  IonPage,
  IonToolbar,
} from "@ionic/react";
import { mapOutline } from "ionicons/icons";
import {
  MAP_VIEW_STATE_STORAGE_KEY,
  MapsLayer,
  MapsListModal,
  MapView,
  readMapViewState,
  useSettings,
} from "proclaimer-core";

import { mapboxAccessToken } from "../../config";

const hasSavedView = () =>
  typeof localStorage !== "undefined" &&
  readMapViewState(localStorage, MAP_VIEW_STATE_STORAGE_KEY) !== null;

const Map = () => {
  const [mapsOpen, setMapsOpen] = useState(false);
  const { settings, setSetting } = useSettings();
  const congregationId = settings.congregationId.trim();
  const selectedMap = settings.selectedMaps[congregationId] || null;

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonButtons slot="start">
            <IonBackButton defaultHref="/ministry" />
          </IonButtons>
          <IonButtons slot="end">
            <IonButton onClick={() => setMapsOpen(true)} aria-label="Select map">
              <IonIcon slot="icon-only" icon={mapOutline} />
            </IonButton>
          </IonButtons>
        </IonToolbar>
      </IonHeader>
      <IonContent fullscreen scrollY={false}>
        <MapView
          accessToken={mapboxAccessToken}
          showNavigationControl={false}
          viewStateStorageKey={MAP_VIEW_STATE_STORAGE_KEY}
        >
          <MapsLayer autoFitBounds={!hasSavedView()} selectedMap={selectedMap} />
        </MapView>
        <MapsListModal
          isOpen={mapsOpen}
          onDidDismiss={() => setMapsOpen(false)}
          selectedMap={selectedMap}
          onSelect={(key) => {
            setMapsOpen(false);
            if (!congregationId) {
              return;
            }
            void setSetting("selectedMaps", {
              ...settings.selectedMaps,
              [congregationId]: key,
            }).catch((error: unknown) => {
              console.warn("Failed to persist selected map", error);
            });
          }}
        />
      </IonContent>
    </IonPage>
  );
};

export default Map;

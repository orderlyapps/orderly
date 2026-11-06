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
import { mapOutline } from "ionicons/icons";
import {
  MAP_VIEW_STATE_STORAGE_KEY,
  MapsLayer,
  MapsListModal,
  MapView,
  readMapViewState,
} from "proclaimer-core";

import { mapboxAccessToken } from "../../config";

const hasSavedView = () =>
  typeof localStorage !== "undefined" &&
  readMapViewState(localStorage, MAP_VIEW_STATE_STORAGE_KEY) !== null;

const Map = () => {
  const [mapsOpen, setMapsOpen] = useState(false);
  const [selectedMap, setSelectedMap] = useState<string | null>(null);

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonButtons slot="start">
            <IonBackButton defaultHref="/ministry" />
          </IonButtons>
          <IonTitle>Map</IonTitle>
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
            setSelectedMap(key);
            setMapsOpen(false);
          }}
        />
      </IonContent>
    </IonPage>
  );
};

export default Map;

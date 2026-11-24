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
import { mapOutline, settingsOutline } from "ionicons/icons";
import {
  MAP_VIEW_STATE_STORAGE_KEY,
  MapSettingsModal,
  MapsLayer,
  MapsListModal,
  MapView,
  MasterMapLayer,
  NotAtHomesLayer,
  readMapViewState,
  useMasterMap,
  useSettings,
} from "proclaimer-core";

import { mapboxAccessToken } from "../../config";

const hasSavedView = () =>
  typeof localStorage !== "undefined" &&
  readMapViewState(localStorage, MAP_VIEW_STATE_STORAGE_KEY) !== null;

const Map = () => {
  const [mapsOpen, setMapsOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const { settings, setSetting } = useSettings();
  const congregationId = settings.congregationId.trim();
  const selectedMap = settings.selectedMaps[congregationId] || null;
  const { bounds: masterBounds } = useMasterMap(congregationId);

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
            <IonButton onClick={() => setSettingsOpen(true)} aria-label="Map settings">
              <IonIcon slot="icon-only" icon={settingsOutline} />
            </IonButton>
          </IonButtons>
        </IonToolbar>
      </IonHeader>
      <IonContent fullscreen scrollY={false}>
        <MapView
          accessToken={mapboxAccessToken}
          maxPitch={0}
          showNavigationControl={false}
          viewStateStorageKey={MAP_VIEW_STATE_STORAGE_KEY}
        >
          <MasterMapLayer />
          <MapsLayer
            autoFitBounds={!hasSavedView()}
            fallbackBounds={masterBounds}
            selectedMap={selectedMap}
          />
          <NotAtHomesLayer />
        </MapView>
        <MapSettingsModal isOpen={settingsOpen} onDidDismiss={() => setSettingsOpen(false)} />
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

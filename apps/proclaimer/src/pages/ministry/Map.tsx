import { useEffect, useState } from "react";

import {
  IonBackButton,
  IonButton,
  IonButtons,
  IonContent,
  IonFab,
  IonFabButton,
  IonHeader,
  IonIcon,
  IonPage,
  IonToolbar,
  useIonAlert,
} from "@ionic/react";
import { checkmarkOutline, createOutline, mapOutline, settingsOutline } from "ionicons/icons";
import {
  MAP_VIEW_STATE_STORAGE_KEY,
  MapEditDetailsModal,
  MapEditLayer,
  MapSettingsModal,
  MapsLayer,
  MapsListModal,
  MapView,
  MasterMapLayer,
  NotAtHomesLayer,
  readMapViewState,
  recordRecentMapSelection,
  useMasterMap,
  usePermissions,
  useSettings,
  type MapEditCreateFeatureRequest,
  type MapEditDetailsNewFeature,
} from "proclaimer-core";

import { mapboxAccessToken } from "../../config";

const hasSavedView = () =>
  typeof localStorage !== "undefined" &&
  readMapViewState(localStorage, MAP_VIEW_STATE_STORAGE_KEY) !== null;

const Map = () => {
  const [mapsOpen, setMapsOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const [mapEditDetailsOpen, setMapEditDetailsOpen] = useState(false);
  const [createFeature, setCreateFeature] = useState<MapEditCreateFeatureRequest | null>(null);
  const [selectedMapFitKey, setSelectedMapFitKey] = useState(0);
  const [optimisticSelectedMap, setOptimisticSelectedMap] = useState<{
    congregationId: string;
    key: string;
  } | null>(null);
  const [presentAlert] = useIonAlert();
  const { settings, updateSettings } = useSettings();
  const congregationId = settings.congregationId.trim();
  const persistedSelectedMap = settings.selectedMaps[congregationId] || null;
  const selectedMap =
    optimisticSelectedMap && optimisticSelectedMap.congregationId === congregationId
      ? optimisticSelectedMap.key
      : persistedSelectedMap;
  const { bounds: masterBounds } = useMasterMap(congregationId);
  const permissions = usePermissions(congregationId || undefined);
  const canEditMap =
    permissions.hasServiceOverseer || permissions.isCongregationAdmin || permissions.isSuperAdmin;

  useEffect(() => {
    if (
      optimisticSelectedMap &&
      settings.selectedMaps[optimisticSelectedMap.congregationId] === optimisticSelectedMap.key
    ) {
      setOptimisticSelectedMap(null);
    }
  }, [optimisticSelectedMap, settings.selectedMaps]);

  useEffect(() => {
    if (!editing) {
      setMapEditDetailsOpen(false);
      setCreateFeature(null);
    }
  }, [editing]);

  const toggleEditing = () => {
    if (!editing) {
      setSelectedMapFitKey((current) => current + 1);
    }
    setEditing((current) => !current);
  };

  const showSaveFailed = (message: string) => {
    void presentAlert({ header: "Save Failed", message, buttons: ["OK"] });
  };

  const startFeatureCreation = (feature: MapEditDetailsNewFeature) => {
    setMapEditDetailsOpen(false);
    setSelectedMapFitKey((current) => current + 1);
    setCreateFeature({
      ...feature,
      key: crypto.randomUUID(),
      blockId: crypto.randomUUID(),
    });
  };

  const selectMap = (key: string) => {
    setMapsOpen(false);
    setCreateFeature(null);
    if (!congregationId) {
      return;
    }
    setOptimisticSelectedMap({ congregationId, key });
    setSelectedMapFitKey((current) => current + 1);
    void updateSettings({
      selectedMaps: {
        ...settings.selectedMaps,
        [congregationId]: key,
      },
      recentSelectedMaps: recordRecentMapSelection(
        settings.recentSelectedMaps,
        congregationId,
        key,
        selectedMap,
      ),
    }).catch((error: unknown) => {
      console.warn("Failed to persist selected map", error);
      void presentAlert({
        header: "Selection Save Failed",
        message: "The map is selected for now, but the selection could not be saved.",
        buttons: ["OK"],
      });
    });
  };

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonButtons slot="start">
            <IonBackButton defaultHref="/ministry" />
          </IonButtons>
          <IonButtons slot="end">
            {canEditMap && (
              <IonButton
                onClick={toggleEditing}
                aria-label={editing ? "Finish editing" : "Edit map"}
                color={editing ? "primary" : undefined}
              >
                <IonIcon slot="icon-only" icon={editing ? checkmarkOutline : createOutline} />
              </IonButton>
            )}
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
            selectedMapFitKey={selectedMapFitKey}
          />
          <NotAtHomesLayer />
          {editing ? (
            <MapEditLayer
              key={congregationId}
              congregationId={congregationId}
              selectedMap={selectedMap}
              colorScheme={settings.mapEditColorScheme}
              createFeature={createFeature}
              onCreateFeatureEnd={() => setCreateFeature(null)}
              onError={showSaveFailed}
            />
          ) : null}
        </MapView>
        {editing && !createFeature ? (
          <IonFab slot="fixed" vertical="bottom" horizontal="end" className="map-edit-details-fab">
            <IonFabButton
              onClick={() => setMapEditDetailsOpen(true)}
              aria-label="Edit selected map details"
            >
              <IonIcon icon={createOutline} />
            </IonFabButton>
          </IonFab>
        ) : null}
        <MapSettingsModal
          isOpen={settingsOpen}
          onDidDismiss={() => setSettingsOpen(false)}
          showEditColorScheme={canEditMap}
        />
        <MapsListModal
          isOpen={mapsOpen}
          onDidDismiss={() => setMapsOpen(false)}
          congregationId={congregationId}
          selectedMap={selectedMap}
          recentMapKeys={settings.recentSelectedMaps[congregationId] ?? []}
          recentMapCount={settings.recentMapCount}
          onSelect={selectMap}
        />
        {editing ? (
          <MapEditDetailsModal
            isOpen={mapEditDetailsOpen}
            onDidDismiss={() => setMapEditDetailsOpen(false)}
            congregationId={congregationId}
            selectedMap={selectedMap}
            onAddFeature={startFeatureCreation}
          />
        ) : null}
      </IonContent>
    </IonPage>
  );
};

export default Map;

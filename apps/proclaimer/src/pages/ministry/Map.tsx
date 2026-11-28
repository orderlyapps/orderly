import { useEffect, useState } from "react";

import {
  IonBackButton,
  IonButton,
  IonButtons,
  IonContent,
  IonHeader,
  IonIcon,
  IonPage,
  IonToolbar,
  useIonAlert,
} from "@ionic/react";
import { checkmarkOutline, createOutline, mapOutline, settingsOutline } from "ionicons/icons";
import {
  MAP_VIEW_STATE_STORAGE_KEY,
  MapEditLayer,
  MapEditModal,
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
} from "proclaimer-core";

import { mapboxAccessToken } from "../../config";

const hasSavedView = () =>
  typeof localStorage !== "undefined" &&
  readMapViewState(localStorage, MAP_VIEW_STATE_STORAGE_KEY) !== null;

const Map = () => {
  const [mapsOpen, setMapsOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [editing, setEditing] = useState(false);
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

  const showSaveFailed = (message: string) => {
    void presentAlert({ header: "Save Failed", message, buttons: ["OK"] });
  };

  const selectMap = (key: string) => {
    setMapsOpen(false);
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
                onClick={() => setEditing((current) => !current)}
                aria-label={editing ? "Finish editing" : "Edit map"}
                color={editing ? "primary" : undefined}
              >
                <IonIcon slot="icon-only" icon={editing ? checkmarkOutline : createOutline} />
              </IonButton>
            )}
            <IonButton
              onClick={() => setMapsOpen(true)}
              aria-label={editing ? "Edit maps" : "Select map"}
            >
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
              onError={showSaveFailed}
            />
          ) : null}
        </MapView>
        <MapSettingsModal
          isOpen={settingsOpen}
          onDidDismiss={() => setSettingsOpen(false)}
          showEditColorScheme={canEditMap}
        />
        {editing ? (
          <MapEditModal
            isOpen={mapsOpen}
            onDidDismiss={() => setMapsOpen(false)}
            congregationId={congregationId}
            selectedMap={selectedMap}
            recentMapKeys={settings.recentSelectedMaps[congregationId] ?? []}
            recentMapCount={settings.recentMapCount}
            onSelect={selectMap}
          />
        ) : (
          <MapsListModal
            isOpen={mapsOpen}
            onDidDismiss={() => setMapsOpen(false)}
            congregationId={congregationId}
            selectedMap={selectedMap}
            recentMapKeys={settings.recentSelectedMaps[congregationId] ?? []}
            recentMapCount={settings.recentMapCount}
            onSelect={selectMap}
          />
        )}
      </IonContent>
    </IonPage>
  );
};

export default Map;

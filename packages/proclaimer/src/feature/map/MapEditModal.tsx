import { useMemo, useState } from "react";

import {
  IonButton,
  IonButtons,
  IonContent,
  IonHeader,
  IonIcon,
  IonItem,
  IonItemGroup,
  IonLabel,
  IonList,
  IonListHeader,
  IonModal,
  IonNote,
  IonSearchbar,
  IonSpinner,
  IonTitle,
  IonToolbar,
  useIonAlert,
} from "@ionic/react";
import { chevronBackOutline, createOutline, mapOutline, trashOutline } from "ionicons/icons";

import { useMapPolygons } from "./maps/hooks.ts";
import {
  filterMapRows,
  mapRowKey,
  removeMapBlock,
  renameMapBlock,
  sortMapBlocks,
  type MapBlock,
  type MapRow,
} from "./maps/schema.ts";

export interface MapEditModalProps {
  isOpen: boolean;
  onDidDismiss: () => void;
  congregationId?: string;
}

const blockTypeLabel = (block: MapBlock) => (block.type === "face" ? "Face" : "Block");

export function MapEditModal({ isOpen, onDidDismiss, congregationId }: MapEditModalProps) {
  const { maps, isLoading, error, collection } = useMapPolygons(congregationId);
  const [presentAlert] = useIonAlert();
  const [query, setQuery] = useState("");
  const [selectedKey, setSelectedKey] = useState<string | null>(null);

  const visibleMaps = useMemo(() => filterMapRows(maps, query), [maps, query]);
  const selectedMap = maps.find((map) => mapRowKey(map) === selectedKey) ?? null;
  const blocks = useMemo(
    () => sortMapBlocks(selectedMap?.blocks?.filter((block) => block.type === "block")),
    [selectedMap],
  );
  const faces = useMemo(
    () => sortMapBlocks(selectedMap?.blocks?.filter((block) => block.type === "face")),
    [selectedMap],
  );

  const handleDidDismiss = () => {
    setQuery("");
    setSelectedKey(null);
    onDidDismiss();
  };

  const updateMap = (map: MapRow, mutate: (draft: MapRow) => void, failureMessage: string) => {
    const fail = () => {
      void presentAlert({
        header: "Save Failed",
        message: failureMessage,
        buttons: ["OK"],
      });
    };
    if (!collection || !map.id) {
      fail();
      return;
    }
    try {
      const tx = collection.update(map.id, mutate);
      void tx.isPersisted.promise.catch(fail);
    } catch {
      fail();
    }
  };

  const promptRenameMap = (map: MapRow) => {
    void presentAlert({
      header: "Rename Map",
      inputs: [{ name: "name", type: "text", value: map.name, placeholder: "Map name" }],
      buttons: [
        { text: "Cancel", role: "cancel" },
        {
          text: "Save",
          handler: (data: Record<string, string>) => {
            const name = (data.name ?? "").trim();
            if (!name) {
              return false;
            }
            if (name !== map.name) {
              updateMap(
                map,
                (draft) => {
                  draft.name = name;
                },
                "The map could not be renamed.",
              );
            }
          },
        },
      ],
    });
  };

  const promptRenameBlock = (map: MapRow, block: MapBlock) => {
    const label = blockTypeLabel(block);
    void presentAlert({
      header: `Rename ${label}`,
      inputs: [{ name: "name", type: "text", value: block.name, placeholder: `${label} name` }],
      buttons: [
        { text: "Cancel", role: "cancel" },
        {
          text: "Save",
          handler: (data: Record<string, string>) => {
            const name = (data.name ?? "").trim();
            if (!name) {
              return false;
            }
            if (name !== block.name) {
              updateMap(
                map,
                (draft) => {
                  draft.blocks = renameMapBlock(draft.blocks, block.id, name);
                },
                `The ${label.toLowerCase()} could not be renamed.`,
              );
            }
          },
        },
      ],
    });
  };

  const confirmDeleteBlock = (map: MapRow, block: MapBlock) => {
    const label = blockTypeLabel(block);
    void presentAlert({
      header: `Delete ${label}`,
      message: `Delete ${block.name}? This cannot be undone.`,
      buttons: [
        { text: "Cancel", role: "cancel" },
        {
          text: "Delete",
          role: "destructive",
          handler: () => {
            updateMap(
              map,
              (draft) => {
                draft.blocks = removeMapBlock(draft.blocks, block.id);
              },
              `The ${label.toLowerCase()} could not be deleted.`,
            );
          },
        },
      ],
    });
  };

  const blockGroup = (map: MapRow, title: string, items: MapBlock[]) => (
    <IonItemGroup>
      <IonListHeader>
        <IonLabel>{title}</IonLabel>
      </IonListHeader>
      {items.length === 0 ? (
        <IonItem lines="none">
          <IonNote color="medium">No {title.toLowerCase()}</IonNote>
        </IonItem>
      ) : (
        items.map((block) => (
          <IonItem key={block.id}>
            <IonLabel>{block.name}</IonLabel>
            <IonButton
              slot="end"
              fill="clear"
              aria-label={`Rename ${block.name}`}
              onClick={() => promptRenameBlock(map, block)}
            >
              <IonIcon slot="icon-only" icon={createOutline} />
            </IonButton>
            <IonButton
              slot="end"
              fill="clear"
              aria-label={`Delete ${block.name}`}
              onClick={() => confirmDeleteBlock(map, block)}
            >
              <IonIcon slot="icon-only" icon={trashOutline} color="danger" />
            </IonButton>
          </IonItem>
        ))
      )}
    </IonItemGroup>
  );

  return (
    <IonModal isOpen={isOpen} onDidDismiss={handleDidDismiss}>
      <IonHeader>
        <IonToolbar>
          {selectedMap ? (
            <IonButtons slot="start">
              <IonButton onClick={() => setSelectedKey(null)} aria-label="Back to maps">
                <IonIcon slot="icon-only" icon={chevronBackOutline} />
              </IonButton>
            </IonButtons>
          ) : null}
          <IonTitle>{selectedMap ? selectedMap.name : "Edit Map"}</IonTitle>
          <IonButtons slot="end">
            <IonButton onClick={handleDidDismiss}>Close</IonButton>
          </IonButtons>
        </IonToolbar>
        {selectedMap ? null : (
          <IonToolbar>
            <IonSearchbar
              value={query}
              placeholder="Search maps"
              onIonInput={(event) => {
                setQuery(event.detail.value ?? "");
              }}
            />
          </IonToolbar>
        )}
      </IonHeader>
      <IonContent>
        {selectedMap ? (
          <>
            <IonItemGroup>
              <IonListHeader>
                <IonLabel>Map</IonLabel>
              </IonListHeader>
              <IonItem>
                <IonLabel>
                  <h2>{selectedMap.name}</h2>
                  {selectedMap.details ? <p>{selectedMap.details}</p> : null}
                </IonLabel>
                <IonButton
                  slot="end"
                  fill="clear"
                  aria-label={`Rename ${selectedMap.name}`}
                  onClick={() => promptRenameMap(selectedMap)}
                >
                  <IonIcon slot="icon-only" icon={createOutline} />
                </IonButton>
              </IonItem>
            </IonItemGroup>
            {blockGroup(selectedMap, "Blocks", blocks)}
            {blockGroup(selectedMap, "Faces", faces)}
          </>
        ) : maps.length === 0 && isLoading ? (
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
            {visibleMaps.length === 0 ? (
              <IonItem lines="none">
                <IonNote>No maps found</IonNote>
              </IonItem>
            ) : null}
            {visibleMaps.map((map, index) => {
              const key = mapRowKey(map);
              return (
                <IonItem
                  key={`${key}:${index}`}
                  button
                  detail={false}
                  onClick={() => setSelectedKey(key)}
                >
                  <IonLabel>
                    <h2>{map.name}</h2>
                    {map.details ? <p>{map.details}</p> : null}
                  </IonLabel>
                </IonItem>
              );
            })}
          </IonList>
        )}
      </IonContent>
    </IonModal>
  );
}

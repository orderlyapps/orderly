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
  useIonActionSheet,
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
import { mapTagAssignmentKey } from "./tags/collection.ts";
import { useMapTagAssignments, useMapTags } from "./tags/hooks.ts";
import { findMapTagByName, sortMapTags, type MapTagRow } from "./tags/schema.ts";

export interface MapEditModalProps {
  isOpen: boolean;
  onDidDismiss: () => void;
  congregationId?: string;
}

const blockTypeLabel = (block: MapBlock) => (block.type === "face" ? "Face" : "Block");

export function MapEditModal({ isOpen, onDidDismiss, congregationId }: MapEditModalProps) {
  const { maps, isLoading, error, collection } = useMapPolygons(congregationId);
  const [presentAlert] = useIonAlert();
  const [presentActionSheet] = useIonActionSheet();
  const [query, setQuery] = useState("");
  const [selectedKey, setSelectedKey] = useState<string | null>(null);

  const visibleMaps = useMemo(() => filterMapRows(maps, query), [maps, query]);
  const selectedMap = maps.find((map) => mapRowKey(map) === selectedKey) ?? null;
  const { tags, collection: tagCollection } = useMapTags(congregationId);
  const { assignments, collection: assignmentCollection } = useMapTagAssignments(
    selectedMap?.id ?? null,
  );
  const blocks = useMemo(
    () => sortMapBlocks(selectedMap?.blocks?.filter((block) => block.type === "block")),
    [selectedMap],
  );
  const faces = useMemo(
    () => sortMapBlocks(selectedMap?.blocks?.filter((block) => block.type === "face")),
    [selectedMap],
  );
  const assignedTagIds = useMemo(
    () => new Set(assignments.map((assignment) => assignment.tag_id)),
    [assignments],
  );
  const assignedTags = useMemo(
    () => sortMapTags(tags.filter((tag) => tag.id != null && assignedTagIds.has(tag.id))),
    [tags, assignedTagIds],
  );

  const handleDidDismiss = () => {
    setQuery("");
    setSelectedKey(null);
    onDidDismiss();
  };

  const showSaveFailed = (failureMessage: string) => {
    void presentAlert({
      header: "Save Failed",
      message: failureMessage,
      buttons: ["OK"],
    });
  };

  const updateMap = (map: MapRow, mutate: (draft: MapRow) => void, failureMessage: string) => {
    if (!collection || !map.id) {
      showSaveFailed(failureMessage);
      return;
    }
    try {
      const tx = collection.update(map.id, mutate);
      void tx.isPersisted.promise.catch(() => showSaveFailed(failureMessage));
    } catch {
      showSaveFailed(failureMessage);
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

  const promptEditDetails = (map: MapRow) => {
    void presentAlert({
      header: "Edit Details",
      inputs: [
        {
          name: "details",
          type: "textarea",
          value: map.details ?? "",
          placeholder: "Map details",
        },
      ],
      buttons: [
        { text: "Cancel", role: "cancel" },
        {
          text: "Save",
          handler: (data: Record<string, string>) => {
            const details = (data.details ?? "").trim();
            if (details !== (map.details ?? "").trim()) {
              updateMap(
                map,
                (draft) => {
                  draft.details = details || null;
                },
                "The map details could not be updated.",
              );
            }
          },
        },
      ],
    });
  };

  const assignTag = (
    map: MapRow,
    tag: MapTagRow,
    failureMessage = "The tag could not be added.",
  ) => {
    if (!assignmentCollection || !map.id || !tag.id) {
      showSaveFailed(failureMessage);
      return;
    }
    try {
      const tx = assignmentCollection.insert({ map_id: map.id, tag_id: tag.id });
      void tx.isPersisted.promise.catch(() => showSaveFailed(failureMessage));
    } catch {
      showSaveFailed(failureMessage);
    }
  };

  const createAndAssignTag = async (map: MapRow, name: string) => {
    if (!tagCollection || !map.id) {
      showSaveFailed("The tag could not be created.");
      return;
    }
    // Client-generated id so the assignment can be inserted without waiting
    // for a refetch of the tag row.
    const tag: MapTagRow = {
      id: crypto.randomUUID(),
      congregation_id: map.congregation_id,
      name,
    };
    try {
      const tx = tagCollection.insert(tag);
      await tx.isPersisted.promise;
    } catch {
      showSaveFailed("The tag could not be created.");
      return;
    }
    assignTag(
      map,
      tag,
      `${name} was created but could not be added. It can be added from Add Tag.`,
    );
  };

  const confirmRemoveTag = (map: MapRow, tag: MapTagRow) => {
    void presentAlert({
      header: "Remove Tag",
      message: `Remove ${tag.name} from ${map.name}?`,
      buttons: [
        { text: "Cancel", role: "cancel" },
        {
          text: "Remove",
          role: "destructive",
          handler: () => {
            if (!assignmentCollection || !map.id || !tag.id) {
              showSaveFailed("The tag could not be removed.");
              return;
            }
            try {
              const tx = assignmentCollection.delete(mapTagAssignmentKey(map.id, tag.id));
              void tx.isPersisted.promise.catch(() =>
                showSaveFailed("The tag could not be removed."),
              );
            } catch {
              showSaveFailed("The tag could not be removed.");
            }
          },
        },
      ],
    });
  };

  const promptNewTag = (map: MapRow) => {
    void presentAlert({
      header: "New Tag",
      inputs: [{ name: "name", type: "text", placeholder: "Tag name" }],
      buttons: [
        { text: "Cancel", role: "cancel" },
        {
          text: "Save",
          handler: (data: Record<string, string>) => {
            const name = (data.name ?? "").trim();
            if (!name) {
              return false;
            }
            const existing = findMapTagByName(tags, name);
            if (existing) {
              if (existing.id && assignedTagIds.has(existing.id)) {
                void presentAlert({
                  header: "Tag Already Added",
                  message: `${existing.name} is already on ${map.name}.`,
                  buttons: ["OK"],
                });
              } else {
                assignTag(map, existing);
              }
              return;
            }
            void createAndAssignTag(map, name);
          },
        },
      ],
    });
  };

  const promptAddTag = (map: MapRow) => {
    const available = sortMapTags(tags.filter((tag) => tag.id && !assignedTagIds.has(tag.id)));
    void presentActionSheet({
      header: "Add Tag",
      buttons: [
        ...available.map((tag) => ({
          text: tag.name,
          handler: () => {
            assignTag(map, tag);
          },
        })),
        {
          text: "New Tag",
          handler: () => {
            promptNewTag(map);
          },
        },
        { text: "Cancel", role: "cancel" },
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
                  <h2>Name</h2>
                  <p>{selectedMap.name}</p>
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
              <IonItem>
                <IonLabel>
                  <h2>Details</h2>
                  <p>{selectedMap.details?.trim() ? selectedMap.details : "None"}</p>
                </IonLabel>
                <IonButton
                  slot="end"
                  fill="clear"
                  aria-label={`Edit ${selectedMap.name} details`}
                  onClick={() => promptEditDetails(selectedMap)}
                >
                  <IonIcon slot="icon-only" icon={createOutline} />
                </IonButton>
              </IonItem>
            </IonItemGroup>
            <IonItemGroup>
              <IonListHeader>
                <IonLabel>Tags</IonLabel>
              </IonListHeader>
              {assignedTags.map((tag) => (
                <IonItem key={tag.id}>
                  <IonLabel>{tag.name}</IonLabel>
                  <IonButton
                    slot="end"
                    fill="clear"
                    aria-label={`Remove ${tag.name}`}
                    onClick={() => confirmRemoveTag(selectedMap, tag)}
                  >
                    <IonIcon slot="icon-only" icon={trashOutline} color="danger" />
                  </IonButton>
                </IonItem>
              ))}
              <IonItem button detail={false} onClick={() => promptAddTag(selectedMap)}>
                <IonLabel color="primary">Add Tag</IonLabel>
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

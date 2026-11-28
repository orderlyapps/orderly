import { useMemo } from "react";

import {
  IonButton,
  IonButtons,
  IonContent,
  IonHeader,
  IonIcon,
  IonItem,
  IonItemGroup,
  IonLabel,
  IonListHeader,
  IonModal,
  IonNote,
  IonSpinner,
  IonTitle,
  IonToolbar,
  useIonActionSheet,
  useIonAlert,
} from "@ionic/react";
import { addOutline, createOutline, trashOutline } from "ionicons/icons";

import { useMapPolygons } from "./maps/hooks.ts";
import {
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

export interface MapEditDetailsNewFeature {
  mapId: string;
  type: MapBlock["type"];
  name: string;
}

export interface MapEditDetailsModalProps {
  isOpen: boolean;
  onDidDismiss: () => void;
  congregationId?: string;
  selectedMap?: string | null;
  onAddFeature?: (feature: MapEditDetailsNewFeature) => void;
}

const blockTypeLabel = (block: MapBlock) => (block.type === "face" ? "Face" : "Block");

export function MapEditDetailsModal({
  isOpen,
  onDidDismiss,
  congregationId,
  selectedMap: selectedMapKey = null,
  onAddFeature,
}: MapEditDetailsModalProps) {
  const { maps, isLoading, error, collection } = useMapPolygons(congregationId);
  const [presentAlert] = useIonAlert();
  const [presentActionSheet] = useIonActionSheet();

  const map = maps.find((row) => mapRowKey(row) === selectedMapKey) ?? null;
  const { tags, collection: tagCollection } = useMapTags(congregationId);
  const { assignments, collection: assignmentCollection } = useMapTagAssignments(map?.id ?? null);
  const blocks = useMemo(
    () => sortMapBlocks(map?.blocks?.filter((block) => block.type === "block")),
    [map],
  );
  const faces = useMemo(
    () => sortMapBlocks(map?.blocks?.filter((block) => block.type === "face")),
    [map],
  );
  const assignedTagIds = useMemo(
    () => new Set(assignments.map((assignment) => assignment.tag_id)),
    [assignments],
  );
  const assignedTags = useMemo(
    () => sortMapTags(tags.filter((tag) => tag.id != null && assignedTagIds.has(tag.id))),
    [tags, assignedTagIds],
  );

  const showSaveFailed = (failureMessage: string) => {
    void presentAlert({
      header: "Save Failed",
      message: failureMessage,
      buttons: ["OK"],
    });
  };

  const updateMap = (row: MapRow, mutate: (draft: MapRow) => void, failureMessage: string) => {
    if (!collection || !row.id) {
      showSaveFailed(failureMessage);
      return;
    }
    try {
      const tx = collection.update(row.id, mutate);
      void tx.isPersisted.promise.catch(() => showSaveFailed(failureMessage));
    } catch {
      showSaveFailed(failureMessage);
    }
  };

  const promptRenameMap = (row: MapRow) => {
    void presentAlert({
      header: "Rename Map",
      inputs: [{ name: "name", type: "text", value: row.name, placeholder: "Map name" }],
      buttons: [
        { text: "Cancel", role: "cancel" },
        {
          text: "Save",
          handler: (data: Record<string, string>) => {
            const name = (data.name ?? "").trim();
            if (!name) {
              return false;
            }
            if (name !== row.name) {
              updateMap(
                row,
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

  const promptEditDetails = (row: MapRow) => {
    void presentAlert({
      header: "Edit Details",
      inputs: [
        {
          name: "details",
          type: "textarea",
          value: row.details ?? "",
          placeholder: "Map details",
        },
      ],
      buttons: [
        { text: "Cancel", role: "cancel" },
        {
          text: "Save",
          handler: (data: Record<string, string>) => {
            const details = (data.details ?? "").trim();
            if (details !== (row.details ?? "").trim()) {
              updateMap(
                row,
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
    row: MapRow,
    tag: MapTagRow,
    failureMessage = "The tag could not be added.",
  ) => {
    if (!assignmentCollection || !row.id || !tag.id) {
      showSaveFailed(failureMessage);
      return;
    }
    try {
      const tx = assignmentCollection.insert({ map_id: row.id, tag_id: tag.id });
      void tx.isPersisted.promise.catch(() => showSaveFailed(failureMessage));
    } catch {
      showSaveFailed(failureMessage);
    }
  };

  const createAndAssignTag = async (row: MapRow, name: string) => {
    if (!tagCollection || !row.id) {
      showSaveFailed("The tag could not be created.");
      return;
    }
    // Client-generated id so the assignment can be inserted without waiting
    // for a refetch of the tag row.
    const tag: MapTagRow = {
      id: crypto.randomUUID(),
      congregation_id: row.congregation_id,
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
      row,
      tag,
      `${name} was created but could not be added. It can be added from Add Tag.`,
    );
  };

  const confirmRemoveTag = (row: MapRow, tag: MapTagRow) => {
    void presentAlert({
      header: "Remove Tag",
      message: `Remove ${tag.name} from ${row.name}?`,
      buttons: [
        { text: "Cancel", role: "cancel" },
        {
          text: "Remove",
          role: "destructive",
          handler: () => {
            if (!assignmentCollection || !row.id || !tag.id) {
              showSaveFailed("The tag could not be removed.");
              return;
            }
            try {
              const tx = assignmentCollection.delete(mapTagAssignmentKey(row.id, tag.id));
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

  const promptNewTag = (row: MapRow) => {
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
                  message: `${existing.name} is already on ${row.name}.`,
                  buttons: ["OK"],
                });
              } else {
                assignTag(row, existing);
              }
              return;
            }
            void createAndAssignTag(row, name);
          },
        },
      ],
    });
  };

  const promptAddTag = (row: MapRow) => {
    const available = sortMapTags(tags.filter((tag) => tag.id && !assignedTagIds.has(tag.id)));
    void presentActionSheet({
      header: "Add Tag",
      buttons: [
        ...available.map((tag) => ({
          text: tag.name,
          handler: () => {
            assignTag(row, tag);
          },
        })),
        {
          text: "New Tag",
          handler: () => {
            promptNewTag(row);
          },
        },
        { text: "Cancel", role: "cancel" },
      ],
    });
  };

  const promptRenameBlock = (row: MapRow, block: MapBlock) => {
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
                row,
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

  const confirmDeleteBlock = (row: MapRow, block: MapBlock) => {
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
              row,
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

  const promptNewFeature = (row: MapRow, type: MapBlock["type"]) => {
    const label = type === "face" ? "Face" : "Block";
    const mapId = row.id;
    if (!mapId || !onAddFeature) {
      showSaveFailed(`The ${label.toLowerCase()} could not be created.`);
      return;
    }
    void presentAlert({
      header: `New ${label}`,
      inputs: [{ name: "name", type: "text", placeholder: `${label} name` }],
      buttons: [
        { text: "Cancel", role: "cancel" },
        {
          text: "Draw",
          handler: (data: Record<string, string>) => {
            const name = (data.name ?? "").trim();
            if (!name) {
              return false;
            }
            onDidDismiss();
            onAddFeature({ mapId, type, name });
          },
        },
      ],
    });
  };

  const blockGroup = (row: MapRow, title: string, items: MapBlock[], type: MapBlock["type"]) => (
    <IonItemGroup>
      <IonListHeader>
        <IonLabel>{title}</IonLabel>
        {onAddFeature ? (
          <IonButton
            fill="clear"
            aria-label={`Add ${type}`}
            onClick={() => promptNewFeature(row, type)}
          >
            <IonIcon slot="icon-only" icon={addOutline} />
          </IonButton>
        ) : null}
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
              onClick={() => promptRenameBlock(row, block)}
            >
              <IonIcon slot="icon-only" icon={createOutline} />
            </IonButton>
            <IonButton
              slot="end"
              fill="clear"
              aria-label={`Delete ${block.name}`}
              onClick={() => confirmDeleteBlock(row, block)}
            >
              <IonIcon slot="icon-only" icon={trashOutline} color="danger" />
            </IonButton>
          </IonItem>
        ))
      )}
    </IonItemGroup>
  );

  const mapInputs = map ? (
    <>
      <IonItemGroup>
        <IonListHeader>
          <IonLabel>Map</IonLabel>
        </IonListHeader>
        <IonItem>
          <IonLabel>
            <h2>Name</h2>
            <p>{map.name}</p>
          </IonLabel>
          <IonButton
            slot="end"
            fill="clear"
            aria-label={`Rename ${map.name}`}
            onClick={() => promptRenameMap(map)}
          >
            <IonIcon slot="icon-only" icon={createOutline} />
          </IonButton>
        </IonItem>
        <IonItem>
          <IonLabel>
            <h2>Details</h2>
            <p>{map.details?.trim() ? map.details : "None"}</p>
          </IonLabel>
          <IonButton
            slot="end"
            fill="clear"
            aria-label={`Edit ${map.name} details`}
            onClick={() => promptEditDetails(map)}
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
              onClick={() => confirmRemoveTag(map, tag)}
            >
              <IonIcon slot="icon-only" icon={trashOutline} color="danger" />
            </IonButton>
          </IonItem>
        ))}
        <IonItem button detail={false} onClick={() => promptAddTag(map)}>
          <IonLabel color="primary">Add Tag</IonLabel>
        </IonItem>
      </IonItemGroup>
      {blockGroup(map, "Blocks", blocks, "block")}
      {blockGroup(map, "Faces", faces, "face")}
    </>
  ) : null;

  return (
    <IonModal isOpen={isOpen} onDidDismiss={onDidDismiss}>
      <IonHeader>
        <IonToolbar>
          <IonTitle>{map ? `Edit ${map.name}` : "Edit Map"}</IonTitle>
          <IonButtons slot="end">
            <IonButton onClick={onDidDismiss}>Close</IonButton>
          </IonButtons>
        </IonToolbar>
      </IonHeader>
      <IonContent>
        {!selectedMapKey ? (
          <IonItem lines="none">
            <IonNote color="medium">No map selected</IonNote>
          </IonItem>
        ) : isLoading && !map ? (
          <div style={{ display: "flex", justifyContent: "center", padding: "48px 16px" }}>
            <IonSpinner />
          </div>
        ) : error && !map ? (
          <IonItem lines="none">
            <IonNote color="danger">{error.message}</IonNote>
          </IonItem>
        ) : !map ? (
          <IonItem lines="none">
            <IonNote color="medium">The selected map is unavailable</IonNote>
          </IonItem>
        ) : (
          mapInputs
        )}
      </IonContent>
    </IonModal>
  );
}

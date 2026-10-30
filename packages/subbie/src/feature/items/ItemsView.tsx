import { useState } from "react";

import {
  IonFab,
  IonFabButton,
  IonIcon,
  IonItem,
  IonNote,
  IonSpinner,
  IonToast,
  useIonAlert,
} from "@ionic/react";
import { add } from "ionicons/icons";

import { escapeHtml, useStatusToast } from "../../shared/index.ts";
import { ItemFormModal, type ItemFormValues } from "./components/ItemFormModal.tsx";
import { ItemList } from "./components/ItemList.tsx";
import type { ItemsStore } from "./db.ts";
import { useItems } from "./hooks.ts";
import type { ItemDocument } from "./schema.ts";

export interface ItemsViewProps {
  store?: ItemsStore;
}

export const ItemsView = ({ store: customStore }: ItemsViewProps) => {
  const { items, isLoading, error, createItem, updateItem, deleteItem } = useItems(customStore);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<ItemDocument | null>(null);
  const { toast, showSuccess, showError, dismissToast } = useStatusToast();
  const [presentAlert] = useIonAlert();

  const openCreate = () => {
    setEditing(null);
    setFormOpen(true);
  };

  const handleSubmit = async (values: ItemFormValues) => {
    try {
      if (editing) {
        await updateItem(editing.id, values);
        showSuccess(`Updated ${values.name}`);
      } else {
        await createItem(values);
        showSuccess(`Added ${values.name}`);
      }
    } catch (err) {
      showError(err instanceof Error ? err.message : "Failed to save item");
      throw err;
    }
  };

  const confirmDelete = (item: ItemDocument) => {
    void presentAlert({
      header: "Delete Item",
      message: `Delete ${escapeHtml(item.name)}? This cannot be undone.`,
      buttons: [
        { text: "Cancel", role: "cancel" },
        {
          text: "Delete",
          role: "destructive",
          handler: () => {
            void deleteItem(item.id)
              .then(() => showSuccess(`Deleted ${item.name}`))
              .catch(() => showError("Failed to delete item"));
          },
        },
      ],
    });
  };

  return (
    <>
      {isLoading ? (
        <IonItem lines="none">
          <IonSpinner slot="start" />
          <IonNote>Loading…</IonNote>
        </IonItem>
      ) : error ? (
        <IonItem lines="none">
          <IonNote color="danger">{error.message}</IonNote>
        </IonItem>
      ) : (
        <ItemList
          items={items}
          onSelect={(item) => {
            setEditing(item);
            setFormOpen(true);
          }}
          onDelete={confirmDelete}
          emptyMessage="No items yet — tap + to add one"
        />
      )}

      <IonFab slot="fixed" vertical="bottom" horizontal="end">
        <IonFabButton onClick={openCreate} aria-label="Add item">
          <IonIcon icon={add} />
        </IonFabButton>
      </IonFab>

      <ItemFormModal
        isOpen={formOpen}
        initial={editing}
        onDismiss={() => setFormOpen(false)}
        onSubmit={handleSubmit}
      />

      <IonToast
        isOpen={toast !== null}
        message={toast?.message}
        color={toast?.color}
        position="top"
        duration={2500}
        onDidDismiss={dismissToast}
      />
    </>
  );
};

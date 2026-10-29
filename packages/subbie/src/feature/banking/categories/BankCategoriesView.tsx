import { useState } from "react";

import {
  IonFab,
  IonFabButton,
  IonIcon,
  IonItem,
  IonLabel,
  IonNote,
  IonSegment,
  IonSegmentButton,
  IonSpinner,
  IonToast,
  useIonAlert,
} from "@ionic/react";
import { add } from "ionicons/icons";

import { useStatusToast } from "../../../shared/index.ts";
import type { BankingStore } from "../db.ts";
import { useBanking } from "../hooks.ts";
import {
  BANK_TRANSACTION_TYPES,
  bankTransactionTypeLabel,
  isBankTransactionType,
  type BankTransactionType,
} from "../types.ts";
import {
  BankCategoryFormModal,
  type BankCategoryFormValues,
} from "./components/BankCategoryFormModal.tsx";
import { BankCategoryList } from "./components/BankCategoryList.tsx";
import type { BankCategoryDocument } from "./schema.ts";

export interface BankCategoriesViewProps {
  store?: BankingStore;
}

export const BankCategoriesView = ({ store: customStore }: BankCategoriesViewProps) => {
  const { categories, isLoading, error, createCategory, updateCategory, deleteCategory } =
    useBanking(customStore);
  const [categoryFormOpen, setCategoryFormOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<BankCategoryDocument | null>(null);
  const { toast, showSuccess, showError, dismissToast } = useStatusToast();
  const [categoryType, setCategoryType] = useState<BankTransactionType>("payment");
  const [presentAlert] = useIonAlert();

  const visibleCategories = categories.filter((category) => category.type === categoryType);

  const handleCategorySubmit = async (values: BankCategoryFormValues) => {
    try {
      if (editingCategory) {
        await updateCategory(editingCategory.id, values);
        showSuccess(`Updated ${values.name}`);
      } else {
        await createCategory(values);
        showSuccess(`Added ${values.name}`);
      }
    } catch (err) {
      showError(err instanceof Error ? err.message : "Failed to save category");
      throw err;
    }
  };

  const confirmDeleteCategory = (category: BankCategoryDocument) => {
    void presentAlert({
      header: "Delete Category",
      message: `Delete ${category.name}? This cannot be undone.`,
      buttons: [
        { text: "Cancel", role: "cancel" },
        {
          text: "Delete",
          role: "destructive",
          handler: () => {
            void deleteCategory(category.id)
              .then(() => showSuccess(`Deleted ${category.name}`))
              .catch(() => showError("Failed to delete category"));
          },
        },
      ],
    });
  };

  return (
    <>
      <IonItem lines="none">
        <IonSegment
          value={categoryType}
          onIonChange={(event) => {
            const value = event.detail.value;
            if (isBankTransactionType(value)) {
              setCategoryType(value);
            }
          }}
        >
          {BANK_TRANSACTION_TYPES.map((typeOption) => (
            <IonSegmentButton key={typeOption} value={typeOption}>
              <IonLabel>{bankTransactionTypeLabel(typeOption)}s</IonLabel>
            </IonSegmentButton>
          ))}
        </IonSegment>
      </IonItem>

      {isLoading ? (
        <IonItem lines="none">
          <IonSpinner slot="start" />
          <IonNote>Loading banking…</IonNote>
        </IonItem>
      ) : error ? (
        <IonItem lines="none">
          <IonNote color="danger">{error.message}</IonNote>
        </IonItem>
      ) : (
        <BankCategoryList
          categories={visibleCategories}
          onSelect={(category) => {
            setEditingCategory(category);
            setCategoryFormOpen(true);
          }}
          onDelete={confirmDeleteCategory}
          emptyMessage={`No ${categoryType} categories yet — tap + to add one`}
        />
      )}

      <IonFab slot="fixed" vertical="bottom" horizontal="end">
        <IonFabButton
          onClick={() => {
            setEditingCategory(null);
            setCategoryFormOpen(true);
          }}
          aria-label="Add category"
        >
          <IonIcon icon={add} />
        </IonFabButton>
      </IonFab>

      <BankCategoryFormModal
        isOpen={categoryFormOpen}
        initial={editingCategory}
        defaultType={categoryType}
        onDismiss={() => setCategoryFormOpen(false)}
        onSubmit={handleCategorySubmit}
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

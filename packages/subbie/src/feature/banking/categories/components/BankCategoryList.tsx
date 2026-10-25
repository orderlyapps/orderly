import {
  IonBadge,
  IonItem,
  IonItemOption,
  IonItemOptions,
  IonItemSliding,
  IonLabel,
  IonList,
  IonNote,
} from "@ionic/react";

import { bankTransactionTypeColor, bankTransactionTypeLabel } from "../../types.ts";
import type { BankCategoryDocument } from "../schema.ts";

export interface BankCategoryListProps {
  categories: BankCategoryDocument[];
  onSelect?: (category: BankCategoryDocument) => void;
  onDelete?: (category: BankCategoryDocument) => void;
  emptyMessage?: string;
}

export const BankCategoryList = ({
  categories,
  onSelect,
  onDelete,
  emptyMessage = "No categories yet",
}: BankCategoryListProps) => (
  <IonList inset>
    {categories.length === 0 ? (
      <IonItem lines="none">
        <IonLabel>
          <IonNote>{emptyMessage}</IonNote>
        </IonLabel>
      </IonItem>
    ) : (
      categories.map((category) => (
        <IonItemSliding key={category.id}>
          <IonItem button detail onClick={() => onSelect?.(category)}>
            <IonLabel>
              <h2>{category.name}</h2>
              {category.description ? <IonNote>{category.description}</IonNote> : null}
            </IonLabel>
            <IonBadge slot="end" color={bankTransactionTypeColor(category.type)}>
              {bankTransactionTypeLabel(category.type)}
            </IonBadge>
          </IonItem>
          {onDelete ? (
            <IonItemOptions side="end">
              <IonItemOption color="danger" onClick={() => onDelete(category)}>
                Delete
              </IonItemOption>
            </IonItemOptions>
          ) : null}
        </IonItemSliding>
      ))
    )}
  </IonList>
);

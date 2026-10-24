import {
  IonItem,
  IonItemOption,
  IonItemOptions,
  IonItemSliding,
  IonLabel,
  IonList,
  IonNote,
} from "@ionic/react";

import { formatCurrency } from "../../invoices/schema.ts";
import type { ItemDocument } from "../schema.ts";

export interface ItemListProps {
  items: ItemDocument[];
  onSelect?: (item: ItemDocument) => void;
  onDelete?: (item: ItemDocument) => void;
  emptyMessage?: string;
}

export const ItemList = ({
  items,
  onSelect,
  onDelete,
  emptyMessage = "No items yet",
}: ItemListProps) => (
  <IonList inset>
    {items.length === 0 ? (
      <IonItem lines="none">
        <IonLabel>
          <IonNote>{emptyMessage}</IonNote>
        </IonLabel>
      </IonItem>
    ) : (
      items.map((item) => (
        <IonItemSliding key={item.id}>
          <IonItem button detail onClick={() => onSelect?.(item)}>
            <IonLabel>
              <h2>{item.name}</h2>
              <IonNote>
                {[item.description, item.unit ? `per ${item.unit}` : ""]
                  .filter(Boolean)
                  .join(" · ")}
              </IonNote>
            </IonLabel>
            <IonNote slot="end">{formatCurrency(item.unitPriceCents)}</IonNote>
          </IonItem>
          {onDelete ? (
            <IonItemOptions side="end">
              <IonItemOption color="danger" onClick={() => onDelete(item)}>
                Delete
              </IonItemOption>
            </IonItemOptions>
          ) : null}
        </IonItemSliding>
      ))
    )}
  </IonList>
);

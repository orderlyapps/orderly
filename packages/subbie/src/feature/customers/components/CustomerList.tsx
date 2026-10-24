import {
  IonItem,
  IonItemOption,
  IonItemOptions,
  IonItemSliding,
  IonLabel,
  IonList,
  IonNote,
} from "@ionic/react";

import type { CustomerDocument } from "../schema.ts";

export interface CustomerListProps {
  customers: CustomerDocument[];
  onSelect?: (customer: CustomerDocument) => void;
  onDelete?: (customer: CustomerDocument) => void;
  emptyMessage?: string;
}

export const CustomerList = ({
  customers,
  onSelect,
  onDelete,
  emptyMessage = "No customers yet",
}: CustomerListProps) => (
  <IonList inset>
    {customers.length === 0 ? (
      <IonItem lines="none">
        <IonLabel>
          <IonNote>{emptyMessage}</IonNote>
        </IonLabel>
      </IonItem>
    ) : (
      customers.map((customer) => (
        <IonItemSliding key={customer.id}>
          <IonItem button detail onClick={() => onSelect?.(customer)}>
            <IonLabel>
              <h2>{customer.name}</h2>
              <IonNote>{customer.email || customer.phone || "No contact info"}</IonNote>
            </IonLabel>
          </IonItem>
          {onDelete ? (
            <IonItemOptions side="end">
              <IonItemOption color="danger" onClick={() => onDelete(customer)}>
                Delete
              </IonItemOption>
            </IonItemOptions>
          ) : null}
        </IonItemSliding>
      ))
    )}
  </IonList>
);

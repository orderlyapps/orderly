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

import { CustomerFormModal, type CustomerFormValues } from "./components/CustomerFormModal.tsx";
import { CustomerList } from "./components/CustomerList.tsx";
import type { CustomersStore } from "./db.ts";
import { useCustomers } from "./hooks.ts";
import type { CustomerDocument } from "./schema.ts";

export interface CustomersViewProps {
  store?: CustomersStore;
}

export const CustomersView = ({ store: customStore }: CustomersViewProps) => {
  const { customers, isLoading, error, createCustomer, updateCustomer, deleteCustomer } =
    useCustomers(customStore);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<CustomerDocument | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [presentAlert] = useIonAlert();

  const openCreate = () => {
    setEditing(null);
    setFormOpen(true);
  };

  const handleSubmit = async (values: CustomerFormValues) => {
    try {
      if (editing) {
        await updateCustomer(editing.id, values);
        setStatusMessage(`Updated ${values.name}`);
      } else {
        await createCustomer(values);
        setStatusMessage(`Added ${values.name}`);
      }
    } catch (err) {
      setStatusMessage(err instanceof Error ? err.message : "Failed to save customer");
      throw err;
    }
  };

  const confirmDelete = (customer: CustomerDocument) => {
    void presentAlert({
      header: "Delete Customer",
      message: `Delete ${customer.name}? This cannot be undone.`,
      buttons: [
        { text: "Cancel", role: "cancel" },
        {
          text: "Delete",
          role: "destructive",
          handler: () => {
            void deleteCustomer(customer.id)
              .then(() => setStatusMessage(`Deleted ${customer.name}`))
              .catch(() => setStatusMessage("Failed to delete customer"));
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
        <CustomerList
          customers={customers}
          onSelect={(customer) => {
            setEditing(customer);
            setFormOpen(true);
          }}
          onDelete={confirmDelete}
          emptyMessage="No customers yet — tap + to add one"
        />
      )}

      <IonFab slot="fixed" vertical="bottom" horizontal="end">
        <IonFabButton onClick={openCreate} aria-label="Add customer">
          <IonIcon icon={add} />
        </IonFabButton>
      </IonFab>

      <CustomerFormModal
        isOpen={formOpen}
        initial={editing}
        onDismiss={() => setFormOpen(false)}
        onSubmit={handleSubmit}
      />

      <IonToast
        isOpen={statusMessage !== null}
        message={statusMessage ?? undefined}
        duration={2500}
        onDidDismiss={() => setStatusMessage(null)}
      />
    </>
  );
};

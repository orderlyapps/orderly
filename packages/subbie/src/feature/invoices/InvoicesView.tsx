import { useState } from "react";

import {
  IonFab,
  IonFabButton,
  IonIcon,
  IonItem,
  IonNote,
  IonSpinner,
  IonToast,
} from "@ionic/react";
import { add } from "ionicons/icons";

import { useCustomers, type CustomersStore } from "../customers/index.ts";
import { useItems, type ItemsStore } from "../items/index.ts";
import { InvoiceDetailModal } from "./components/InvoiceDetailModal.tsx";
import { InvoiceFormModal, type InvoiceFormValues } from "./components/InvoiceFormModal.tsx";
import { InvoiceList } from "./components/InvoiceList.tsx";
import type { InvoicesStore } from "./db.ts";
import { useInvoices } from "./hooks.ts";
import { sendInvoicePdf } from "./pdf.ts";
import type { InvoiceDocument, InvoiceStatus } from "./schema.ts";

export interface InvoicesViewProps {
  store?: InvoicesStore;
  customersStore?: CustomersStore;
  itemsStore?: ItemsStore;
}

export const InvoicesView = ({
  store: customStore,
  customersStore,
  itemsStore,
}: InvoicesViewProps) => {
  const {
    invoices,
    isLoading,
    error,
    createInvoice,
    updateInvoice,
    setInvoiceStatus,
    deleteInvoice,
  } = useInvoices(customStore);
  const { customers } = useCustomers(customersStore);
  const { items } = useItems(itemsStore);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<InvoiceDocument | null>(null);
  const [selected, setSelected] = useState<InvoiceDocument | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const openCreate = () => {
    setEditing(null);
    setFormOpen(true);
  };

  const openDetail = (invoice: InvoiceDocument) => {
    setSelected(invoice);
    setDetailOpen(true);
  };

  const handleSubmit = async (values: InvoiceFormValues) => {
    try {
      if (editing) {
        await updateInvoice(editing.id, values);
        setStatusMessage(`Updated ${editing.number}`);
      } else {
        const created = await createInvoice(values);
        setStatusMessage(`Created ${created.number}`);
      }
    } catch (err) {
      setStatusMessage(err instanceof Error ? err.message : "Failed to save invoice");
      throw err;
    }
  };

  const handleSendPdf = async (invoice: InvoiceDocument) => {
    try {
      const result = await sendInvoicePdf(invoice);
      if (invoice.status === "draft") {
        await setInvoiceStatus(invoice.id, "sent");
      }
      setStatusMessage(
        result.method === "shared" ? `Shared ${result.filename}` : `Saved ${result.filename}`,
      );
    } catch (err) {
      if (err instanceof Error && err.name === "AbortError") {
        return;
      }
      setStatusMessage(err instanceof Error ? err.message : "Failed to send invoice");
    }
  };

  const handleSetStatus = async (invoice: InvoiceDocument, status: InvoiceStatus) => {
    try {
      const updated = await setInvoiceStatus(invoice.id, status);
      setSelected(updated);
      setStatusMessage(`${updated.number} marked as ${status}`);
    } catch (err) {
      setStatusMessage(err instanceof Error ? err.message : "Failed to update status");
    }
  };

  const handleDelete = async (invoice: InvoiceDocument) => {
    try {
      await deleteInvoice(invoice.id);
      setStatusMessage(`Deleted ${invoice.number}`);
    } catch (err) {
      setStatusMessage(err instanceof Error ? err.message : "Failed to delete invoice");
      throw err;
    }
  };

  const selectedInvoice = selected
    ? (invoices.find((invoice) => invoice.id === selected.id) ?? selected)
    : null;

  return (
    <>
      {isLoading ? (
        <IonItem lines="none">
          <IonSpinner slot="start" />
          <IonNote>Loading invoices…</IonNote>
        </IonItem>
      ) : error ? (
        <IonItem lines="none">
          <IonNote color="danger">{error.message}</IonNote>
        </IonItem>
      ) : (
        <InvoiceList
          invoices={invoices}
          onSelect={openDetail}
          emptyMessage="No invoices yet — tap + to create one"
        />
      )}

      <IonFab slot="fixed" vertical="bottom" horizontal="end">
        <IonFabButton onClick={openCreate} aria-label="Create invoice">
          <IonIcon icon={add} />
        </IonFabButton>
      </IonFab>

      <InvoiceFormModal
        isOpen={formOpen}
        initial={editing}
        customers={customers}
        items={items}
        onDismiss={() => setFormOpen(false)}
        onSubmit={handleSubmit}
      />

      <InvoiceDetailModal
        invoice={selectedInvoice}
        isOpen={detailOpen}
        onDismiss={() => setDetailOpen(false)}
        onSendPdf={handleSendPdf}
        onSetStatus={handleSetStatus}
        onEdit={(invoice) => {
          setEditing(invoice);
          setFormOpen(true);
        }}
        onDelete={handleDelete}
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

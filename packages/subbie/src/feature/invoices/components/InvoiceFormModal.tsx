import { useEffect, useRef, useState } from "react";

import {
  IonButton,
  IonButtons,
  IonCol,
  IonContent,
  IonGrid,
  IonHeader,
  IonIcon,
  IonInput,
  IonItem,
  IonList,
  IonListHeader,
  IonModal,
  IonNote,
  IonRow,
  IonSelect,
  IonSelectOption,
  IonTextarea,
  IonTitle,
  IonToolbar,
} from "@ionic/react";
import { trashOutline } from "ionicons/icons";

import type { CustomerDocument } from "../../customers/schema.ts";
import type { ItemDocument } from "../../items/schema.ts";
import {
  DEFAULT_INVOICE_CURRENCY,
  formatCurrency,
  generateDocumentId,
  isInvoiceDateString,
  normalizeInvoiceLineItem,
  toDateString,
  addDaysToDateString,
  type InvoiceDocument,
  type InvoiceLineItem,
} from "../schema.ts";

export interface InvoiceFormValues {
  clientName: string;
  clientEmail: string;
  currency: string;
  issueDate: string;
  dueDate: string;
  notes: string;
  items: InvoiceLineItem[];
}

export interface InvoiceFormModalProps {
  isOpen: boolean;
  initial?: InvoiceDocument | null;
  customers?: CustomerDocument[];
  items?: ItemDocument[];
  onDismiss: () => void;
  onSubmit: (values: InvoiceFormValues) => Promise<void> | void;
}

interface DraftItem {
  id: string;
  description: string;
  quantity: string;
  unitPrice: string;
  date: string;
  notes: string;
}

function catalogDescription(item: ItemDocument): string {
  return item.description.trim() || item.name;
}

function toDraftItems(invoice: InvoiceDocument | null | undefined): DraftItem[] {
  if (invoice && invoice.items.length > 0) {
    return invoice.items.map((item) => ({
      id: item.id,
      description: item.description,
      quantity: String(item.quantity),
      unitPrice: (item.unitPriceCents / 100).toString(),
      date: item.date ?? "",
      notes: item.notes ?? "",
    }));
  }
  return [];
}

export const InvoiceFormModal = ({
  isOpen,
  initial,
  customers = [],
  items = [],
  onDismiss,
  onSubmit,
}: InvoiceFormModalProps) => {
  const [customerId, setCustomerId] = useState("");
  const [currency, setCurrency] = useState(DEFAULT_INVOICE_CURRENCY);
  const [issueDate, setIssueDate] = useState(toDateString());
  const [dueDate, setDueDate] = useState(addDaysToDateString(toDateString(), 30));
  const [notes, setNotes] = useState("");
  const [draftItems, setDraftItems] = useState<DraftItem[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const customersRef = useRef(customers);
  customersRef.current = customers;

  useEffect(() => {
    if (!isOpen) {
      return;
    }
    const matchedCustomer = initial
      ? customersRef.current.find(
          (entry) => entry.name === initial.clientName && entry.email === initial.clientEmail,
        )
      : undefined;
    setCustomerId(matchedCustomer?.id ?? "");
    setCurrency(initial?.currency ?? DEFAULT_INVOICE_CURRENCY);
    const nextIssueDate = initial?.issueDate ?? toDateString();
    setIssueDate(nextIssueDate);
    setDueDate(initial?.dueDate ?? addDaysToDateString(nextIssueDate, 30));
    setNotes(initial?.notes ?? "");
    setDraftItems(toDraftItems(initial));
    setIsSaving(false);
  }, [isOpen, initial]);

  const updateDraftItem = (id: string, patch: Partial<DraftItem>) => {
    setDraftItems((current) =>
      current.map((item) => (item.id === id ? { ...item, ...patch } : item)),
    );
  };

  const removeDraftItem = (id: string) => {
    setDraftItems((current) => current.filter((item) => item.id !== id));
  };

  const addItemFromCatalog = (id: string) => {
    const catalogItem = items.find((entry) => entry.id === id);
    if (!catalogItem) {
      return;
    }
    setDraftItems((current) => [
      ...current,
      {
        id: generateDocumentId(),
        description: catalogDescription(catalogItem),
        quantity: "1",
        unitPrice: (catalogItem.unitPriceCents / 100).toString(),
        date: "",
        notes: "",
      },
    ]);
  };

  const selectedCustomer = customers.find((entry) => entry.id === customerId);
  const resolvedClient = selectedCustomer
    ? { name: selectedCustomer.name, email: selectedCustomer.email }
    : initial
      ? { name: initial.clientName, email: initial.clientEmail }
      : undefined;

  const parsedItems = draftItems.map((item) => {
    const date = item.date.trim();
    const notes = item.notes.trim();
    return {
      id: item.id,
      description: item.description.trim(),
      quantity: Number(item.quantity),
      unitPriceCents: Math.round(Number(item.unitPrice) * 100),
      ...(date.length > 0 ? { date } : {}),
      ...(notes.length > 0 ? { notes } : {}),
    };
  });

  const isValid =
    resolvedClient !== undefined &&
    resolvedClient.name.trim().length > 0 &&
    parsedItems.length > 0 &&
    parsedItems.every(
      (item) =>
        item.description.length > 0 &&
        Number.isFinite(item.quantity) &&
        item.quantity > 0 &&
        Number.isFinite(item.unitPriceCents) &&
        item.unitPriceCents >= 0 &&
        Number.isInteger(item.unitPriceCents) &&
        (item.date === undefined || isInvoiceDateString(item.date)),
    ) &&
    isInvoiceDateString(issueDate) &&
    isInvoiceDateString(dueDate);

  const handleSave = async () => {
    if (!isValid || isSaving || !resolvedClient) {
      return;
    }
    setIsSaving(true);
    try {
      await onSubmit({
        clientName: resolvedClient.name,
        clientEmail: resolvedClient.email,
        currency,
        issueDate,
        dueDate,
        notes,
        items: parsedItems.map((item) => normalizeInvoiceLineItem(item)),
      });
      onDismiss();
    } catch {
      // The parent reports the failure; keep the modal open so input is not lost
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <IonModal isOpen={isOpen} onDidDismiss={onDismiss}>
      <IonHeader>
        <IonToolbar>
          <IonButtons slot="start">
            <IonButton onClick={onDismiss}>Cancel</IonButton>
          </IonButtons>
          <IonTitle>{initial ? "Edit Invoice" : "New Invoice"}</IonTitle>
          <IonButtons slot="end">
            <IonButton
              strong
              disabled={!isValid || isSaving}
              onClick={() => {
                void handleSave();
              }}
            >
              {initial ? "Save" : "Create"}
            </IonButton>
          </IonButtons>
        </IonToolbar>
      </IonHeader>
      <IonContent>
        <IonList inset>
          <IonListHeader>Client</IonListHeader>
          {customers.length > 0 ? (
            <IonItem>
              <IonSelect
                label="Customer"
                labelPlacement="stacked"
                interface="action-sheet"
                placeholder={initial ? initial.clientName : "Choose a customer"}
                value={customerId}
                onIonChange={(event) => {
                  const value = event.detail.value;
                  setCustomerId(typeof value === "string" ? value : "");
                }}
              >
                {customers.map((customer) => (
                  <IonSelectOption key={customer.id} value={customer.id}>
                    {customer.name}
                    {customer.email ? ` — ${customer.email}` : ""}
                  </IonSelectOption>
                ))}
              </IonSelect>
            </IonItem>
          ) : (
            <IonItem lines="none">
              <IonNote color="medium">
                {initial
                  ? initial.clientName
                  : "Add a customer in the Directory tab to invoice them"}
              </IonNote>
            </IonItem>
          )}
        </IonList>

        <IonList inset>
          <IonListHeader>Details</IonListHeader>
          <IonItem>
            <IonInput
              label="Issue date"
              labelPlacement="stacked"
              type="date"
              value={issueDate}
              onIonInput={(event) => setIssueDate(event.detail.value ?? "")}
            />
          </IonItem>
          <IonItem>
            <IonInput
              label="Due date"
              labelPlacement="stacked"
              type="date"
              value={dueDate}
              onIonInput={(event) => setDueDate(event.detail.value ?? "")}
            />
          </IonItem>
        </IonList>

        <IonList inset>
          <IonListHeader>Items</IonListHeader>
          {draftItems.map((item) => (
            <IonItem key={item.id} lines="full">
              <IonGrid className="ion-no-padding">
                <IonRow>
                  <IonCol size="12">
                    <IonInput
                      readonly
                      label="Item"
                      labelPlacement="stacked"
                      value={item.description}
                    />
                  </IonCol>
                </IonRow>
                <IonRow>
                  <IonCol size="4">
                    <IonInput
                      label="Qty"
                      labelPlacement="stacked"
                      type="number"
                      inputmode="decimal"
                      min="0"
                      value={item.quantity}
                      onIonInput={(event) =>
                        updateDraftItem(item.id, { quantity: event.detail.value ?? "" })
                      }
                    />
                  </IonCol>
                  <IonCol size="5">
                    <IonInput
                      readonly
                      label="Unit price"
                      labelPlacement="stacked"
                      value={formatCurrency(
                        Math.round(Number(item.unitPrice) * 100) || 0,
                        currency,
                      )}
                    />
                  </IonCol>
                  <IonCol size="3" className="ion-align-self-end ion-text-end">
                    <IonButton
                      fill="clear"
                      color="danger"
                      onClick={() => removeDraftItem(item.id)}
                      aria-label="Remove item"
                    >
                      <IonIcon slot="icon-only" icon={trashOutline} />
                    </IonButton>
                  </IonCol>
                </IonRow>
                <IonRow>
                  <IonCol size="12">
                    <IonInput
                      label="Date (optional)"
                      labelPlacement="stacked"
                      type="date"
                      value={item.date}
                      onIonInput={(event) =>
                        updateDraftItem(item.id, { date: event.detail.value ?? "" })
                      }
                    />
                  </IonCol>
                </IonRow>
                <IonRow>
                  <IonCol size="12">
                    <IonInput
                      label="Notes (optional)"
                      labelPlacement="stacked"
                      placeholder="Additional details..."
                      value={item.notes}
                      onIonInput={(event) =>
                        updateDraftItem(item.id, { notes: event.detail.value ?? "" })
                      }
                    />
                  </IonCol>
                </IonRow>
              </IonGrid>
            </IonItem>
          ))}
          {items.length > 0 ? (
            <IonItem lines="none">
              <IonSelect
                interface="action-sheet"
                placeholder="Add item from catalog"
                value=""
                onIonChange={(event) => {
                  const value = event.detail.value;
                  event.target.value = "";
                  if (typeof value === "string" && value.length > 0) {
                    addItemFromCatalog(value);
                  }
                }}
              >
                {items.map((catalogItem) => (
                  <IonSelectOption key={catalogItem.id} value={catalogItem.id}>
                    {catalogItem.name} — {formatCurrency(catalogItem.unitPriceCents, currency)}
                  </IonSelectOption>
                ))}
              </IonSelect>
            </IonItem>
          ) : (
            <IonItem lines="none">
              <IonNote color="medium">Add items in the Directory tab to include them here</IonNote>
            </IonItem>
          )}
        </IonList>

        <IonList inset>
          <IonListHeader>Notes</IonListHeader>
          <IonItem>
            <IonTextarea
              label="Notes (optional)"
              labelPlacement="stacked"
              autoGrow
              placeholder="Payment terms, bank details, ..."
              value={notes}
              onIonInput={(event) => setNotes(event.detail.value ?? "")}
            />
          </IonItem>
        </IonList>
      </IonContent>
    </IonModal>
  );
};

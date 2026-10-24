import { useRef } from "react";

import {
  IonBadge,
  IonButton,
  IonButtons,
  IonContent,
  IonHeader,
  IonItem,
  IonLabel,
  IonList,
  IonListHeader,
  IonModal,
  IonNote,
  IonTitle,
  IonToolbar,
  useIonAlert,
} from "@ionic/react";

import {
  formatCurrency,
  invoiceStatusColor,
  invoiceStatusLabel,
  invoiceTotalCents,
  type InvoiceDocument,
  type InvoiceStatus,
} from "../schema.ts";

export interface InvoiceDetailModalProps {
  invoice: InvoiceDocument | null;
  isOpen: boolean;
  onDismiss: () => void;
  onSendPdf: (invoice: InvoiceDocument) => Promise<unknown>;
  onSetStatus: (invoice: InvoiceDocument, status: InvoiceStatus) => Promise<unknown>;
  onEdit: (invoice: InvoiceDocument) => void;
  onDelete: (invoice: InvoiceDocument) => Promise<unknown>;
  statusMessage?: string | null;
}

export const InvoiceDetailModal = ({
  invoice,
  isOpen,
  onDismiss,
  onSendPdf,
  onSetStatus,
  onEdit,
  onDelete,
  statusMessage,
}: InvoiceDetailModalProps) => {
  const [presentAlert] = useIonAlert();
  const pendingEditRef = useRef<InvoiceDocument | null>(null);

  const confirmDelete = () => {
    if (!invoice) {
      return;
    }
    void presentAlert({
      header: "Delete Invoice",
      message: `Delete ${invoice.number}? This cannot be undone.`,
      buttons: [
        { text: "Cancel", role: "cancel" },
        {
          text: "Delete",
          role: "destructive",
          handler: () => {
            void onDelete(invoice)
              .then(() => onDismiss())
              .catch(() => {});
          },
        },
      ],
    });
  };

  return (
    <IonModal
      isOpen={isOpen}
      onDidDismiss={() => {
        onDismiss();
        const toEdit = pendingEditRef.current;
        if (toEdit) {
          pendingEditRef.current = null;
          onEdit(toEdit);
        }
      }}
    >
      <IonHeader>
        <IonToolbar>
          <IonButtons slot="start">
            <IonButton onClick={onDismiss}>Close</IonButton>
          </IonButtons>
          <IonTitle>{invoice?.number ?? "Invoice"}</IonTitle>
          <IonButtons slot="end">
            <IonButton
              onClick={() => {
                if (invoice) {
                  pendingEditRef.current = invoice;
                  onDismiss();
                }
              }}
            >
              Edit
            </IonButton>
          </IonButtons>
        </IonToolbar>
      </IonHeader>
      <IonContent>
        {invoice ? (
          <>
            <IonList inset>
              <IonItem>
                <IonLabel>Status</IonLabel>
                <IonBadge slot="end" color={invoiceStatusColor(invoice.status)}>
                  {invoiceStatusLabel(invoice.status)}
                </IonBadge>
              </IonItem>
              <IonItem>
                <IonLabel>
                  <h2>Client</h2>
                  <p>{invoice.clientName}</p>
                  {invoice.clientEmail ? <p>{invoice.clientEmail}</p> : null}
                </IonLabel>
              </IonItem>
              <IonItem>
                <IonLabel>
                  <h2>Issued</h2>
                  <p>{invoice.issueDate}</p>
                </IonLabel>
                <div slot="end" className="ion-text-end">
                  <h2>Due</h2>
                  <p>{invoice.dueDate}</p>
                </div>
              </IonItem>
            </IonList>

            <IonList inset>
              <IonListHeader>Items</IonListHeader>
              {invoice.items.map((item) => (
                <IonItem key={item.id}>
                  <IonLabel>
                    <h3>{item.description}</h3>
                    <IonNote>
                      {item.quantity} × {formatCurrency(item.unitPriceCents, invoice.currency)}
                      {item.date ? ` · ${item.date}` : ""}
                    </IonNote>
                    {item.notes ? <p>{item.notes}</p> : null}
                  </IonLabel>
                  <IonNote slot="end">
                    {formatCurrency(
                      Math.round(item.quantity * item.unitPriceCents),
                      invoice.currency,
                    )}
                  </IonNote>
                </IonItem>
              ))}
              <IonItem lines="none">
                <IonLabel>
                  <strong>Total</strong>
                </IonLabel>
                <IonNote slot="end">
                  <strong>{formatCurrency(invoiceTotalCents(invoice), invoice.currency)}</strong>
                </IonNote>
              </IonItem>
            </IonList>

            {invoice.notes.trim().length > 0 ? (
              <IonList inset>
                <IonListHeader>Notes</IonListHeader>
                <IonItem lines="none">
                  <IonLabel className="ion-text-wrap">{invoice.notes}</IonLabel>
                </IonItem>
              </IonList>
            ) : null}

            {statusMessage ? (
              <IonItem lines="none">
                <IonNote>{statusMessage}</IonNote>
              </IonItem>
            ) : null}

            <IonList inset>
              <IonItem
                button
                detail={false}
                onClick={() => {
                  void onSendPdf(invoice);
                }}
              >
                <IonLabel color="primary">Send as PDF</IonLabel>
              </IonItem>
              {invoice.status === "draft" ? (
                <IonItem
                  button
                  detail={false}
                  onClick={() => {
                    void onSetStatus(invoice, "sent");
                  }}
                >
                  <IonLabel color="primary">Mark as Sent</IonLabel>
                </IonItem>
              ) : null}
              {invoice.status === "sent" || invoice.status === "overdue" ? (
                <IonItem
                  button
                  detail={false}
                  onClick={() => {
                    void onSetStatus(invoice, "paid");
                  }}
                >
                  <IonLabel color="primary">Mark as Paid</IonLabel>
                </IonItem>
              ) : null}
              {invoice.status === "sent" ? (
                <IonItem
                  button
                  detail={false}
                  onClick={() => {
                    void onSetStatus(invoice, "overdue");
                  }}
                >
                  <IonLabel color="warning">Mark as Overdue</IonLabel>
                </IonItem>
              ) : null}
              <IonItem button detail={false} onClick={confirmDelete}>
                <IonLabel color="danger">Delete Invoice</IonLabel>
              </IonItem>
            </IonList>
          </>
        ) : null}
      </IonContent>
    </IonModal>
  );
};

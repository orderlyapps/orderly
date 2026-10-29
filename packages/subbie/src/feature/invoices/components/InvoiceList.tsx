import { IonBadge, IonItem, IonLabel, IonList, IonNote } from "@ionic/react";

import {
  formatAmount,
  invoiceStatusColor,
  invoiceStatusLabel,
  invoiceTotalCents,
  type InvoiceDocument,
} from "../schema.ts";

export interface InvoiceListProps {
  invoices: InvoiceDocument[];
  onSelect?: (invoice: InvoiceDocument) => void;
  emptyMessage?: string;
}

export const InvoiceList = ({
  invoices,
  onSelect,
  emptyMessage = "No invoices yet",
}: InvoiceListProps) => (
  <IonList inset>
    {invoices.length === 0 ? (
      <IonItem lines="none">
        <IonLabel>
          <IonNote>{emptyMessage}</IonNote>
        </IonLabel>
      </IonItem>
    ) : (
      invoices.map((invoice) => (
        <IonItem
          key={invoice.id}
          button={Boolean(onSelect)}
          detail={Boolean(onSelect)}
          onClick={() => onSelect?.(invoice)}
        >
          <IonLabel>
            <h2>{invoice.clientName}</h2>
            <IonNote>
              {invoice.number} · {invoice.issueDate}
            </IonNote>
          </IonLabel>
          <IonNote slot="end">{formatAmount(invoiceTotalCents(invoice))}</IonNote>
          <IonBadge slot="end" color={invoiceStatusColor(invoice.status)}>
            {invoiceStatusLabel(invoice.status)}
          </IonBadge>
        </IonItem>
      ))
    )}
  </IonList>
);

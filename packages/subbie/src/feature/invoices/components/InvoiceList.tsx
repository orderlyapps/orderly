import { IonBadge, IonItem, IonLabel, IonList, IonNote } from "@ionic/react";

import {
  formatAmount,
  invoiceGrandTotalCents,
  invoiceStatusColor,
  invoiceStatusLabel,
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
            <p>
              <IonNote style={{ fontSize: "0.8125rem" }}>{invoice.number}</IonNote>
            </p>
            <p>
              <IonNote style={{ fontSize: "0.8125rem" }}>{invoice.issueDate}</IonNote>
            </p>
          </IonLabel>
          <div slot="end" className="ion-text-end">
            <div style={{ marginBottom: 4 }}>
              <IonNote>{formatAmount(invoiceGrandTotalCents(invoice))}</IonNote>
            </div>
            <div>
              <IonBadge color={invoiceStatusColor(invoice.status)}>
                {invoiceStatusLabel(invoice.status)}
              </IonBadge>
            </div>
          </div>
        </IonItem>
      ))
    )}
  </IonList>
);

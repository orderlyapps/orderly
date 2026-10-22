import { IonBadge, IonItem, IonLabel, IonList, IonNote } from "@ionic/react";

import type { Invoice } from "../lib/invoices.ts";
import { formatCurrency, invoiceStatusColor, invoiceStatusLabel } from "../lib/invoices.ts";

interface InvoiceListProps {
  invoices: Invoice[];
}

export const InvoiceList = ({ invoices }: InvoiceListProps) => (
  <IonList inset>
    {invoices.map((invoice) => (
      <IonItem key={invoice.id} button detail>
        <IonLabel>
          <h2>{invoice.client}</h2>
          <IonNote>{invoice.id}</IonNote>
        </IonLabel>
        <IonNote slot="end">{formatCurrency(invoice.amountCents)}</IonNote>
        <IonBadge slot="end" color={invoiceStatusColor(invoice.status)}>
          {invoiceStatusLabel(invoice.status)}
        </IonBadge>
      </IonItem>
    ))}
  </IonList>
);

import { IonContent, IonHeader, IonPage, IonTitle, IonToolbar } from "@ionic/react";
import { InvoiceList, listInvoices } from "subbie-core";

const Invoices = () => {
  const invoices = listInvoices();

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonTitle>Invoices</IonTitle>
        </IonToolbar>
      </IonHeader>
      <IonContent fullscreen>
        <IonHeader collapse="condense">
          <IonToolbar>
            <IonTitle size="large">Invoices</IonTitle>
          </IonToolbar>
        </IonHeader>
        <InvoiceList invoices={invoices} />
      </IonContent>
    </IonPage>
  );
};

export default Invoices;

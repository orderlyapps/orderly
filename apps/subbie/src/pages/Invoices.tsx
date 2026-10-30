import { useState } from "react";

import {
  IonContent,
  IonHeader,
  IonItem,
  IonLabel,
  IonPage,
  IonSegment,
  IonSegmentButton,
  IonTitle,
  IonToolbar,
} from "@ionic/react";
import { CustomersView, InvoicesView, ItemsView } from "subbie-core";

type InvoicesSection = "invoices" | "customers" | "items";

const Invoices = () => {
  const [section, setSection] = useState<InvoicesSection>("invoices");

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
        <IonItem lines="none">
          <IonSegment
            value={section}
            onIonChange={(event) => {
              const value = event.detail.value;
              if (value === "invoices" || value === "customers" || value === "items") {
                setSection(value);
              }
            }}
          >
            <IonSegmentButton value="invoices">
              <IonLabel>Invoices</IonLabel>
            </IonSegmentButton>
            <IonSegmentButton value="customers">
              <IonLabel>Customers</IonLabel>
            </IonSegmentButton>
            <IonSegmentButton value="items">
              <IonLabel>Items</IonLabel>
            </IonSegmentButton>
          </IonSegment>
        </IonItem>
        {section === "invoices" ? (
          <InvoicesView />
        ) : section === "customers" ? (
          <CustomersView />
        ) : (
          <ItemsView />
        )}
      </IonContent>
    </IonPage>
  );
};

export default Invoices;

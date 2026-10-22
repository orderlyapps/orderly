import {
  IonBadge,
  IonContent,
  IonHeader,
  IonItem,
  IonLabel,
  IonList,
  IonNote,
  IonPage,
  IonTitle,
  IonToolbar,
} from "@ionic/react";

const invoices = [
  {
    id: "INV-2026-001",
    client: "Acme Corp",
    amount: "$1,250.00",
    status: "Paid",
    color: "success",
  },
  {
    id: "INV-2026-002",
    client: "Globex Inc",
    amount: "$3,400.00",
    status: "Pending",
    color: "warning",
  },
  {
    id: "INV-2026-003",
    client: "Initech LLC",
    amount: "$780.00",
    status: "Overdue",
    color: "danger",
  },
];

const Invoices = () => {
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
        <IonList inset>
          {invoices.map((invoice) => (
            <IonItem key={invoice.id} button detail>
              <IonLabel>
                <h2>{invoice.client}</h2>
                <IonNote>{invoice.id}</IonNote>
              </IonLabel>
              <IonNote slot="end">{invoice.amount}</IonNote>
              <IonBadge slot="end" color={invoice.color}>
                {invoice.status}
              </IonBadge>
            </IonItem>
          ))}
        </IonList>
      </IonContent>
    </IonPage>
  );
};

export default Invoices;

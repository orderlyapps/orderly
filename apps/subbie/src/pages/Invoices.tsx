import { IonContent, IonHeader, IonPage, IonTitle, IonToolbar } from "@ionic/react";
import { InvoicesView } from "subbie-core";

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
        <InvoicesView />
      </IonContent>
    </IonPage>
  );
};

export default Invoices;

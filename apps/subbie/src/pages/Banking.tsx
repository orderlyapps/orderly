import { IonContent, IonHeader, IonPage, IonTitle, IonToolbar } from "@ionic/react";
import { BankingOverviewView } from "subbie-core";

const Banking = () => (
  <IonPage>
    <IonHeader>
      <IonToolbar>
        <IonTitle>Banking</IonTitle>
      </IonToolbar>
    </IonHeader>
    <IonContent fullscreen>
      <IonHeader collapse="condense">
        <IonToolbar>
          <IonTitle size="large">Banking</IonTitle>
        </IonToolbar>
      </IonHeader>
      <BankingOverviewView />
    </IonContent>
  </IonPage>
);

export default Banking;

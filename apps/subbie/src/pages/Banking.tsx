import { IonContent, IonHeader, IonPage, IonTitle, IonToolbar } from "@ionic/react";
import { BankingView } from "subbie-core";

const Banking = () => {
  return (
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
        <BankingView />
      </IonContent>
    </IonPage>
  );
};

export default Banking;

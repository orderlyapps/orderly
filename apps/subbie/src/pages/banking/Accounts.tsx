import {
  IonBackButton,
  IonButtons,
  IonContent,
  IonHeader,
  IonPage,
  IonTitle,
  IonToolbar,
} from "@ionic/react";
import { BankAccountsView } from "subbie-core";

const Accounts = () => (
  <IonPage>
    <IonHeader>
      <IonToolbar>
        <IonButtons slot="start">
          <IonBackButton defaultHref="/banking" text="" />
        </IonButtons>
        <IonTitle>Accounts</IonTitle>
      </IonToolbar>
    </IonHeader>
    <IonContent fullscreen>
      <IonHeader collapse="condense">
        <IonToolbar>
          <IonTitle size="large">Accounts</IonTitle>
        </IonToolbar>
      </IonHeader>
      <BankAccountsView />
    </IonContent>
  </IonPage>
);

export default Accounts;

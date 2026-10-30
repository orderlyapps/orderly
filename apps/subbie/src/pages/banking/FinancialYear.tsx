import {
  IonBackButton,
  IonButtons,
  IonContent,
  IonHeader,
  IonPage,
  IonTitle,
  IonToolbar,
} from "@ionic/react";
import { BankFinancialYearSummaryView } from "subbie-core";

const FinancialYear = () => (
  <IonPage>
    <IonHeader>
      <IonToolbar>
        <IonButtons slot="start">
          <IonBackButton defaultHref="/banking" text="" />
        </IonButtons>
        <IonTitle>Financial Year Summary</IonTitle>
      </IonToolbar>
    </IonHeader>
    <IonContent fullscreen>
      <IonHeader collapse="condense">
        <IonToolbar>
          <IonTitle size="large">Financial Year Summary</IonTitle>
        </IonToolbar>
      </IonHeader>
      <BankFinancialYearSummaryView />
    </IonContent>
  </IonPage>
);

export default FinancialYear;

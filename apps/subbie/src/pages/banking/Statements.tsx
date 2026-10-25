import { useLocation } from "react-router-dom";

import {
  IonBackButton,
  IonButtons,
  IonContent,
  IonHeader,
  IonPage,
  IonTitle,
  IonToolbar,
} from "@ionic/react";
import {
  BankStatementsView,
  isBankingLineCategorisationFilter,
  type BankingLineCategorisationFilter,
} from "subbie-core";

const Statements = () => {
  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);
  const accountId = searchParams.get("accountId") ?? "";
  const categorisationParam = searchParams.get("categorisation");
  const categorisationFilter: BankingLineCategorisationFilter = isBankingLineCategorisationFilter(
    categorisationParam,
  )
    ? categorisationParam
    : "all";

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonButtons slot="start">
            <IonBackButton defaultHref="/banking" text="" />
          </IonButtons>
          <IonTitle>Statements</IonTitle>
        </IonToolbar>
      </IonHeader>
      <IonContent fullscreen>
        <IonHeader collapse="condense">
          <IonToolbar>
            <IonTitle size="large">Statements</IonTitle>
          </IonToolbar>
        </IonHeader>
        <BankStatementsView
          initialAccountId={accountId}
          initialCategorisationFilter={categorisationFilter}
        />
      </IonContent>
    </IonPage>
  );
};

export default Statements;

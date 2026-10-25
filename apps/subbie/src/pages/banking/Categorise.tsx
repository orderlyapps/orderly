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
  BankCategoriseView,
  isBankingLineCategorisationFilter,
  isBankingLineTypeFilter,
  type BankingLineCategorisationFilter,
  type BankingLineTypeFilter,
} from "subbie-core";

const Categorise = () => {
  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);
  const accountId = searchParams.get("accountId") ?? "";
  const categoryId = searchParams.get("categoryId") ?? "";
  const searchQuery = searchParams.get("q") ?? "";
  const categorisationParam = searchParams.get("categorisation");
  const categorisationFilter: BankingLineCategorisationFilter = isBankingLineCategorisationFilter(
    categorisationParam,
  )
    ? categorisationParam
    : "all";
  const typeParam = searchParams.get("type");
  const typeFilter: BankingLineTypeFilter = isBankingLineTypeFilter(typeParam) ? typeParam : "all";

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonButtons slot="start">
            <IonBackButton defaultHref="/banking" text="" />
          </IonButtons>
          <IonTitle>Categorise Lines</IonTitle>
        </IonToolbar>
      </IonHeader>
      <IonContent fullscreen>
        <IonHeader collapse="condense">
          <IonToolbar>
            <IonTitle size="large">Categorise Lines</IonTitle>
          </IonToolbar>
        </IonHeader>
        <BankCategoriseView
          initialAccountId={accountId}
          initialCategorisationFilter={categorisationFilter}
          initialTypeFilter={typeFilter}
          initialCategoryId={categoryId}
          initialSearchQuery={searchQuery}
        />
      </IonContent>
    </IonPage>
  );
};

export default Categorise;

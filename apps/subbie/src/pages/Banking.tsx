import { type ReactNode } from "react";
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
  BankAccountsView,
  BankCategoriesView,
  BankCategoriseView,
  BankingOverviewView,
  BankStatementsView,
  isBankingLineCategorisationFilter,
  isBankingLineTypeFilter,
  type BankingLineCategorisationFilter,
  type BankingLineTypeFilter,
} from "subbie-core";

const BankingSubPage = ({ title, children }: { title: string; children: ReactNode }) => (
  <IonPage>
    <IonHeader>
      <IonToolbar>
        <IonButtons slot="start">
          <IonBackButton defaultHref="/banking" text="" />
        </IonButtons>
        <IonTitle>{title}</IonTitle>
      </IonToolbar>
    </IonHeader>
    <IonContent fullscreen>
      <IonHeader collapse="condense">
        <IonToolbar>
          <IonTitle size="large">{title}</IonTitle>
        </IonToolbar>
      </IonHeader>
      {children}
    </IonContent>
  </IonPage>
);

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

export const BankingStatements = () => {
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
    <BankingSubPage title="Statements">
      <BankStatementsView
        initialAccountId={accountId}
        initialCategorisationFilter={categorisationFilter}
      />
    </BankingSubPage>
  );
};

export const BankingCategorise = () => {
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
    <BankingSubPage title="Categorise Lines">
      <BankCategoriseView
        initialAccountId={accountId}
        initialCategorisationFilter={categorisationFilter}
        initialTypeFilter={typeFilter}
        initialCategoryId={categoryId}
        initialSearchQuery={searchQuery}
      />
    </BankingSubPage>
  );
};

export const BankingAccounts = () => (
  <BankingSubPage title="Accounts">
    <BankAccountsView />
  </BankingSubPage>
);

export const BankingCategories = () => (
  <BankingSubPage title="Categories">
    <BankCategoriesView />
  </BankingSubPage>
);

export default Banking;

import { IonIcon, IonItem, IonLabel, IonList } from "@ionic/react";
import {
  checkmarkDoneOutline,
  documentTextOutline,
  pricetagsOutline,
  walletOutline,
} from "ionicons/icons";

export interface BankingOverviewViewProps {
  statementsRouterLink?: string;
  categoriseRouterLink?: string;
  accountsRouterLink?: string;
  categoriesRouterLink?: string;
}

export const BankingOverviewView = ({
  statementsRouterLink = "/banking/statements",
  categoriseRouterLink = "/banking/categorise",
  accountsRouterLink = "/banking/accounts",
  categoriesRouterLink = "/banking/categories",
}: BankingOverviewViewProps) => (
  <IonList inset>
    <IonItem button detail routerLink={statementsRouterLink}>
      <IonIcon aria-hidden="true" icon={documentTextOutline} slot="start" />
      <IonLabel>
        <h2>Statements</h2>
      </IonLabel>
    </IonItem>

    <IonItem button detail routerLink={categoriseRouterLink}>
      <IonIcon aria-hidden="true" icon={checkmarkDoneOutline} slot="start" />
      <IonLabel>
        <h2>Categorise Lines</h2>
      </IonLabel>
    </IonItem>

    <IonItem button detail routerLink={accountsRouterLink}>
      <IonIcon aria-hidden="true" icon={walletOutline} slot="start" />
      <IonLabel>
        <h2>Accounts</h2>
      </IonLabel>
    </IonItem>

    <IonItem button detail routerLink={categoriesRouterLink}>
      <IonIcon aria-hidden="true" icon={pricetagsOutline} slot="start" />
      <IonLabel>
        <h2>Categories</h2>
      </IonLabel>
    </IonItem>
  </IonList>
);

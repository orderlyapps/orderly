import type { ReactNode } from "react";

import { IonIcon, IonItem, IonLabel, IonList, IonNote } from "@ionic/react";
import {
  archiveOutline,
  briefcaseOutline,
  colorPaletteOutline,
  informationCircleOutline,
  receiptOutline,
  walletOutline,
} from "ionicons/icons";

import { APP_VERSION } from "../about/index.ts";

export interface SettingsViewProps {
  version?: string;
  businessRouterLink?: string;
  bankRouterLink?: string;
  invoiceRouterLink?: string;
  appearanceRouterLink?: string;
  dataRouterLink?: string;
  aboutRouterLink?: string;
  children?: ReactNode;
}

export const SettingsView = ({
  version = APP_VERSION,
  businessRouterLink = "/settings/business",
  bankRouterLink = "/settings/bank",
  invoiceRouterLink = "/settings/invoice",
  appearanceRouterLink = "/settings/appearance",
  dataRouterLink = "/settings/data",
  aboutRouterLink = "/settings/about",
  children,
}: SettingsViewProps) => {
  return (
    <>
      <IonList inset>
        <IonItem button detail routerLink={businessRouterLink}>
          <IonIcon aria-hidden="true" icon={briefcaseOutline} slot="start" />
          <IonLabel>
            <h2>Business Details</h2>
          </IonLabel>
        </IonItem>
        <IonItem button detail routerLink={bankRouterLink}>
          <IonIcon aria-hidden="true" icon={walletOutline} slot="start" />
          <IonLabel>
            <h2>Bank Details</h2>
          </IonLabel>
        </IonItem>
        <IonItem button detail routerLink={invoiceRouterLink}>
          <IonIcon aria-hidden="true" icon={receiptOutline} slot="start" />
          <IonLabel>
            <h2>Invoice Details</h2>
          </IonLabel>
        </IonItem>
        <IonItem button detail routerLink={appearanceRouterLink}>
          <IonIcon aria-hidden="true" icon={colorPaletteOutline} slot="start" />
          <IonLabel>
            <h2>Appearance</h2>
          </IonLabel>
        </IonItem>
        <IonItem button detail routerLink={dataRouterLink}>
          <IonIcon aria-hidden="true" icon={archiveOutline} slot="start" />
          <IonLabel>
            <h2>Backup &amp; Restore</h2>
          </IonLabel>
        </IonItem>
        <IonItem button detail routerLink={aboutRouterLink}>
          <IonIcon aria-hidden="true" icon={informationCircleOutline} slot="start" />
          <IonLabel>
            <h2>App Details</h2>
          </IonLabel>
          <IonNote slot="end">{version}</IonNote>
        </IonItem>
      </IonList>

      {children}
    </>
  );
};

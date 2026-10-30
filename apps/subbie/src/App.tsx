import { Navigate, Route } from "react-router-dom";

import {
  IonApp,
  IonIcon,
  IonLabel,
  IonRouterOutlet,
  IonTabBar,
  IonTabButton,
  IonTabs,
  setupIonicReact,
} from "@ionic/react";
import { IonReactRouter } from "@ionic/react-router";
import {
  iosTransitionAnimation,
  popoverEnterAnimation,
  popoverLeaveAnimation,
} from "@rdlabo/ionic-theme-ios27";
import { card, people, receipt, settings } from "ionicons/icons";
import { OnboardingGate, useThemeEffect } from "subbie-core";

import { PwaUpdatePrompt } from "./components/PwaUpdatePrompt";
import Banking from "./pages/Banking";
import BankingAccounts from "./pages/banking/Accounts";
import BankingCategories from "./pages/banking/Categories";
import BankingCategorise from "./pages/banking/Categorise";
import BankingFinancialYear from "./pages/banking/FinancialYear";
import BankingStatements from "./pages/banking/Statements";
import Directory from "./pages/Directory";
import Invoices from "./pages/Invoices";
import Onboarding from "./pages/Onboarding";
import Settings from "./pages/Settings";
import SettingsAbout from "./pages/settings/About";
import SettingsAppearance from "./pages/settings/Appearance";
import SettingsBank from "./pages/settings/Bank";
import SettingsBusiness from "./pages/settings/Business";
import SettingsData from "./pages/settings/Data";
import SettingsInvoice from "./pages/settings/Invoice";

/* Core CSS required for Ionic components to work properly */
import "@ionic/react/css/core.css";

/* Basic CSS for apps built with Ionic */
import "@ionic/react/css/normalize.css";
import "@ionic/react/css/structure.css";
import "@ionic/react/css/typography.css";

/* Optional CSS utils that can be commented out */
import "@ionic/react/css/padding.css";
import "@ionic/react/css/float-elements.css";
import "@ionic/react/css/text-alignment.css";
import "@ionic/react/css/text-transformation.css";
import "@ionic/react/css/flex-utils.css";
import "@ionic/react/css/display.css";

/* Dark palette, controlled via the .ion-palette-dark class */
import "@ionic/react/css/palettes/dark.class.css";

/* iOS 27 theme */
import "@rdlabo/ionic-theme-ios27/dist/css/default-variables.css";
import "@rdlabo/ionic-theme-ios27/dist/css/ionic-theme-ios27.css";
import "@rdlabo/ionic-theme-ios27/dist/css/md-remove-ios-class-effect.css";
import "@rdlabo/ionic-theme-ios27/dist/css/ionic-theme-ios27-dark-class.css";

/* Theme variables */
import "./theme/variables.css";

setupIonicReact({
  mode: "ios",
  navAnimation: iosTransitionAnimation,
  popoverEnter: popoverEnterAnimation,
  popoverLeave: popoverLeaveAnimation,
  innerHTMLTemplatesEnabled: true,
});

const App = () => {
  useThemeEffect();

  return (
    <IonApp>
      <PwaUpdatePrompt />
      <OnboardingGate onboarding={<Onboarding />}>
        <IonReactRouter>
          <IonTabs>
            <IonRouterOutlet>
              <Route path="/invoices" element={<Invoices />} />
              <Route path="/banking" element={<Banking />} />
              <Route path="/banking/statements" element={<BankingStatements />} />
              <Route path="/banking/categorise" element={<BankingCategorise />} />
              <Route path="/banking/accounts" element={<BankingAccounts />} />
              <Route path="/banking/categories" element={<BankingCategories />} />
              <Route path="/banking/financial-year" element={<BankingFinancialYear />} />
              <Route path="/directory" element={<Directory />} />
              <Route path="/settings" element={<Settings />} />
              <Route path="/settings/about" element={<SettingsAbout />} />
              <Route path="/settings/appearance" element={<SettingsAppearance />} />
              <Route path="/settings/bank" element={<SettingsBank />} />
              <Route path="/settings/business" element={<SettingsBusiness />} />
              <Route path="/settings/data" element={<SettingsData />} />
              <Route path="/settings/invoice" element={<SettingsInvoice />} />
              <Route path="/" element={<Navigate to="/invoices" replace />} />
            </IonRouterOutlet>
            <IonTabBar slot="bottom">
              <IonTabButton tab="invoices" href="/invoices">
                <IonIcon aria-hidden="true" icon={receipt} />
                <IonLabel>Invoices</IonLabel>
              </IonTabButton>
              <IonTabButton tab="banking" href="/banking">
                <IonIcon aria-hidden="true" icon={card} />
                <IonLabel>Banking</IonLabel>
              </IonTabButton>
              <IonTabButton tab="directory" href="/directory">
                <IonIcon aria-hidden="true" icon={people} />
                <IonLabel>Directory</IonLabel>
              </IonTabButton>
              <IonTabButton tab="settings" href="/settings">
                <IonIcon aria-hidden="true" icon={settings} />
                <IonLabel>Settings</IonLabel>
              </IonTabButton>
            </IonTabBar>
          </IonTabs>
        </IonReactRouter>
      </OnboardingGate>
    </IonApp>
  );
};

export default App;

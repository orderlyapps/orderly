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
import { useThemeEffect } from "subbie-core";

import Banking, {
  BankingAccounts,
  BankingCategories,
  BankingCategorise,
  BankingStatements,
} from "./pages/Banking";
import Directory from "./pages/Directory";
import Invoices from "./pages/Invoices";
import Settings from "./pages/Settings";

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
});

const App = () => {
  useThemeEffect();

  return (
    <IonApp>
      <IonReactRouter>
        <IonTabs>
          <IonRouterOutlet>
            <Route path="/invoices" element={<Invoices />} />
            <Route path="/banking" element={<Banking />} />
            <Route path="/banking/statements" element={<BankingStatements />} />
            <Route path="/banking/categorise" element={<BankingCategorise />} />
            <Route path="/banking/accounts" element={<BankingAccounts />} />
            <Route path="/banking/categories" element={<BankingCategories />} />
            <Route path="/directory" element={<Directory />} />
            <Route path="/settings" element={<Settings />} />
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
    </IonApp>
  );
};

export default App;

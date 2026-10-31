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
import { gameController, settings } from "ionicons/icons";
import { useThemeEffect } from "ionic-core";

import { PwaUpdatePrompt } from "./components/PwaUpdatePrompt";
import Games from "./pages/Games";
import Taboo from "./pages/games/Taboo";
import TabooCards from "./pages/games/taboo/Cards";
import Settings from "./pages/Settings";
import SettingsAbout from "./pages/settings/About";
import Snake from "./pages/Snake";

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
      <IonReactRouter>
        <IonTabs>
          <IonRouterOutlet>
            <Route path="/games" element={<Games />} />
            <Route path="/games/snake" element={<Snake />} />
            <Route path="/games/taboo" element={<Taboo />} />
            <Route path="/games/taboo/cards" element={<TabooCards />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="/settings/about" element={<SettingsAbout />} />
            <Route path="/" element={<Navigate to="/games" replace />} />
          </IonRouterOutlet>
          <IonTabBar slot="bottom">
            <IonTabButton tab="games" href="/games">
              <IonIcon aria-hidden="true" icon={gameController} />
              <IonLabel>Games</IonLabel>
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

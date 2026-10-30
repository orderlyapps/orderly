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
import { briefcase, calendar, home, people, settings } from "ionicons/icons";
import { useThemeEffect } from "proclaimer-core";

import { PwaUpdatePrompt } from "./components/PwaUpdatePrompt";
import Home from "./pages/Home";
import Ministry from "./pages/Ministry";
import LetterWriting from "./pages/ministry/LetterWriting";
import Map from "./pages/ministry/Map";
import Schedule from "./pages/ministry/Schedule";
import Publishers from "./pages/Publishers";
import Schedules from "./pages/Schedules";
import Settings from "./pages/Settings";
import SettingsAbout from "./pages/settings/About";
import Cleaning from "./pages/schedules/Cleaning";
import Events from "./pages/schedules/Events";
import Midweek from "./pages/schedules/Midweek";
import Weekend from "./pages/schedules/Weekend";

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
      <PwaUpdatePrompt />
      <IonReactRouter>
        <IonTabs>
          <IonRouterOutlet>
            <Route path="/home" element={<Home />} />
            <Route path="/ministry" element={<Ministry />} />
            <Route path="/ministry/map" element={<Map />} />
            <Route path="/ministry/letter-writing" element={<LetterWriting />} />
            <Route path="/ministry/schedule" element={<Schedule />} />
            <Route path="/schedules" element={<Schedules />} />
            <Route path="/schedules/midweek" element={<Midweek />} />
            <Route path="/schedules/weekend" element={<Weekend />} />
            <Route path="/schedules/cleaning" element={<Cleaning />} />
            <Route path="/schedules/events" element={<Events />} />
            <Route path="/publishers" element={<Publishers />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="/settings/about" element={<SettingsAbout />} />
            <Route path="/" element={<Navigate to="/home" replace />} />
          </IonRouterOutlet>
          <IonTabBar slot="bottom">
            <IonTabButton tab="home" href="/home">
              <IonIcon aria-hidden="true" icon={home} />
              <IonLabel>Home</IonLabel>
            </IonTabButton>
            <IonTabButton tab="ministry" href="/ministry">
              <IonIcon aria-hidden="true" icon={briefcase} />
              <IonLabel>Ministry</IonLabel>
            </IonTabButton>
            <IonTabButton tab="schedules" href="/schedules">
              <IonIcon aria-hidden="true" icon={calendar} />
              <IonLabel>Schedules</IonLabel>
            </IonTabButton>
            <IonTabButton tab="publishers" href="/publishers">
              <IonIcon aria-hidden="true" icon={people} />
              <IonLabel>Publishers</IonLabel>
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

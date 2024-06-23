import { Redirect, Route } from "react-router-dom";
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

/**
 * Ionic Dark Mode
 * -----------------------------------------------------
 * For more info, please see:
 * https://ionicframework.com/docs/theming/dark-mode
 */

/* import '@ionic/react/css/palettes/dark.always.css'; */
/* import '@ionic/react/css/palettes/dark.class.css'; */
import "@ionic/react/css/palettes/dark.system.css";

setupIonicReact();

export type IonTabsAppContent =
  | {
      label: string;
      component: React.FC<{}> | (() => JSX.Element);
      isTab?: boolean;
      icon?: string;
      path: string;
      redirect?: boolean;
    }[]
  | [];

export const IonTabsApp = ({ content }: { content: IonTabsAppContent }) => (
  <IonApp>
    <IonReactRouter>
      <IonTabs>
        <IonRouterOutlet>
          {content.map((page: any) => {
            if (page.label === "Home") {
              return (
                <Route
                  key={page.path}
                  exact
                  path={page.path}
                  component={page.component}
                />
              );
            }

            return (
              <Route
                key={page.path}
                exact
                path={page.path}
                component={page.component}
              />
            );
          })}
          <Route exact path="/">
            <Redirect
              to={content.filter(({ redirect }: any) => redirect)[0].path}
            />
          </Route>
        </IonRouterOutlet>

        <IonTabBar slot="bottom">
          {content.map((tab: any, index: any) => {
            if (tab.isTab) {
              return (
                <IonTabButton key={index} tab={`tab${index}`} href={tab.path}>
                  <IonIcon aria-hidden="true" icon={tab.icon} />
                  <IonLabel>{tab.label}</IonLabel>
                </IonTabButton>
              );
            }
            return null;
          })}
        </IonTabBar>
      </IonTabs>
    </IonReactRouter>
  </IonApp>
);

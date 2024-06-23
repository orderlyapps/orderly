import { IonTabsApp } from "../../shell-components/ionic/ion-tabs-app";
import { content } from "./content";
/* Theme variables */
import "./theme/variables.css";

export const Orderly: React.FC = () => {
  return <IonTabsApp content={content}></IonTabsApp>;
};

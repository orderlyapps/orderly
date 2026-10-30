import { IonItem, IonLabel, IonNote } from "@ionic/react";

import { APP_VERSION } from "../../about/index.ts";
import { SettingsSection } from "./SettingsSection.tsx";

export interface AboutSettingsSectionProps {
  version?: string;
  routerLink?: string;
}

export const AboutSettingsSection = ({
  version = APP_VERSION,
  routerLink = "/settings/about",
}: AboutSettingsSectionProps) => (
  <SettingsSection>
    <IonItem button detail routerLink={routerLink}>
      <IonLabel>Version</IonLabel>
      <IonNote slot="end">{version}</IonNote>
    </IonItem>
  </SettingsSection>
);

import type { ReactNode } from "react";

import { IonItem, IonItemGroup, IonNote } from "@ionic/react";

export interface SettingsSectionProps {
  statusMessage?: string | null;
  children: ReactNode;
}

export const SettingsSection = ({ statusMessage, children }: SettingsSectionProps) => (
  <IonItemGroup>
    {children}
    {statusMessage ? (
      <IonItem lines="none">
        <IonNote>{statusMessage}</IonNote>
      </IonItem>
    ) : null}
  </IonItemGroup>
);

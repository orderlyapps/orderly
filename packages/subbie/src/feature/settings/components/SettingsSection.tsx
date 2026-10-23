import type { ReactNode } from "react";

import { IonItem, IonItemGroup, IonLabel, IonListHeader, IonNote } from "@ionic/react";

export interface SettingsSectionProps {
  title: string;
  statusMessage?: string | null;
  children: ReactNode;
}

export const SettingsSection = ({ title, statusMessage, children }: SettingsSectionProps) => (
  <IonItemGroup>
    <IonListHeader>
      <IonLabel>{title}</IonLabel>
    </IonListHeader>
    {children}
    {statusMessage ? (
      <IonItem lines="none">
        <IonNote>{statusMessage}</IonNote>
      </IonItem>
    ) : null}
  </IonItemGroup>
);

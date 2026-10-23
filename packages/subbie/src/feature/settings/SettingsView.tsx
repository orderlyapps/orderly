import { type ReactNode, useState } from "react";

import { IonList } from "@ionic/react";

import { AppearanceSettingsSection, DataSettingsSection } from "./components/index.ts";
import type { SettingsStore } from "./db.ts";
import { useSettings } from "./hooks.ts";

export interface SettingsViewProps {
  store?: SettingsStore;
  children?: ReactNode;
}

export const SettingsView = ({ store: customStore, children }: SettingsViewProps) => {
  const { theme, setTheme, store } = useSettings(customStore);
  const [appearanceStatus, setAppearanceStatus] = useState<string | null>(null);
  const [dataStatus, setDataStatus] = useState<string | null>(null);
  const resolvedStore = customStore ?? store ?? undefined;

  return (
    <IonList inset>
      <AppearanceSettingsSection
        theme={theme}
        onThemeChange={setTheme}
        statusMessage={appearanceStatus}
        onStatusChange={setAppearanceStatus}
      />
      {children}
      <DataSettingsSection
        store={resolvedStore}
        statusMessage={dataStatus}
        onStatusChange={setDataStatus}
      />
    </IonList>
  );
};

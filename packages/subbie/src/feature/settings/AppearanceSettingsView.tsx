import { useState } from "react";

import { IonList } from "@ionic/react";

import { AppearanceSettingsSection } from "./components/index.ts";
import type { SettingsStore } from "./db.ts";
import { useSettings } from "./hooks.ts";

export interface AppearanceSettingsViewProps {
  store?: SettingsStore;
}

export const AppearanceSettingsView = ({ store: customStore }: AppearanceSettingsViewProps) => {
  const { theme, setTheme } = useSettings(customStore);
  const [status, setStatus] = useState<string | null>(null);

  return (
    <IonList inset>
      <AppearanceSettingsSection
        theme={theme}
        onThemeChange={setTheme}
        statusMessage={status}
        onStatusChange={setStatus}
      />
    </IonList>
  );
};

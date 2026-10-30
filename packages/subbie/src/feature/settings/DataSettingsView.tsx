import { useState } from "react";

import { IonList } from "@ionic/react";

import { DataSettingsSection } from "./components/index.ts";
import type { SettingsStore } from "./db.ts";
import { useSettings } from "./hooks.ts";

export interface DataSettingsViewProps {
  store?: SettingsStore;
}

export const DataSettingsView = ({ store: customStore }: DataSettingsViewProps) => {
  const { store } = useSettings(customStore);
  const [status, setStatus] = useState<string | null>(null);
  const resolvedStore = customStore ?? store ?? undefined;

  return (
    <IonList inset>
      <DataSettingsSection
        store={resolvedStore}
        statusMessage={status}
        onStatusChange={setStatus}
      />
    </IonList>
  );
};

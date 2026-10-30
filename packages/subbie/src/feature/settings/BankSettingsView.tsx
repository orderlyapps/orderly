import { useState } from "react";

import { IonList } from "@ionic/react";

import { BankSettingsSection } from "./components/index.ts";
import type { SettingsStore } from "./db.ts";
import { useSettings } from "./hooks.ts";

export interface BankSettingsViewProps {
  store?: SettingsStore;
}

export const BankSettingsView = ({ store: customStore }: BankSettingsViewProps) => {
  const { settings, updateSettings } = useSettings(customStore);
  const [status, setStatus] = useState<string | null>(null);

  return (
    <IonList inset>
      <BankSettingsSection
        bankAccountName={settings.bankAccountName}
        bankBsb={settings.bankBsb}
        bankAccountNumber={settings.bankAccountNumber}
        onUpdateSettings={updateSettings}
        statusMessage={status}
        onStatusChange={setStatus}
      />
    </IonList>
  );
};

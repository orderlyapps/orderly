import { useState } from "react";

import { IonList } from "@ionic/react";

import { BusinessSettingsSection, GstSettingsSection } from "./components/index.ts";
import type { SettingsStore } from "./db.ts";
import { useSettings } from "./hooks.ts";

export interface BusinessSettingsViewProps {
  store?: SettingsStore;
}

export const BusinessSettingsView = ({ store: customStore }: BusinessSettingsViewProps) => {
  const { settings, updateSettings } = useSettings(customStore);
  const [businessStatus, setBusinessStatus] = useState<string | null>(null);
  const [gstStatus, setGstStatus] = useState<string | null>(null);

  return (
    <IonList inset>
      <BusinessSettingsSection
        businessName={settings.businessName}
        abn={settings.abn}
        onUpdateSettings={updateSettings}
        statusMessage={businessStatus}
        onStatusChange={setBusinessStatus}
      />
      <GstSettingsSection
        gstRegistered={settings.gstRegistered}
        gstRate={settings.gstRate}
        defaultGstType={settings.defaultGstType}
        onUpdateSettings={updateSettings}
        statusMessage={gstStatus}
        onStatusChange={setGstStatus}
      />
    </IonList>
  );
};

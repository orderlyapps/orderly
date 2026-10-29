import { type ReactNode, useState } from "react";

import { IonList } from "@ionic/react";

import {
  AppearanceSettingsSection,
  DataSettingsSection,
  GstSettingsSection,
  InvoicingSettingsSection,
} from "./components/index.ts";
import type { SettingsStore } from "./db.ts";
import { useSettings } from "./hooks.ts";

export interface SettingsViewProps {
  store?: SettingsStore;
  children?: ReactNode;
}

export const SettingsView = ({ store: customStore, children }: SettingsViewProps) => {
  const { settings, theme, setTheme, updateSettings, store } = useSettings(customStore);
  const [appearanceStatus, setAppearanceStatus] = useState<string | null>(null);
  const [invoicingStatus, setInvoicingStatus] = useState<string | null>(null);
  const [gstStatus, setGstStatus] = useState<string | null>(null);
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
      <InvoicingSettingsSection
        paymentTermsDays={settings.defaultPaymentTermsDays}
        invoiceNotes={settings.defaultInvoiceNotes}
        onUpdateSettings={updateSettings}
        statusMessage={invoicingStatus}
        onStatusChange={setInvoicingStatus}
      />
      <GstSettingsSection
        gstRegistered={settings.gstRegistered}
        gstRate={settings.gstRate}
        defaultGstType={settings.defaultGstType}
        onUpdateSettings={updateSettings}
        statusMessage={gstStatus}
        onStatusChange={setGstStatus}
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

import { type ReactNode, useState } from "react";

import { IonList } from "@ionic/react";

import {
  AboutSettingsSection,
  AppearanceSettingsSection,
  BusinessSettingsSection,
  DataSettingsSection,
  GstSettingsSection,
  InvoicingSettingsSection,
} from "./components/index.ts";
import type { SettingsStore } from "./db.ts";
import { useSettings } from "./hooks.ts";

export interface SettingsViewProps {
  store?: SettingsStore;
  version?: string;
  children?: ReactNode;
}

export const SettingsView = ({ store: customStore, version, children }: SettingsViewProps) => {
  const { settings, theme, setTheme, updateSettings, store } = useSettings(customStore);
  const [appearanceStatus, setAppearanceStatus] = useState<string | null>(null);
  const [businessStatus, setBusinessStatus] = useState<string | null>(null);
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
      <BusinessSettingsSection
        businessName={settings.businessName}
        abn={settings.abn}
        bankAccountName={settings.bankAccountName}
        bankBsb={settings.bankBsb}
        bankAccountNumber={settings.bankAccountNumber}
        onUpdateSettings={updateSettings}
        statusMessage={businessStatus}
        onStatusChange={setBusinessStatus}
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
      <AboutSettingsSection version={version} />
    </IonList>
  );
};

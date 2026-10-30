import { useState } from "react";

import { IonList } from "@ionic/react";

import { InvoicingSettingsSection } from "./components/index.ts";
import type { SettingsStore } from "./db.ts";
import { useSettings } from "./hooks.ts";

export interface InvoiceSettingsViewProps {
  store?: SettingsStore;
}

export const InvoiceSettingsView = ({ store: customStore }: InvoiceSettingsViewProps) => {
  const { settings, updateSettings } = useSettings(customStore);
  const [status, setStatus] = useState<string | null>(null);

  return (
    <IonList inset>
      <InvoicingSettingsSection
        paymentTermsDays={settings.defaultPaymentTermsDays}
        invoiceNotes={settings.defaultInvoiceNotes}
        onUpdateSettings={updateSettings}
        statusMessage={status}
        onStatusChange={setStatus}
      />
    </IonList>
  );
};

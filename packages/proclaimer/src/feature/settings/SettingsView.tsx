import { type ReactNode, useState } from "react";

import { IonList } from "@ionic/react";

import type { PublisherCollection } from "../publisher/collection.ts";
import {
  AboutSettingsSection,
  AppearanceSettingsSection,
  DataSettingsSection,
  PublisherSettingsSection,
} from "./components/index.ts";
import type { SettingsStore } from "./db.ts";
import { useSettings } from "./hooks.ts";

export interface SettingsViewProps {
  store?: SettingsStore;
  version?: string;
  publisherCollection?: PublisherCollection;
  children?: ReactNode;
}

export const SettingsView = ({
  store: customStore,
  version,
  publisherCollection,
  children,
}: SettingsViewProps) => {
  const { settings, theme, setTheme, setSetting, store } = useSettings(customStore);
  const [appearanceStatus, setAppearanceStatus] = useState<string | null>(null);
  const [publisherStatus, setPublisherStatus] = useState<string | null>(null);
  const [dataStatus, setDataStatus] = useState<string | null>(null);
  const resolvedStore = customStore ?? store ?? undefined;

  return (
    <IonList inset>
      <PublisherSettingsSection
        congregationId={settings.congregationId}
        publisherId={settings.publisherId}
        publisherCollection={publisherCollection}
        statusMessage={publisherStatus}
        onPublisherChange={(publisherId) => {
          setSetting("publisherId", publisherId)
            .then(() => setPublisherStatus(null))
            .catch((error: unknown) => {
              setPublisherStatus(
                error instanceof Error ? error.message : "Failed to save your publisher",
              );
            });
        }}
      />
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
      <AboutSettingsSection version={version} />
    </IonList>
  );
};

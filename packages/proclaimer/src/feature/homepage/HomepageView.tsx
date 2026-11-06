import { IonText } from "@ionic/react";

import type { PublisherCollection } from "../publisher/collection.ts";
import { usePublishers } from "../publisher/hooks.ts";
import type { SettingsStore } from "../settings/db.ts";
import { useSettings } from "../settings/hooks.ts";
import { HomeAssignments } from "./HomeAssignments.tsx";
import type { UpcomingAssignmentCollections } from "./hooks.ts";
import { getWelcomeName } from "./welcome.ts";

export interface HomepageViewProps {
  store?: SettingsStore;
  publisherCollection?: PublisherCollection;
  assignmentCollections?: UpcomingAssignmentCollections;
  logoSrc?: string;
}

export const HomepageView = ({
  store,
  publisherCollection,
  assignmentCollections,
  logoSrc = "/logo.svg",
}: HomepageViewProps) => {
  const { settings } = useSettings(store);
  const { publishers } = usePublishers(settings.congregationId, publisherCollection);
  const name = getWelcomeName(publishers.find((p) => p.id === settings.publisherId));

  return (
    <>
      <div className="ion-text-center ion-padding">
        <img src={logoSrc} alt="Proclaimer" width={96} height={96} />
        <IonText>
          <h1>Welcome{name ? `, ${name}` : ""}</h1>
        </IonText>
      </div>
      {settings.publisherId ? (
        <HomeAssignments
          congregationId={settings.congregationId}
          publisherId={settings.publisherId}
          collections={assignmentCollections}
        />
      ) : null}
    </>
  );
};

import { IonItem, IonLabel, IonList, IonListHeader, IonNote } from "@ionic/react";

import { APP_VERSION, BUILD_ID, CHANGELOG, type ChangelogEntry } from "./changelog.ts";

export interface AboutViewProps {
  version?: string;
  buildId?: string;
  entries?: ChangelogEntry[];
}

export const AboutView = ({
  version = APP_VERSION,
  buildId = BUILD_ID,
  entries = CHANGELOG,
}: AboutViewProps) => (
  <>
    <IonList inset>
      <IonItem>
        <IonLabel>
          <h2>Version</h2>
        </IonLabel>
        <IonNote slot="end">{version}</IonNote>
      </IonItem>
      {buildId && (
        <IonItem>
          <IonLabel>
            <h2>Build</h2>
          </IonLabel>
          <IonNote slot="end" className="ion-text-wrap">
            {buildId}
          </IonNote>
        </IonItem>
      )}
    </IonList>

    {entries.map((entry) => (
      <IonList inset key={entry.version}>
        <IonListHeader>
          <IonLabel>
            {entry.version}
            <p>
              <IonNote>{entry.date}</IonNote>
            </p>
          </IonLabel>
        </IonListHeader>
        {entry.changes.map((change, index) => (
          <IonItem key={index}>
            <IonLabel className="ion-text-wrap">{change}</IonLabel>
          </IonItem>
        ))}
      </IonList>
    ))}
  </>
);

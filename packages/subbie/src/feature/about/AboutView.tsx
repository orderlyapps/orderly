import { IonItem, IonLabel, IonList, IonListHeader, IonNote } from "@ionic/react";

import { APP_VERSION, CHANGELOG, type ChangelogEntry } from "./changelog.ts";

export interface AboutViewProps {
  version?: string;
  entries?: ChangelogEntry[];
}

export const AboutView = ({ version = APP_VERSION, entries = CHANGELOG }: AboutViewProps) => (
  <>
    <IonList inset>
      <IonItem>
        <IonLabel>
          <h2>Version</h2>
        </IonLabel>
        <IonNote slot="end">{version}</IonNote>
      </IonItem>
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

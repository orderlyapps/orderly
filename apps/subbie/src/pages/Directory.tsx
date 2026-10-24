import { useState } from "react";

import {
  IonContent,
  IonHeader,
  IonLabel,
  IonPage,
  IonSegment,
  IonSegmentButton,
  IonTitle,
  IonToolbar,
} from "@ionic/react";
import { CustomersView, ItemsView } from "subbie-core";

type DirectorySection = "customers" | "items";

const Directory = () => {
  const [section, setSection] = useState<DirectorySection>("customers");

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonTitle>Directory</IonTitle>
        </IonToolbar>
      </IonHeader>
      <IonContent fullscreen>
        <IonHeader collapse="condense">
          <IonToolbar>
            <IonTitle size="large">Directory</IonTitle>
          </IonToolbar>
        </IonHeader>
        <IonSegment
          value={section}
          onIonChange={(event) => {
            const value = event.detail.value;
            if (value === "customers" || value === "items") {
              setSection(value);
            }
          }}
        >
          <IonSegmentButton value="customers">
            <IonLabel>Customers</IonLabel>
          </IonSegmentButton>
          <IonSegmentButton value="items">
            <IonLabel>Items</IonLabel>
          </IonSegmentButton>
        </IonSegment>
        {section === "customers" ? <CustomersView /> : <ItemsView />}
      </IonContent>
    </IonPage>
  );
};

export default Directory;

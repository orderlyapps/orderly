import { IonContent, IonPage } from "@ionic/react";
import { HomepageView } from "proclaimer-core";

const Home = () => {
  return (
    <IonPage>
      <IonContent fullscreen>
        <div style={{ paddingTop: "var(--ion-safe-area-top, env(safe-area-inset-top))" }}>
          <HomepageView />
        </div>
      </IonContent>
    </IonPage>
  );
};

export default Home;

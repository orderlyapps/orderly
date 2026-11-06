import { IonContent, IonHeader, IonPage, IonTitle, IonToolbar } from "@ionic/react";
import { HomepageView } from "proclaimer-core";

const Home = () => {
  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonTitle>Home</IonTitle>
        </IonToolbar>
      </IonHeader>
      <IonContent fullscreen>
        <IonHeader collapse="condense">
          <IonToolbar>
            <IonTitle size="large">Home</IonTitle>
          </IonToolbar>
        </IonHeader>
        <HomepageView />
      </IonContent>
    </IonPage>
  );
};

export default Home;

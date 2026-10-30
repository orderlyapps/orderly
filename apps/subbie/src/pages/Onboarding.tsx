import { IonContent, IonHeader, IonPage, IonTitle, IonToolbar } from "@ionic/react";
import { OnboardingView } from "subbie-core";

const Onboarding = () => {
  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonTitle>Welcome</IonTitle>
        </IonToolbar>
      </IonHeader>
      <IonContent fullscreen>
        <OnboardingView />
      </IonContent>
    </IonPage>
  );
};

export default Onboarding;

import {
  IonContent,
  IonHeader,
  IonIcon,
  IonItem,
  IonLabel,
  IonList,
  IonPage,
  IonTitle,
  IonToolbar,
} from "@ionic/react";
import { gameController } from "ionicons/icons";

const Games = () => {
  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonTitle>Games</IonTitle>
        </IonToolbar>
      </IonHeader>
      <IonContent fullscreen>
        <IonHeader collapse="condense">
          <IonToolbar>
            <IonTitle size="large">Games</IonTitle>
          </IonToolbar>
        </IonHeader>
        <IonList inset>
          <IonItem button detail routerLink="/games/snake">
            <IonIcon aria-hidden="true" icon={gameController} slot="start" />
            <IonLabel>Snake</IonLabel>
          </IonItem>
        </IonList>
      </IonContent>
    </IonPage>
  );
};

export default Games;

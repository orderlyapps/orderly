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
import { chatbubbles, gameController } from "ionicons/icons";

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
          <IonItem button detail routerLink="/games/taboo">
            <IonIcon aria-hidden="true" icon={chatbubbles} slot="start" />
            <IonLabel>Taboo</IonLabel>
          </IonItem>
        </IonList>
      </IonContent>
    </IonPage>
  );
};

export default Games;

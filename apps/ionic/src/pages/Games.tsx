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
import { airplane, chatbubbles, gameController, grid, shapes } from "ionicons/icons";

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
          <IonItem button detail routerLink="/games/flappy-bird">
            <IonIcon aria-hidden="true" icon={airplane} slot="start" />
            <IonLabel>Flappy Bird</IonLabel>
          </IonItem>
          <IonItem button detail routerLink="/games/minesweeper">
            <IonIcon aria-hidden="true" icon={grid} slot="start" />
            <IonLabel>Minesweeper</IonLabel>
          </IonItem>
          <IonItem button detail routerLink="/games/tetris">
            <IonIcon aria-hidden="true" icon={shapes} slot="start" />
            <IonLabel>Tetris</IonLabel>
          </IonItem>
        </IonList>
      </IonContent>
    </IonPage>
  );
};

export default Games;

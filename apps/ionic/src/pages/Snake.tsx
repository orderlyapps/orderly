import {
  IonBackButton,
  IonButton,
  IonButtons,
  IonContent,
  IonHeader,
  IonIcon,
  IonPage,
  IonText,
  IonToolbar,
  useIonViewDidEnter,
  useIonViewWillLeave,
} from "@ionic/react";
import { chevronBack, chevronDown, chevronForward, chevronUp } from "ionicons/icons";
import { useEffect, useRef, useState } from "react";
import { SnakeGame, type Direction } from "games";

import "./Snake.css";

const HIGH_SCORE_KEY = "snake:high-score";

const Snake = () => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const gameRef = useRef<SnakeGame | null>(null);
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(
    () => Number(localStorage.getItem(HIGH_SCORE_KEY)) || 0,
  );
  const [gameOver, setGameOver] = useState(false);

  useEffect(() => {
    if (score > highScore) {
      setHighScore(score);
      localStorage.setItem(HIGH_SCORE_KEY, String(score));
    }
  }, [score, highScore]);

  useEffect(() => {
    if (!canvasRef.current) return;
    const game = new SnakeGame(canvasRef.current, {
      onScore: setScore,
      onGameOver: () => setGameOver(true),
    });
    gameRef.current = game;
    return () => {
      game.destroy();
      gameRef.current = null;
    };
  }, []);

  useIonViewDidEnter(() => {
    gameRef.current?.start();
  });

  useIonViewWillLeave(() => {
    gameRef.current?.stop();
  });

  const restart = () => {
    setGameOver(false);
    gameRef.current?.restart();
  };

  const turn = (direction: Direction) => {
    gameRef.current?.setDirection(direction);
  };

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonButtons slot="start">
            <IonBackButton defaultHref="/games" text="" />
          </IonButtons>
        </IonToolbar>
      </IonHeader>
      <IonContent fullscreen>
        <div className="snake-page">
          <div className="snake-board">
            <canvas ref={canvasRef} />
            {gameOver && (
              <div className="snake-overlay">
                <IonText className="snake-overlay-title">Game Over</IonText>
                <IonButton onClick={restart}>Play Again</IonButton>
              </div>
            )}
          </div>
          <div className="snake-controls">
            <IonButton
              className="snake-control snake-control-up"
              aria-label="Move up"
              onPointerDown={() => turn("up")}
            >
              <IonIcon icon={chevronUp} />
            </IonButton>
            <IonButton
              className="snake-control snake-control-left"
              aria-label="Move left"
              onPointerDown={() => turn("left")}
            >
              <IonIcon icon={chevronBack} />
            </IonButton>
            <IonButton
              className="snake-control snake-control-down"
              aria-label="Move down"
              onPointerDown={() => turn("down")}
            >
              <IonIcon icon={chevronDown} />
            </IonButton>
            <IonButton
              className="snake-control snake-control-right"
              aria-label="Move right"
              onPointerDown={() => turn("right")}
            >
              <IonIcon icon={chevronForward} />
            </IonButton>
          </div>
          <IonText color="medium" className="snake-hint">
            Arrow keys, swipe, or buttons to move
          </IonText>
          <IonText className="snake-score">
            Score: {score} · Best: {highScore}
          </IonText>
        </div>
      </IonContent>
    </IonPage>
  );
};

export default Snake;

import {
  IonBackButton,
  IonButton,
  IonButtons,
  IonContent,
  IonHeader,
  IonPage,
  IonText,
  IonTitle,
  IonToolbar,
  useIonViewDidEnter,
  useIonViewWillLeave,
} from "@ionic/react";
import { useEffect, useRef, useState } from "react";
import { SnakeGame } from "games";

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

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonButtons slot="start">
            <IonBackButton defaultHref="/games" text="" />
          </IonButtons>
          <IonTitle>Snake</IonTitle>
        </IonToolbar>
      </IonHeader>
      <IonContent fullscreen>
        <IonHeader collapse="condense">
          <IonToolbar>
            <IonTitle size="large">Snake</IonTitle>
          </IonToolbar>
        </IonHeader>
        <div className="snake-page">
          <IonText className="snake-score">
            Score: {score} · Best: {highScore}
          </IonText>
          <div className="snake-board">
            <canvas ref={canvasRef} />
            {gameOver && (
              <div className="snake-overlay">
                <IonText className="snake-overlay-title">Game Over</IonText>
                <IonButton onClick={restart}>Play Again</IonButton>
              </div>
            )}
          </div>
          <IonText color="medium" className="snake-hint">
            Arrow keys or swipe to move
          </IonText>
        </div>
      </IonContent>
    </IonPage>
  );
};

export default Snake;

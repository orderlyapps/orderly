import {
  IonBackButton,
  IonButton,
  IonButtons,
  IonContent,
  IonHeader,
  IonPage,
  IonText,
  IonToolbar,
  useIonViewDidEnter,
  useIonViewWillLeave,
} from "@ionic/react";
import { useEffect, useRef, useState } from "react";
import { FlappyGame } from "games";

import "./FlappyBird.css";

const HIGH_SCORE_KEY = "flappy:high-score";

const FlappyBird = () => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const gameRef = useRef<FlappyGame | null>(null);
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
    const game = new FlappyGame(canvasRef.current, {
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
        </IonToolbar>
      </IonHeader>
      <IonContent fullscreen>
        <div className="flappy-page">
          <div className="flappy-board">
            <canvas ref={canvasRef} />
            {gameOver && (
              <div className="flappy-overlay">
                <IonText className="flappy-overlay-title">Game Over</IonText>
                <IonButton onClick={restart}>Play Again</IonButton>
              </div>
            )}
          </div>
          <IonText color="medium" className="flappy-hint">
            Tap, click, or press space to flap
          </IonText>
          <IonText className="flappy-score">
            Score: {score} · Best: {highScore}
          </IonText>
        </div>
      </IonContent>
    </IonPage>
  );
};

export default FlappyBird;

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
import { chevronBack, chevronDown, chevronForward, download, refresh } from "ionicons/icons";
import { useEffect, useRef, useState } from "react";
import { TetrisGame } from "games";

import "./Tetris.css";

const HIGH_SCORE_KEY = "tetris:high-score";

const Tetris = () => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const gameRef = useRef<TetrisGame | null>(null);
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
    const game = new TetrisGame(canvasRef.current, {
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
        <div className="tetris-page">
          <div className="tetris-board">
            <canvas ref={canvasRef} />
            {gameOver && (
              <div className="tetris-overlay">
                <IonText className="tetris-overlay-title">Game Over</IonText>
                <IonButton onClick={restart}>Play Again</IonButton>
              </div>
            )}
          </div>
          <div className="tetris-controls">
            <IonButton
              className="tetris-control"
              aria-label="Move left"
              onPointerDown={() => gameRef.current?.moveLeft()}
            >
              <IonIcon icon={chevronBack} />
            </IonButton>
            <IonButton
              className="tetris-control"
              aria-label="Soft drop"
              onPointerDown={() => gameRef.current?.softDrop()}
            >
              <IonIcon icon={chevronDown} />
            </IonButton>
            <IonButton
              className="tetris-control"
              aria-label="Rotate"
              onPointerDown={() => gameRef.current?.rotate()}
            >
              <IonIcon icon={refresh} />
            </IonButton>
            <IonButton
              className="tetris-control"
              aria-label="Hard drop"
              onPointerDown={() => gameRef.current?.hardDrop()}
            >
              <IonIcon icon={download} />
            </IonButton>
            <IonButton
              className="tetris-control"
              aria-label="Move right"
              onPointerDown={() => gameRef.current?.moveRight()}
            >
              <IonIcon icon={chevronForward} />
            </IonButton>
          </div>
          <IonText color="medium" className="tetris-hint">
            Arrows or swipe to move · up to rotate · space to drop
          </IonText>
          <IonText className="tetris-score">
            Score: {score} · Best: {highScore}
          </IonText>
        </div>
      </IonContent>
    </IonPage>
  );
};

export default Tetris;

import {
  IonBackButton,
  IonButton,
  IonButtons,
  IonContent,
  IonHeader,
  IonIcon,
  IonLabel,
  IonPage,
  IonSegment,
  IonSegmentButton,
  IonText,
  IonToolbar,
  useIonViewDidEnter,
  useIonViewWillLeave,
} from "@ionic/react";
import { flag } from "ionicons/icons";
import { useCallback, useEffect, useRef, useState } from "react";
import { MinesweeperGame } from "games";

import "./Minesweeper.css";

const DIFFICULTIES = [
  { key: "beginner", label: "Beginner", cols: 9, rows: 9, mines: 10 },
  { key: "intermediate", label: "Intermediate", cols: 16, rows: 16, mines: 40 },
] as const;

type DifficultyKey = (typeof DIFFICULTIES)[number]["key"];

const Minesweeper = () => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const gameRef = useRef<MinesweeperGame | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const flagModeRef = useRef(false);
  const [difficulty, setDifficulty] = useState<DifficultyKey>("beginner");
  const preset = DIFFICULTIES.find((d) => d.key === difficulty)!;
  const [minesRemaining, setMinesRemaining] = useState<number>(preset.mines);
  const [elapsed, setElapsed] = useState(0);
  const [flagMode, setFlagMode] = useState(false);
  const [outcome, setOutcome] = useState<"won" | "lost" | null>(null);

  const stopTimer = useCallback(() => {
    if (timerRef.current === null) return;
    clearInterval(timerRef.current);
    timerRef.current = null;
  }, []);

  const startTimer = useCallback(() => {
    stopTimer();
    timerRef.current = setInterval(() => setElapsed((s) => s + 1), 1000);
  }, [stopTimer]);

  useEffect(() => {
    if (!canvasRef.current) return;
    const game = new MinesweeperGame(canvasRef.current, {
      cols: preset.cols,
      rows: preset.rows,
      mines: preset.mines,
      onStart: startTimer,
      onFlags: setMinesRemaining,
      onGameOver: (status) => {
        stopTimer();
        setOutcome(status);
      },
    });
    game.setFlagMode(flagModeRef.current);
    gameRef.current = game;
    stopTimer();
    setElapsed(0);
    setOutcome(null);
    setMinesRemaining(preset.mines);
    return () => {
      stopTimer();
      game.destroy();
      gameRef.current = null;
    };
  }, [preset, startTimer, stopTimer]);

  useIonViewDidEnter(() => {
    if (gameRef.current?.engine.status === "playing") startTimer();
  });

  useIonViewWillLeave(() => {
    stopTimer();
  });

  const restart = () => {
    stopTimer();
    setElapsed(0);
    setOutcome(null);
    gameRef.current?.restart();
  };

  const toggleFlagMode = () => {
    flagModeRef.current = !flagModeRef.current;
    setFlagMode(flagModeRef.current);
    gameRef.current?.setFlagMode(flagModeRef.current);
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
        <div className="minesweeper-page">
          <IonSegment
            className="minesweeper-segment"
            value={difficulty}
            onIonChange={(event) => setDifficulty(event.detail.value as DifficultyKey)}
          >
            {DIFFICULTIES.map((d) => (
              <IonSegmentButton key={d.key} value={d.key}>
                <IonLabel>{d.label}</IonLabel>
              </IonSegmentButton>
            ))}
          </IonSegment>
          <div
            className="minesweeper-board"
            style={{ aspectRatio: `${preset.cols} / ${preset.rows}` }}
          >
            <canvas ref={canvasRef} />
            {outcome && (
              <div className="minesweeper-overlay">
                <IonText className="minesweeper-overlay-title">
                  {outcome === "won" ? "You Win!" : "Game Over"}
                </IonText>
                <IonButton onClick={restart}>Play Again</IonButton>
              </div>
            )}
          </div>
          <div className="minesweeper-status">
            <IonText className="minesweeper-count">Mines: {minesRemaining}</IonText>
            <IonButton
              className="minesweeper-flag-toggle"
              fill={flagMode ? "solid" : "outline"}
              aria-label="Toggle flag mode"
              aria-pressed={flagMode}
              onClick={toggleFlagMode}
            >
              <IonIcon icon={flag} />
            </IonButton>
            <IonText className="minesweeper-count">Time: {elapsed}</IonText>
          </div>
          <IonText color="medium" className="minesweeper-hint">
            Tap to reveal · long-press or right-click to flag
          </IonText>
        </div>
      </IonContent>
    </IonPage>
  );
};

export default Minesweeper;

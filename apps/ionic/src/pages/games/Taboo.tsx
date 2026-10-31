import {
  IonBackButton,
  IonButton,
  IonButtons,
  IonContent,
  IonHeader,
  IonIcon,
  IonPage,
  IonProgressBar,
  IonText,
  IonToolbar,
  useIonViewDidEnter,
  useIonViewWillLeave,
} from "@ionic/react";
import { checkmark, close, play } from "ionicons/icons";
import { useEffect, useMemo, useRef, useState } from "react";
import { TabooCardStore, TabooGame, type TabooCard } from "games";

import "./Taboo.css";

const HIGH_SCORE_KEY = "taboo:high-score";
const ROUND_MS = 60_000;

const Taboo = () => {
  const store = useMemo(() => new TabooCardStore(), []);
  const gameRef = useRef<TabooGame | null>(null);
  const [cardCount, setCardCount] = useState(() => store.listCards().length);
  const [phase, setPhase] = useState<"idle" | "playing" | "over">("idle");
  const [card, setCard] = useState<TabooCard | null>(null);
  const [score, setScore] = useState(0);
  const [remainingMs, setRemainingMs] = useState(ROUND_MS);
  const [highScore, setHighScore] = useState(
    () => Number(localStorage.getItem(HIGH_SCORE_KEY)) || 0,
  );

  useEffect(() => {
    localStorage.setItem(HIGH_SCORE_KEY, String(highScore));
  }, [highScore]);

  useEffect(() => {
    return () => {
      gameRef.current?.destroy();
      gameRef.current = null;
    };
  }, []);

  useIonViewDidEnter(() => {
    setCardCount(store.listCards().length);
    gameRef.current?.resume();
  });

  useIonViewWillLeave(() => {
    gameRef.current?.pause();
  });

  const startRound = () => {
    const cards = store.listCards();
    if (cards.length === 0) return;
    gameRef.current?.destroy();
    const game = new TabooGame({
      cards,
      roundMs: ROUND_MS,
      onCard: setCard,
      onScore: setScore,
      onTick: setRemainingMs,
      onRoundEnd: (finalScore) => {
        setPhase("over");
        setHighScore((best) => Math.max(best, finalScore));
      },
    });
    gameRef.current = game;
    setPhase("playing");
    game.startRound();
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
        <div className="taboo-page">
          {phase === "playing" ? (
            <>
              <div className="taboo-status">
                <IonText className="taboo-timer">{Math.ceil(remainingMs / 1000)}s</IonText>
                <IonProgressBar value={remainingMs / ROUND_MS} />
                <IonText className="taboo-round-score">{score}</IonText>
              </div>
              {card && (
                <div className="taboo-card">
                  <IonText className="taboo-card-word">{card.word}</IonText>
                  <div className="taboo-card-forbidden">
                    <IonText color="medium" className="taboo-card-label">
                      TABOO
                    </IonText>
                    <div className="taboo-card-words">
                      {card.taboo.map((taboo) => (
                        <span key={taboo} className="taboo-card-taboo">
                          {taboo}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              )}
              <div className="taboo-actions">
                <IonButton size="large" color="danger" onClick={() => gameRef.current?.skip()}>
                  <IonIcon slot="start" icon={close} />
                  Taboo
                </IonButton>
                <IonButton size="large" color="success" onClick={() => gameRef.current?.correct()}>
                  <IonIcon slot="start" icon={checkmark} />
                  Got It
                </IonButton>
              </div>
              <IonButton fill="clear" size="small" onClick={() => gameRef.current?.endRound()}>
                End Round
              </IonButton>
            </>
          ) : (
            <div className="taboo-menu">
              {phase === "over" && (
                <>
                  <IonText className="taboo-result">Round Over</IonText>
                  <IonText className="taboo-result-score">
                    Score: {score} · Best: {highScore}
                  </IonText>
                </>
              )}
              <IonText color="medium" className="taboo-hint">
                Get your team to say the word without saying any of the taboo words.
              </IonText>
              {cardCount === 0 ? (
                <>
                  <IonText color="medium" className="taboo-hint">
                    You need cards to play. Create your own or import a shared deck.
                  </IonText>
                  <IonButton routerLink="/games/taboo/cards">Create Cards</IonButton>
                </>
              ) : (
                <>
                  <IonText color="medium" className="taboo-hint">
                    {cardCount} {cardCount === 1 ? "card" : "cards"} · 60 second rounds
                  </IonText>
                  <IonButton size="large" onClick={startRound}>
                    <IonIcon slot="start" icon={play} />
                    {phase === "over" ? "Play Again" : "Start Round"}
                  </IonButton>
                  <IonButton fill="outline" routerLink="/games/taboo/cards">
                    Manage Cards
                  </IonButton>
                </>
              )}
            </div>
          )}
        </div>
      </IonContent>
    </IonPage>
  );
};

export default Taboo;

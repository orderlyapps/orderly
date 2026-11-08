import {
  IonBackButton,
  IonButton,
  IonButtons,
  IonChip,
  IonContent,
  IonHeader,
  IonIcon,
  IonLabel,
  IonPage,
  IonProgressBar,
  IonText,
  IonToolbar,
  useIonViewDidEnter,
} from "@ionic/react";
import { arrowForward, checkmark, link, play } from "ionicons/icons";
import { useMemo, useRef, useState } from "react";
import {
  MultipleChoiceEngine,
  MultipleChoiceStore,
  type MultipleChoiceAttempt,
  type MultipleChoiceQuestion,
  type MultipleChoiceRound,
} from "games";

import DifficultyStars from "../../components/DifficultyStars";
import "./MultipleChoice.css";

const MultipleChoice = () => {
  const store = useMemo(() => new MultipleChoiceStore(), []);
  const engineRef = useRef<MultipleChoiceEngine | null>(null);
  const [questions, setQuestions] = useState<MultipleChoiceQuestion[]>(() => store.listQuestions());
  const [tags, setTags] = useState<string[]>(() => store.listTags());
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [phase, setPhase] = useState<"menu" | "playing" | "over">("menu");
  const [round, setRound] = useState<MultipleChoiceRound | null>(null);
  const [picked, setPicked] = useState<number | null>(null);
  const [score, setScore] = useState(0);
  const [position, setPosition] = useState(0);
  const [total, setTotal] = useState(0);
  const [attempts, setAttempts] = useState<MultipleChoiceAttempt[]>([]);

  useIonViewDidEnter(() => {
    const allTags = store.listTags();
    setTags(allTags);
    setSelectedTags((selected) => selected.filter((tag) => allTags.some((entry) => entry === tag)));
    setQuestions(store.listQuestions());
  });

  const filteredQuestions =
    selectedTags.length === 0
      ? questions
      : questions.filter((question) => question.tags.some((tag) => selectedTags.includes(tag)));

  const toggleTag = (tag: string) => {
    setSelectedTags((selected) =>
      selected.includes(tag) ? selected.filter((entry) => entry !== tag) : [...selected, tag],
    );
  };

  const startQuiz = () => {
    const engine = new MultipleChoiceEngine({ questions, tags: selectedTags });
    if (engine.total === 0) return;
    engineRef.current = engine;
    setTotal(engine.total);
    setScore(0);
    setPosition(1);
    setPicked(null);
    setAttempts([]);
    setRound(engine.current);
    setPhase("playing");
  };

  const pick = (index: number) => {
    const engine = engineRef.current;
    if (!engine || picked !== null) return;
    if (engine.answer(index) === null) return;
    setPicked(index);
    setScore(engine.score);
  };

  const next = () => {
    const engine = engineRef.current;
    if (!engine) return;
    const nextRound = engine.advance();
    if (!nextRound) {
      setAttempts(engine.attempts);
      setRound(null);
      setPhase("over");
      return;
    }
    setRound(nextRound);
    setPosition(engine.position + 1);
    setPicked(null);
  };

  const answerColor = (index: number): string | undefined => {
    if (picked === null || !round) return undefined;
    if (round.answers[index]?.correct) return "success";
    return index === picked ? "danger" : "medium";
  };

  const missed = attempts.filter((attempt) => !attempt.correct);
  const lastRound = position === total;

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
        <div className="mc-page">
          {phase === "playing" && round ? (
            <>
              <div className="mc-status">
                <IonText className="mc-position">
                  {position}/{total}
                </IonText>
                <IonProgressBar value={position / total} />
                <IonText className="mc-score">{score}</IonText>
              </div>
              <div className="mc-card">
                <div className="mc-meta">
                  <DifficultyStars value={round.question.difficulty} />
                  {round.question.tags.map((tag) => (
                    <span key={tag} className="mc-tag">
                      {tag}
                    </span>
                  ))}
                </div>
                <IonText className="mc-prompt">{round.question.prompt}</IonText>
              </div>
              <div className="mc-answers">
                {round.answers.map((answer, index) => (
                  <IonButton
                    key={answer.text}
                    expand="block"
                    color={answerColor(index)}
                    disabled={picked !== null}
                    onClick={() => pick(index)}
                  >
                    {picked !== null && answer.correct && <IonIcon slot="start" icon={checkmark} />}
                    {answer.text}
                  </IonButton>
                ))}
              </div>
              {picked !== null && (
                <>
                  {round.question.references.length > 0 && (
                    <div className="mc-references">
                      <IonText color="medium" className="mc-references-label">
                        REFERENCES
                      </IonText>
                      {round.question.references.map((reference) => (
                        <a
                          key={reference}
                          className="mc-reference"
                          href={reference}
                          target="_blank"
                          rel="noreferrer"
                        >
                          <IonIcon aria-hidden="true" icon={link} />
                          {reference}
                        </a>
                      ))}
                    </div>
                  )}
                  <IonButton onClick={next}>
                    <IonIcon slot="end" icon={arrowForward} />
                    {lastRound ? "See Results" : "Next"}
                  </IonButton>
                </>
              )}
            </>
          ) : (
            <div className="mc-menu">
              {phase === "over" && (
                <>
                  <IonText className="mc-result">Quiz Complete</IonText>
                  <IonText className="mc-result-score">
                    Score: {score} / {total}
                  </IonText>
                  {missed.length > 0 && (
                    <div className="mc-review">
                      <IonText color="medium" className="mc-review-label">
                        REVIEW
                      </IonText>
                      {missed.map((attempt) => (
                        <div key={attempt.question.id} className="mc-review-item">
                          <IonText className="mc-review-prompt">{attempt.question.prompt}</IonText>
                          <IonText color="medium" className="mc-review-answer">
                            Answer:{" "}
                            {attempt.question.answers.find((answer) => answer.correct)?.text}
                          </IonText>
                          {attempt.question.references.map((reference) => (
                            <a
                              key={reference}
                              className="mc-reference"
                              href={reference}
                              target="_blank"
                              rel="noreferrer"
                            >
                              <IonIcon aria-hidden="true" icon={link} />
                              {reference}
                            </a>
                          ))}
                        </div>
                      ))}
                    </div>
                  )}
                </>
              )}
              <IonText color="medium" className="mc-hint">
                Pick the right answer for each question. Create your own questions, tag them, and
                rate their difficulty.
              </IonText>
              {questions.length === 0 ? (
                <>
                  <IonText color="medium" className="mc-hint">
                    You need questions to play. Create your first question to get started.
                  </IonText>
                  <IonButton routerLink="/games/multiple-choice/questions">
                    Create Questions
                  </IonButton>
                </>
              ) : (
                <>
                  <IonText color="medium" className="mc-hint">
                    {filteredQuestions.length}{" "}
                    {filteredQuestions.length === 1 ? "question" : "questions"}
                    {selectedTags.length > 0 && ` tagged ${selectedTags.join(", ")}`}
                  </IonText>
                  {tags.length > 0 && (
                    <div className="mc-tag-filter">
                      {tags.map((tag) => (
                        <IonChip
                          key={tag}
                          color="primary"
                          outline={!selectedTags.includes(tag)}
                          onClick={() => toggleTag(tag)}
                        >
                          <IonLabel>{tag}</IonLabel>
                        </IonChip>
                      ))}
                    </div>
                  )}
                  <IonButton
                    size="large"
                    disabled={filteredQuestions.length === 0}
                    onClick={startQuiz}
                  >
                    <IonIcon slot="start" icon={play} />
                    {phase === "over" ? "Play Again" : "Start Quiz"}
                  </IonButton>
                  <IonButton fill="outline" routerLink="/games/multiple-choice/questions">
                    Manage Questions
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

export default MultipleChoice;

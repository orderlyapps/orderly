import { useCallback, useMemo, useRef, useState, type Dispatch, type SetStateAction } from "react";

import {
  IonAlert,
  IonBackButton,
  IonButton,
  IonButtons,
  IonChip,
  IonContent,
  IonHeader,
  IonIcon,
  IonInput,
  IonItem,
  IonLabel,
  IonList,
  IonListHeader,
  IonPage,
  IonRadio,
  IonRadioGroup,
  IonSegment,
  IonSegmentButton,
  IonTextarea,
  IonTitle,
  IonToast,
  IonToolbar,
} from "@ionic/react";
import { add, checkmark, close, pencil, trash } from "ionicons/icons";
import {
  MULTIPLE_CHOICE_DEFAULT_DIFFICULTY,
  MultipleChoiceStore,
  normalizeMultipleChoiceTags,
  type MultipleChoiceQuestion,
} from "games";

import DifficultyStars from "../../../components/DifficultyStars";
import "./Questions.css";

interface TextEntry {
  id: number;
  value: string;
}

const Questions = () => {
  const store = useMemo(() => new MultipleChoiceStore(), []);
  const contentRef = useRef<HTMLIonContentElement | null>(null);
  const nextEntryId = useRef(1);
  const focusNewEntry = useRef(false);
  const [questions, setQuestions] = useState(() => store.listQuestions());
  const [allTags, setAllTags] = useState(() => store.listTags());
  const [editingId, setEditingId] = useState<string | null>(null);
  const [prompt, setPrompt] = useState("");
  const [answers, setAnswers] = useState<TextEntry[]>(() => [
    { id: nextEntryId.current++, value: "" },
    { id: nextEntryId.current++, value: "" },
  ]);
  const [correctAnswerId, setCorrectAnswerId] = useState<number | null>(null);
  const [references, setReferences] = useState<TextEntry[]>([]);
  const [questionTags, setQuestionTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState("");
  const [difficulty, setDifficulty] = useState(MULTIPLE_CHOICE_DEFAULT_DIFFICULTY);
  const [filterTag, setFilterTag] = useState<string | null>(null);
  const [pendingDelete, setPendingDelete] = useState<MultipleChoiceQuestion | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const lastAnswerRef = useCallback((element: HTMLIonInputElement | null) => {
    if (element && focusNewEntry.current) {
      focusNewEntry.current = false;
      void element.setFocus();
    }
  }, []);

  const refresh = (updated: MultipleChoiceQuestion[]) => {
    setQuestions(updated);
    const tags = store.listTags();
    setAllTags(tags);
    setFilterTag((current) => (current !== null && !tags.includes(current) ? null : current));
  };

  const setEntry = (setter: Dispatch<SetStateAction<TextEntry[]>>, id: number, value: string) => {
    setter((entries) => entries.map((entry) => (entry.id === id ? { ...entry, value } : entry)));
  };

  const addEntry = (setter: Dispatch<SetStateAction<TextEntry[]>>) => {
    focusNewEntry.current = true;
    const id = nextEntryId.current++;
    setter((entries) => [...entries, { id, value: "" }]);
  };

  const removeEntry = (
    setter: Dispatch<SetStateAction<TextEntry[]>>,
    id: number,
    minimum: number,
  ) => {
    setter((entries) =>
      entries.length > minimum ? entries.filter((entry) => entry.id !== id) : entries,
    );
  };

  const resetForm = () => {
    setEditingId(null);
    setPrompt("");
    setAnswers([
      { id: nextEntryId.current++, value: "" },
      { id: nextEntryId.current++, value: "" },
    ]);
    setCorrectAnswerId(null);
    setReferences([]);
    setQuestionTags([]);
    setTagInput("");
    setDifficulty(MULTIPLE_CHOICE_DEFAULT_DIFFICULTY);
  };

  const startEdit = (question: MultipleChoiceQuestion) => {
    setEditingId(question.id);
    setPrompt(question.prompt);
    const entries = question.answers.map((answer) => ({
      id: nextEntryId.current++,
      value: answer.text,
      correct: answer.correct,
    }));
    setAnswers(entries.map(({ id, value }) => ({ id, value })));
    setCorrectAnswerId(entries.find((entry) => entry.correct)?.id ?? null);
    setReferences(question.references.map((value) => ({ id: nextEntryId.current++, value })));
    setQuestionTags(question.tags);
    setTagInput("");
    setDifficulty(question.difficulty);
    void contentRef.current?.scrollToTop(300);
  };

  const addTag = (raw: string) => {
    const merged = normalizeMultipleChoiceTags([...questionTags, raw]);
    setQuestionTags(merged);
    setTagInput("");
  };

  const removeTag = (tag: string) => {
    setQuestionTags((tags) => tags.filter((entry) => entry !== tag));
  };

  const saveQuestion = () => {
    try {
      const input = {
        prompt,
        answers: answers.map((entry) => ({
          text: entry.value,
          correct: entry.id === correctAnswerId,
        })),
        references: references.map((entry) => entry.value),
        tags: questionTags,
        difficulty,
      };
      const updated =
        editingId === null ? store.saveQuestion(input) : store.updateQuestion(editingId, input);
      refresh(updated);
      resetForm();
      setToast(editingId === null ? "Question saved" : "Question updated");
    } catch (error) {
      setToast(error instanceof Error ? error.message : "Could not save question");
    }
  };

  const removeQuestion = (question: MultipleChoiceQuestion) => {
    refresh(store.removeQuestion(question.id));
    if (editingId === question.id) resetForm();
    setToast("Question deleted");
  };

  const tagSuggestions = allTags.filter((tag) => !questionTags.includes(tag));
  const visibleQuestions =
    filterTag === null
      ? questions
      : questions.filter((question) => question.tags.includes(filterTag));

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonButtons slot="start">
            <IonBackButton defaultHref="/games/multiple-choice" text="" />
          </IonButtons>
        </IonToolbar>
      </IonHeader>
      <IonContent ref={contentRef} fullscreen>
        <IonHeader collapse="condense">
          <IonToolbar>
            <IonTitle size="large">Questions</IonTitle>
          </IonToolbar>
        </IonHeader>

        <IonList inset>
          <IonListHeader>
            <IonLabel>{editingId === null ? "New Question" : "Edit Question"}</IonLabel>
          </IonListHeader>
          <IonItem>
            <IonTextarea
              label="Question"
              labelPlacement="stacked"
              placeholder="e.g. What is the capital of France?"
              autoGrow
              value={prompt}
              onIonInput={(event) => setPrompt(event.detail.value ?? "")}
            />
          </IonItem>
        </IonList>

        <IonList inset>
          <IonListHeader>
            <IonLabel>Answers (select the correct one)</IonLabel>
          </IonListHeader>
          <IonRadioGroup
            value={correctAnswerId === null ? undefined : String(correctAnswerId)}
            onIonChange={(event) => setCorrectAnswerId(Number(event.detail.value))}
          >
            {answers.map((answer, index) => (
              <IonItem key={answer.id}>
                <IonRadio
                  slot="start"
                  value={String(answer.id)}
                  aria-label={`Mark answer ${index + 1} as correct`}
                />
                <IonInput
                  ref={index === answers.length - 1 ? lastAnswerRef : undefined}
                  label={`Answer ${index + 1}`}
                  labelPlacement="stacked"
                  placeholder="e.g. Paris"
                  value={answer.value}
                  onIonInput={(event) => setEntry(setAnswers, answer.id, event.detail.value ?? "")}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" && index === answers.length - 1) {
                      addEntry(setAnswers);
                    }
                  }}
                />
                {answers.length > 2 && (
                  <IonButton
                    fill="clear"
                    slot="end"
                    aria-label={`Remove answer ${index + 1}`}
                    onClick={() => removeEntry(setAnswers, answer.id, 2)}
                  >
                    <IonIcon icon={close} />
                  </IonButton>
                )}
              </IonItem>
            ))}
          </IonRadioGroup>
          <IonItem lines="none">
            <IonButton fill="clear" size="small" onClick={() => addEntry(setAnswers)}>
              <IonIcon slot="start" icon={add} />
              Add Answer
            </IonButton>
          </IonItem>
        </IonList>

        <IonList inset>
          <IonListHeader>
            <IonLabel>References</IonLabel>
          </IonListHeader>
          {references.map((reference, index) => (
            <IonItem key={reference.id}>
              <IonInput
                label={`Reference link ${index + 1}`}
                labelPlacement="stacked"
                placeholder="https://…"
                inputmode="url"
                value={reference.value}
                onIonInput={(event) =>
                  setEntry(setReferences, reference.id, event.detail.value ?? "")
                }
              />
              <IonButton
                fill="clear"
                slot="end"
                aria-label={`Remove reference ${index + 1}`}
                onClick={() => removeEntry(setReferences, reference.id, 0)}
              >
                <IonIcon icon={close} />
              </IonButton>
            </IonItem>
          ))}
          <IonItem lines="none">
            <IonButton fill="clear" size="small" onClick={() => addEntry(setReferences)}>
              <IonIcon slot="start" icon={add} />
              Add Reference Link
            </IonButton>
          </IonItem>
        </IonList>

        <IonList inset>
          <IonListHeader>
            <IonLabel>Tags</IonLabel>
          </IonListHeader>
          {questionTags.length > 0 && (
            <IonItem lines="none" className="mc-chip-row">
              {questionTags.map((tag) => (
                <IonChip key={tag} onClick={() => removeTag(tag)}>
                  <IonLabel>{tag}</IonLabel>
                  <IonIcon aria-hidden="true" icon={close} />
                </IonChip>
              ))}
            </IonItem>
          )}
          <IonItem>
            <IonInput
              label="New tag"
              labelPlacement="stacked"
              placeholder="e.g. Geography"
              value={tagInput}
              onIonInput={(event) => setTagInput(event.detail.value ?? "")}
              onKeyDown={(event) => {
                if (event.key === "Enter") addTag(tagInput);
              }}
            />
            <IonButton
              fill="clear"
              slot="end"
              disabled={!tagInput.trim()}
              onClick={() => addTag(tagInput)}
            >
              <IonIcon icon={add} />
            </IonButton>
          </IonItem>
          {tagSuggestions.length > 0 && (
            <IonItem lines="none" className="mc-chip-row">
              {tagSuggestions.map((tag) => (
                <IonChip key={tag} outline color="primary" onClick={() => addTag(tag)}>
                  <IonLabel>{tag}</IonLabel>
                </IonChip>
              ))}
            </IonItem>
          )}
        </IonList>

        <IonList inset>
          <IonListHeader>
            <IonLabel>Difficulty</IonLabel>
          </IonListHeader>
          <IonItem lines="none">
            <IonSegment
              value={String(difficulty)}
              onIonChange={(event) => setDifficulty(Number(event.detail.value))}
            >
              {[1, 2, 3, 4, 5].map((value) => (
                <IonSegmentButton key={value} value={String(value)}>
                  <IonLabel>{value}</IonLabel>
                </IonSegmentButton>
              ))}
            </IonSegment>
          </IonItem>
          <IonItem lines="none">
            {editingId !== null && (
              <IonButton fill="clear" slot="start" onClick={resetForm}>
                Cancel
              </IonButton>
            )}
            <IonButton slot="end" onClick={saveQuestion}>
              <IonIcon slot="start" icon={editingId === null ? add : checkmark} />
              {editingId === null ? "Add Question" : "Save Changes"}
            </IonButton>
          </IonItem>
        </IonList>

        <IonList inset>
          <IonListHeader>
            <IonLabel>
              Your Questions ({filterTag === null ? questions.length : visibleQuestions.length})
            </IonLabel>
          </IonListHeader>
          {allTags.length > 0 && (
            <IonItem lines="none" className="mc-chip-row">
              <IonChip
                color="primary"
                outline={filterTag !== null}
                onClick={() => setFilterTag(null)}
              >
                <IonLabel>All</IonLabel>
              </IonChip>
              {allTags.map((tag) => (
                <IonChip
                  key={tag}
                  color="primary"
                  outline={filterTag !== tag}
                  onClick={() => setFilterTag(tag)}
                >
                  <IonLabel>{tag}</IonLabel>
                </IonChip>
              ))}
            </IonItem>
          )}
          {questions.length === 0 && (
            <IonItem lines="none">
              <IonLabel color="medium">No questions yet — add one above.</IonLabel>
            </IonItem>
          )}
          {questions.length > 0 && visibleQuestions.length === 0 && (
            <IonItem lines="none">
              <IonLabel color="medium">No questions tagged "{filterTag}".</IonLabel>
            </IonItem>
          )}
          {visibleQuestions.map((question) => (
            <IonItem key={question.id}>
              <IonLabel className="mc-question-label">
                <h3>{question.prompt}</h3>
                <p>
                  {question.answers.length} answers · {question.references.length} references
                  {question.tags.length > 0 && ` · ${question.tags.join(", ")}`}
                </p>
                <DifficultyStars value={question.difficulty} />
              </IonLabel>
              <IonButton
                fill="clear"
                slot="end"
                aria-label={`Edit ${question.prompt}`}
                onClick={() => startEdit(question)}
              >
                <IonIcon icon={pencil} />
              </IonButton>
              <IonButton
                fill="clear"
                slot="end"
                aria-label={`Delete ${question.prompt}`}
                onClick={() => setPendingDelete(question)}
              >
                <IonIcon icon={trash} />
              </IonButton>
            </IonItem>
          ))}
        </IonList>

        <IonAlert
          isOpen={pendingDelete !== null}
          header="Delete question?"
          message={
            pendingDelete ? `"${pendingDelete.prompt}" will be permanently removed.` : undefined
          }
          buttons={[
            { text: "Cancel", role: "cancel" },
            {
              text: "Delete",
              role: "destructive",
              handler: () => {
                if (pendingDelete) removeQuestion(pendingDelete);
              },
            },
          ]}
          onDidDismiss={() => setPendingDelete(null)}
        />

        <IonToast
          isOpen={toast !== null}
          message={toast ?? ""}
          duration={2000}
          onDidDismiss={() => setToast(null)}
        />
      </IonContent>
    </IonPage>
  );
};

export default Questions;

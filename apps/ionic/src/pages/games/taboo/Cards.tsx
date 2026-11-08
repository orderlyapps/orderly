import { type ChangeEvent, useCallback, useMemo, useRef, useState } from "react";

import {
  IonAlert,
  IonBackButton,
  IonButton,
  IonButtons,
  IonContent,
  IonHeader,
  IonIcon,
  IonInput,
  IonItem,
  IonLabel,
  IonList,
  IonListHeader,
  IonPage,
  IonTitle,
  IonToast,
  IonToolbar,
} from "@ionic/react";
import {
  add,
  checkmark,
  clipboard,
  close,
  cloudUpload,
  copy,
  download,
  pencil,
  trash,
} from "ionicons/icons";
import {
  downloadTabooDeck,
  parseTabooDeck,
  readTabooDeckFile,
  serializeTabooDeck,
  TabooCardStore,
  type TabooCard,
} from "games";

const Cards = () => {
  const store = useMemo(() => new TabooCardStore(), []);
  const contentRef = useRef<HTMLIonContentElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [cards, setCards] = useState(() => store.listCards());
  const [word, setWord] = useState("");
  const [editingWord, setEditingWord] = useState<string | null>(null);
  const nextTabooWordId = useRef(1);
  const focusNewTabooWord = useRef(false);
  const [tabooWords, setTabooWords] = useState<{ id: number; value: string }[]>([
    { id: 0, value: "" },
  ]);
  const [pasteAlertOpen, setPasteAlertOpen] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const lastTabooWordRef = useCallback((element: HTMLIonInputElement | null) => {
    if (element && focusNewTabooWord.current) {
      focusNewTabooWord.current = false;
      void element.setFocus();
    }
  }, []);

  const setTabooWord = (id: number, value: string) => {
    setTabooWords((words) => words.map((entry) => (entry.id === id ? { ...entry, value } : entry)));
  };

  const addTabooWordInput = () => {
    focusNewTabooWord.current = true;
    const id = nextTabooWordId.current++;
    setTabooWords((words) => [...words, { id, value: "" }]);
  };

  const removeTabooWordInput = (id: number) => {
    setTabooWords((words) => (words.length > 1 ? words.filter((entry) => entry.id !== id) : words));
  };

  const resetForm = () => {
    setEditingWord(null);
    setWord("");
    setTabooWords([{ id: nextTabooWordId.current++, value: "" }]);
  };

  const startEdit = (card: TabooCard) => {
    setEditingWord(card.word);
    setWord(card.word);
    setTabooWords(card.taboo.map((value) => ({ id: nextTabooWordId.current++, value })));
    void contentRef.current?.scrollToTop(300);
  };

  const saveCard = () => {
    try {
      const values = tabooWords.map((entry) => entry.value);
      const updated =
        editingWord === null
          ? store.saveCard(word, values)
          : store.updateCard(editingWord, word, values);
      setCards(updated);
      resetForm();
      setToast(editingWord === null ? "Card saved" : "Card updated");
    } catch (error) {
      setToast(error instanceof Error ? error.message : "Could not save card");
    }
  };

  const removeCard = (cardWord: string) => {
    setCards(store.removeCard(cardWord));
    if (editingWord?.toLowerCase() === cardWord.toLowerCase()) resetForm();
    setToast(`Removed "${cardWord}"`);
  };

  const handleExport = () => {
    try {
      downloadTabooDeck(store.exportDeck());
      setToast("Deck exported");
    } catch (error) {
      setToast(error instanceof Error ? error.message : "Export failed");
    }
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(serializeTabooDeck(store.exportDeck()));
      setToast("Deck JSON copied to clipboard");
    } catch (error) {
      setToast(error instanceof Error ? error.message : "Could not copy deck");
    }
  };

  const handleFileSelected = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    try {
      const deck = await readTabooDeckFile(file);
      const updated = store.importDeck(deck);
      setCards(updated);
      setToast(`Imported ${deck.cards.length} cards from "${deck.name}"`);
    } catch (error) {
      setToast(error instanceof Error ? error.message : "Import failed");
    }
  };

  const importPastedDeck = (text: string | undefined): boolean => {
    try {
      const deck = parseTabooDeck(text ?? "");
      const updated = store.importDeck(deck);
      setCards(updated);
      setToast(`Imported ${deck.cards.length} cards from "${deck.name}"`);
      return true;
    } catch (error) {
      setToast(error instanceof Error ? error.message : "Import failed");
      return false;
    }
  };

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonButtons slot="start">
            <IonBackButton defaultHref="/games/taboo" text="" />
          </IonButtons>
        </IonToolbar>
      </IonHeader>
      <IonContent ref={contentRef} fullscreen>
        <IonHeader collapse="condense">
          <IonToolbar>
            <IonTitle size="large">Cards</IonTitle>
          </IonToolbar>
        </IonHeader>

        <IonList inset>
          <IonListHeader>
            <IonLabel>{editingWord === null ? "New Card" : `Edit "${editingWord}"`}</IonLabel>
          </IonListHeader>
          <IonItem>
            <IonInput
              label="Word"
              labelPlacement="stacked"
              placeholder="e.g. Birthday"
              value={word}
              onIonInput={(event) => setWord(event.detail.value ?? "")}
            />
          </IonItem>
          {tabooWords.map((tabooWord, index) => (
            <IonItem key={tabooWord.id}>
              <IonInput
                ref={index === tabooWords.length - 1 ? lastTabooWordRef : undefined}
                label={`Taboo word ${index + 1}`}
                labelPlacement="stacked"
                placeholder="e.g. Party"
                value={tabooWord.value}
                onIonInput={(event) => setTabooWord(tabooWord.id, event.detail.value ?? "")}
                onKeyDown={(event) => {
                  if (event.key === "Enter" && index === tabooWords.length - 1) {
                    addTabooWordInput();
                  }
                }}
              />
              {tabooWords.length > 1 && (
                <IonButton
                  fill="clear"
                  slot="end"
                  aria-label={`Remove taboo word ${index + 1}`}
                  onClick={() => removeTabooWordInput(tabooWord.id)}
                >
                  <IonIcon icon={close} />
                </IonButton>
              )}
            </IonItem>
          ))}
          <IonItem lines="none">
            <IonButton fill="clear" size="small" onClick={addTabooWordInput}>
              <IonIcon slot="start" icon={add} />
              Add Taboo Word
            </IonButton>
          </IonItem>
          <IonItem lines="none">
            {editingWord !== null && (
              <IonButton fill="clear" slot="start" onClick={resetForm}>
                Cancel
              </IonButton>
            )}
            <IonButton slot="end" onClick={saveCard}>
              <IonIcon slot="start" icon={editingWord === null ? add : checkmark} />
              {editingWord === null ? "Add Card" : "Save Changes"}
            </IonButton>
          </IonItem>
        </IonList>

        <IonList inset>
          <IonListHeader>
            <IonLabel>Your Cards ({cards.length})</IonLabel>
          </IonListHeader>
          {cards.length === 0 && (
            <IonItem lines="none">
              <IonLabel color="medium">No cards yet — add one above or import a deck.</IonLabel>
            </IonItem>
          )}
          {cards.map((card) => (
            <IonItem key={card.word}>
              <IonLabel>
                <h3>{card.word}</h3>
                <p>{card.taboo.join(" · ")}</p>
              </IonLabel>
              <IonButton
                fill="clear"
                slot="end"
                aria-label={`Edit ${card.word}`}
                onClick={() => startEdit(card)}
              >
                <IonIcon icon={pencil} />
              </IonButton>
              <IonButton
                fill="clear"
                slot="end"
                aria-label={`Delete ${card.word}`}
                onClick={() => setPendingDelete(card.word)}
              >
                <IonIcon icon={trash} />
              </IonButton>
            </IonItem>
          ))}
        </IonList>

        <IonList inset>
          <IonListHeader>
            <IonLabel>Share</IonLabel>
          </IonListHeader>
          <IonItem button detail={false} disabled={cards.length === 0} onClick={handleExport}>
            <IonIcon icon={download} slot="start" />
            <IonLabel color="primary">Export Deck File</IonLabel>
          </IonItem>
          <IonItem
            button
            detail={false}
            disabled={cards.length === 0}
            onClick={() => {
              void handleCopy();
            }}
          >
            <IonIcon icon={copy} slot="start" />
            <IonLabel color="primary">Copy Deck JSON</IonLabel>
          </IonItem>
          <IonItem button detail={false} onClick={() => fileInputRef.current?.click()}>
            <IonIcon icon={cloudUpload} slot="start" />
            <IonLabel color="primary">Import Deck File</IonLabel>
          </IonItem>
          <IonItem button detail={false} onClick={() => setPasteAlertOpen(true)}>
            <IonIcon icon={clipboard} slot="start" />
            <IonLabel color="primary">Paste Deck JSON</IonLabel>
          </IonItem>
        </IonList>

        <input
          ref={fileInputRef}
          type="file"
          accept=".json,application/json"
          style={{ display: "none" }}
          onChange={(event) => {
            void handleFileSelected(event);
          }}
        />

        <IonAlert
          isOpen={pasteAlertOpen}
          header="Paste Deck JSON"
          inputs={[
            {
              name: "deck",
              type: "textarea",
              placeholder: '{ "format": "ionic-taboo", "cards": [ … ] }',
            },
          ]}
          buttons={[
            { text: "Cancel", role: "cancel" },
            {
              text: "Import",
              handler: (data: { deck?: string }) => importPastedDeck(data.deck),
            },
          ]}
          onDidDismiss={() => setPasteAlertOpen(false)}
        />

        <IonAlert
          isOpen={pendingDelete !== null}
          header={pendingDelete ? `Delete "${pendingDelete}"?` : "Delete card?"}
          message="This card will be permanently removed from your deck."
          buttons={[
            { text: "Cancel", role: "cancel" },
            {
              text: "Delete",
              role: "destructive",
              handler: () => {
                if (pendingDelete) removeCard(pendingDelete);
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

export default Cards;

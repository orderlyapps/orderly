import { useEffect, useRef, useState } from "react";

import {
  IonButton,
  IonButtons,
  IonContent,
  IonHeader,
  IonInput,
  IonItem,
  IonLabel,
  IonList,
  IonListHeader,
  IonModal,
  IonNote,
  IonTitle,
  IonToolbar,
} from "@ionic/react";

import { getPublisherDisplayName, type Publisher } from "./schema.ts";

export interface PublisherNameInput {
  first_name: string;
  middle_name: string;
  last_name: string;
  display_name: string;
}

export interface PublisherNameModalProps {
  isOpen: boolean;
  /** The publisher whose name is being edited, or null while none is loaded. */
  publisher: Publisher | null;
  /** Persists the name; the modal stays open and shows the error if it rejects. */
  onSave: (input: PublisherNameInput) => Promise<void>;
  onDismiss: () => void;
}

function draftFromPublisher(publisher: Publisher | null): PublisherNameInput {
  return {
    first_name: publisher?.first_name ?? "",
    middle_name: publisher?.middle_name ?? "",
    last_name: publisher?.last_name ?? "",
    display_name: publisher?.display_name ?? "",
  };
}

function isDraftValid(draft: PublisherNameInput): boolean {
  return draft.first_name.trim().length > 0 && draft.last_name.trim().length > 0;
}

/** Edits the shared name fields (first, middle, last and display name) of a publisher. */
export function PublisherNameModal({
  isOpen,
  publisher,
  onSave,
  onDismiss,
}: PublisherNameModalProps) {
  const [draft, setDraft] = useState<PublisherNameInput>(() => draftFromPublisher(publisher));
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  // Render from the last non-null publisher — `publisher` goes null the moment
  // the parent starts dismissing, which would blank the header mid-animation.
  const lastPublisher = useRef<Publisher | null>(null);
  if (publisher) lastPublisher.current = publisher;
  const displayPublisher = publisher ?? lastPublisher.current;

  // Seed the draft only when the modal opens so in-progress edits aren't wiped.
  const wasOpen = useRef(false);
  useEffect(() => {
    const opened = isOpen && !wasOpen.current;
    wasOpen.current = isOpen;
    if (opened) {
      setDraft(draftFromPublisher(publisher));
      setSaving(false);
      setSaveError(null);
    }
  }, [isOpen]);

  const update = (patch: Partial<PublisherNameInput>) =>
    setDraft((current) => ({ ...current, ...patch }));

  const onIonInput =
    (key: keyof PublisherNameInput) => (event: CustomEvent<{ value?: string | null }>) =>
      update({ [key]: event.detail.value ?? "" });

  async function handleSave() {
    if (!publisher) return;
    setSaving(true);
    setSaveError(null);
    try {
      await onSave({
        first_name: draft.first_name.trim(),
        middle_name: draft.middle_name.trim(),
        last_name: draft.last_name.trim(),
        display_name: draft.display_name.trim(),
      });
      onDismiss();
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : "Couldn't save the publisher's name.");
      setSaving(false);
    }
  }

  return (
    <IonModal isOpen={isOpen} onDidDismiss={onDismiss}>
      <IonHeader>
        <IonToolbar>
          <IonTitle>Edit Name</IonTitle>
          <IonButtons slot="start">
            <IonButton onClick={onDismiss} disabled={saving}>
              Cancel
            </IonButton>
          </IonButtons>
          <IonButtons slot="end">
            <IonButton
              onClick={() => void handleSave()}
              disabled={saving || !publisher || !isDraftValid(draft)}
            >
              {saving ? "Saving…" : "Save"}
            </IonButton>
          </IonButtons>
        </IonToolbar>
      </IonHeader>
      <IonContent>
        <IonList>
          {displayPublisher && (
            <IonListHeader>
              <IonLabel>
                <IonNote>{getPublisherDisplayName(displayPublisher)}</IonNote>
              </IonLabel>
            </IonListHeader>
          )}
          <IonItem>
            <IonInput
              label="First name"
              value={draft.first_name}
              onIonInput={onIonInput("first_name")}
            />
          </IonItem>
          <IonItem>
            <IonInput
              label="Middle name (optional)"
              value={draft.middle_name}
              onIonInput={onIonInput("middle_name")}
            />
          </IonItem>
          <IonItem>
            <IonInput
              label="Last name"
              value={draft.last_name}
              onIonInput={onIonInput("last_name")}
            />
          </IonItem>
          <IonItem>
            <IonInput
              label="Display name (optional)"
              placeholder="Shown instead of first name"
              value={draft.display_name}
              onIonInput={onIonInput("display_name")}
            />
          </IonItem>
          {saveError != null && (
            <IonItem lines="none">
              <IonNote color="danger">{saveError}</IonNote>
            </IonItem>
          )}
        </IonList>
      </IonContent>
    </IonModal>
  );
}

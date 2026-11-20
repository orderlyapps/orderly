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
  IonToggle,
  IonToolbar,
} from "@ionic/react";

import { monthLabel } from "../../util/month.ts";
import { CREDIT_HOUR_FIELDS, type CreditHours, type Report } from "./schema.ts";

/** Editable report fields — everything except the report's key columns. */
export interface ReportDraft {
  active: boolean;
  hours: number | null;
  bible_studies: number | null;
  credit_hours: CreditHours | null;
  aux_pio: boolean;
  reg_pio: boolean;
  spe_pio: boolean;
  reported_elsewhere: boolean;
}

export interface ReportEditModalProps {
  isOpen: boolean;
  monthId: string;
  /** The month's existing report, or null when saving creates one. */
  report: Report | null;
  /** Shown in the list header so the editor knows whose report this is. */
  publisherName?: string;
  /** Persists the draft; the modal stays open and shows the error if it rejects. */
  onSave: (draft: ReportDraft) => Promise<void>;
  onDismiss: () => void;
}

function draftFrom(report: Report | null): ReportDraft {
  return {
    active: report?.active ?? false,
    hours: report?.hours ?? null,
    bible_studies: report?.bible_studies ?? null,
    credit_hours: report?.credit_hours ?? null,
    aux_pio: report?.aux_pio ?? false,
    reg_pio: report?.reg_pio ?? false,
    spe_pio: report?.spe_pio ?? false,
    reported_elsewhere: report?.reported_elsewhere ?? false,
  };
}

// hours and bible_studies are smallint columns — whole numbers 0–32767 only.
function parseCount(value: string | null | undefined): number | null {
  if (value == null || value.trim() === "") {
    return null;
  }
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    return null;
  }
  return Math.min(Math.max(Math.trunc(parsed), 0), 32767);
}

/** Edits a publisher's report for one service month — or files a new one. */
export function ReportEditModal({
  isOpen,
  monthId,
  report,
  publisherName,
  onSave,
  onDismiss,
}: ReportEditModalProps) {
  const [draft, setDraft] = useState<ReportDraft>(() => draftFrom(report));
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  // Seed the draft only when the modal opens — a refetched `report` identity
  // mid-edit must not wipe in-progress changes.
  const wasOpen = useRef(false);
  useEffect(() => {
    const opened = isOpen && !wasOpen.current;
    wasOpen.current = isOpen;
    if (opened) {
      setDraft(draftFrom(report));
      setSaving(false);
      setSaveError(null);
    }
  }, [isOpen, report]);

  const update = (patch: Partial<ReportDraft>) => setDraft((current) => ({ ...current, ...patch }));

  const updateCredit = (key: string, raw: string | null | undefined) =>
    setDraft((current) => {
      const next = { ...current.credit_hours };
      const parsed = parseCount(raw);
      if (parsed == null) {
        delete next[key];
      } else {
        next[key] = parsed;
      }
      return { ...current, credit_hours: Object.keys(next).length > 0 ? next : null };
    });

  async function handleSave() {
    setSaving(true);
    setSaveError(null);
    try {
      await onSave(draft);
      onDismiss();
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : "Couldn't save the report.");
      setSaving(false);
    }
  }

  return (
    <IonModal isOpen={isOpen} onDidDismiss={onDismiss}>
      <IonHeader>
        <IonToolbar>
          <IonTitle>{monthLabel(monthId)}</IonTitle>
          <IonButtons slot="start">
            <IonButton onClick={onDismiss} disabled={saving}>
              Cancel
            </IonButton>
          </IonButtons>
          <IonButtons slot="end">
            <IonButton onClick={() => void handleSave()} disabled={saving}>
              {saving ? "Saving…" : "Save"}
            </IonButton>
          </IonButtons>
        </IonToolbar>
      </IonHeader>
      <IonContent>
        <IonList>
          {publisherName != null && (
            <IonListHeader>
              <IonLabel>
                <IonNote>
                  {publisherName}
                  {report == null ? " · no report on file" : ""}
                </IonNote>
              </IonLabel>
            </IonListHeader>
          )}
          <IonItem>
            <IonToggle
              checked={draft.active}
              onIonChange={(event) => update({ active: event.detail.checked })}
            >
              Shared in ministry
            </IonToggle>
          </IonItem>
          <IonItem>
            <IonInput
              label="Hours"
              type="number"
              inputmode="numeric"
              min={0}
              value={draft.hours ?? ""}
              onIonInput={(event) => update({ hours: parseCount(event.detail.value) })}
            />
          </IonItem>
          <IonItem>
            <IonInput
              label="Bible Studies"
              type="number"
              inputmode="numeric"
              min={0}
              value={draft.bible_studies ?? ""}
              onIonInput={(event) => update({ bible_studies: parseCount(event.detail.value) })}
            />
          </IonItem>
          <IonListHeader>
            <IonLabel>
              <IonNote>Hour credits</IonNote>
            </IonLabel>
          </IonListHeader>
          {CREDIT_HOUR_FIELDS.map(({ key, label }) => (
            <IonItem key={key}>
              <IonInput
                label={label}
                type="number"
                inputmode="numeric"
                min={0}
                value={draft.credit_hours?.[key] ?? ""}
                onIonInput={(event) => updateCredit(key, event.detail.value)}
              />
            </IonItem>
          ))}
          <IonItem>
            <IonToggle
              checked={draft.aux_pio}
              onIonChange={(event) => update({ aux_pio: event.detail.checked })}
            >
              Auxiliary pioneer
            </IonToggle>
          </IonItem>
          <IonItem>
            <IonToggle
              checked={draft.reg_pio}
              onIonChange={(event) => update({ reg_pio: event.detail.checked })}
            >
              Regular pioneer
            </IonToggle>
          </IonItem>
          <IonItem>
            <IonToggle
              checked={draft.spe_pio}
              onIonChange={(event) => update({ spe_pio: event.detail.checked })}
            >
              Special pioneer
            </IonToggle>
          </IonItem>
          <IonItem>
            <IonToggle
              checked={draft.reported_elsewhere}
              onIonChange={(event) => update({ reported_elsewhere: event.detail.checked })}
            >
              Reported elsewhere
            </IonToggle>
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

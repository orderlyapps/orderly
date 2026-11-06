import { useState } from "react";

import {
  IonButton,
  IonButtons,
  IonContent,
  IonDatetime,
  IonHeader,
  IonIcon,
  IonModal,
  IonTitle,
  IonToolbar,
} from "@ionic/react";
import {
  calendarClearOutline,
  chevronBackOutline,
  chevronDownOutline,
  chevronForwardOutline,
} from "ionicons/icons";

import { mondayOf, formatWeekId, shiftWeekId, weekIdOf } from "../../util/week.ts";

export interface WeekNavigatorProps {
  weekId: string;
  label: string;
  relativeLabel?: string;
  onSelectWeek?: (weekId: string) => void;
}

export function WeekNavigator({ weekId, label, relativeLabel, onSelectWeek }: WeekNavigatorProps) {
  const [pickerOpen, setPickerOpen] = useState(false);

  const selectWeek = (nextWeekId: string) => {
    setPickerOpen(false);
    if (nextWeekId !== weekId) {
      onSelectWeek?.(nextWeekId);
    }
  };

  const handleDateChange = (value: string | string[] | null | undefined) => {
    const raw = Array.isArray(value) ? value[0] : value;
    if (!raw) {
      return;
    }
    const date = new Date(`${raw.slice(0, 10)}T00:00:00`);
    if (Number.isNaN(date.getTime())) {
      return;
    }
    selectWeek(formatWeekId(mondayOf(date)));
  };

  const interactive = Boolean(onSelectWeek);

  return (
    <>
      <div
        style={{
          position: "sticky",
          top: 0,
          zIndex: 10,
          display: "flex",
          alignItems: "center",
          padding: "4px 6px",
          background: "color-mix(in srgb, var(--ion-background-color, #fff) 80%, transparent)",
          backdropFilter: "blur(16px) saturate(1.6)",
          WebkitBackdropFilter: "blur(16px) saturate(1.6)",
          borderBottom: "0.5px solid var(--ion-item-border-color, rgba(0, 0, 0, 0.1))",
        }}
      >
        <IonButton
          fill="clear"
          size="small"
          aria-label="Previous week"
          disabled={!interactive}
          onClick={() => onSelectWeek?.(shiftWeekId(weekId, -1))}
          style={{ "--padding-start": "4px", "--padding-end": "4px" }}
        >
          <IonIcon slot="icon-only" icon={chevronBackOutline} />
        </IonButton>
        <button
          type="button"
          onClick={() => interactive && setPickerOpen(true)}
          style={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 1,
            padding: "8px 0",
            border: 0,
            background: "none",
            color: "inherit",
            font: "inherit",
            cursor: interactive ? "pointer" : "default",
          }}
        >
          <span
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 5,
              fontWeight: 600,
              fontSize: 15,
            }}
          >
            {label}
            {interactive && (
              <IonIcon icon={chevronDownOutline} style={{ fontSize: 11, opacity: 0.55 }} />
            )}
          </span>
          {relativeLabel && (
            <span style={{ fontSize: 11, color: "var(--ion-color-primary)", fontWeight: 500 }}>
              {relativeLabel}
            </span>
          )}
        </button>
        <IonButton
          fill="clear"
          size="small"
          aria-label="Next week"
          disabled={!interactive}
          onClick={() => onSelectWeek?.(shiftWeekId(weekId, 1))}
          style={{ "--padding-start": "4px", "--padding-end": "4px" }}
        >
          <IonIcon slot="icon-only" icon={chevronForwardOutline} />
        </IonButton>
      </div>

      <IonModal
        isOpen={pickerOpen}
        onDidDismiss={() => setPickerOpen(false)}
        breakpoints={[0, 0.7]}
        initialBreakpoint={0.7}
        handleBehavior="cycle"
      >
        <IonHeader>
          <IonToolbar>
            <IonTitle>Select Week</IonTitle>
            <IonButtons slot="end">
              <IonButton onClick={() => setPickerOpen(false)}>Close</IonButton>
            </IonButtons>
          </IonToolbar>
        </IonHeader>
        <IonContent>
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              padding: "8px 16px 24px",
            }}
          >
            <IonDatetime
              presentation="date"
              firstDayOfWeek={1}
              value={weekId}
              onIonChange={(event) => handleDateChange(event.detail.value)}
            />
            <IonButton fill="clear" onClick={() => selectWeek(weekIdOf(new Date()))}>
              <IonIcon slot="start" icon={calendarClearOutline} />
              Jump to This Week
            </IonButton>
          </div>
        </IonContent>
      </IonModal>
    </>
  );
}

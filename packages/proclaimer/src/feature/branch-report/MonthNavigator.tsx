import { useState } from "react";

import {
  IonButton,
  IonButtons,
  IonContent,
  IonHeader,
  IonIcon,
  IonItem,
  IonLabel,
  IonList,
  IonModal,
  IonTitle,
  IonToolbar,
} from "@ionic/react";
import {
  checkmark,
  chevronBackOutline,
  chevronDownOutline,
  chevronForwardOutline,
} from "ionicons/icons";

import { monthLabel, previousMonthId, previousMonthIds, shiftMonthId } from "../../util/month.ts";

const MONTH_LIST_COUNT = 24;

export interface MonthNavigatorProps {
  monthId: string;
  label: string;
  relativeLabel?: string;
  /** Latest selectable month; forward navigation and the month list stop here. */
  latestMonthId?: string;
  onSelectMonth?: (monthId: string) => void;
}

export function MonthNavigator({
  monthId,
  label,
  relativeLabel,
  latestMonthId,
  onSelectMonth,
}: MonthNavigatorProps) {
  const [pickerOpen, setPickerOpen] = useState(false);
  const latest = latestMonthId ?? previousMonthId();
  const months = latestMonthId
    ? Array.from({ length: MONTH_LIST_COUNT }, (_, index) => shiftMonthId(latestMonthId, -index))
    : previousMonthIds(MONTH_LIST_COUNT);
  const earliest = months[months.length - 1];

  const selectMonth = (nextMonthId: string) => {
    setPickerOpen(false);
    if (nextMonthId !== monthId) {
      onSelectMonth?.(nextMonthId);
    }
  };

  const interactive = Boolean(onSelectMonth);

  return (
    <>
      <div
        style={{
          position: "sticky",
          top: 0,
          zIndex: 10,
          display: "flex",
          alignItems: "center",
          minHeight: 64,
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
          aria-label="Previous month"
          disabled={!interactive || monthId <= earliest}
          onClick={() => onSelectMonth?.(shiftMonthId(monthId, -1))}
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
            padding: "10px 0",
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
          aria-label="Next month"
          disabled={!interactive || monthId >= latest}
          onClick={() => onSelectMonth?.(shiftMonthId(monthId, 1))}
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
        expandToScroll={false}
      >
        <IonHeader>
          <IonToolbar>
            <IonTitle>Select Month</IonTitle>
            <IonButtons slot="end">
              <IonButton onClick={() => setPickerOpen(false)}>Close</IonButton>
            </IonButtons>
          </IonToolbar>
        </IonHeader>
        <IonContent>
          <IonList>
            {months.map((id) => (
              <IonItem key={id} button detail={false} onClick={() => selectMonth(id)}>
                <IonLabel>{monthLabel(id)}</IonLabel>
                {id === monthId && <IonIcon slot="end" icon={checkmark} />}
              </IonItem>
            ))}
          </IonList>
          <div style={{ paddingBottom: 128 }} />
        </IonContent>
      </IonModal>
    </>
  );
}

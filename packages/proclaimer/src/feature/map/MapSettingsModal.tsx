import { useMemo } from "react";

import {
  IonButton,
  IonButtons,
  IonContent,
  IonHeader,
  IonItem,
  IonList,
  IonModal,
  IonSelect,
  IonSelectOption,
  IonTitle,
  IonToolbar,
} from "@ionic/react";

import { useSettings } from "../settings/hooks.ts";
import { isNotAtHomeVisibility } from "../settings/schema.ts";
import { NOT_AT_HOME_STALE_DAY_CHOICES } from "./not-at-homes/schema.ts";

export interface MapSettingsModalProps {
  isOpen: boolean;
  onDidDismiss: () => void;
}

const STALE_DAY_OPTIONS: { label: string; value: number }[] = NOT_AT_HOME_STALE_DAY_CHOICES.map(
  (days) => ({
    label: days === 0 ? "Never" : `${days} ${days === 1 ? "day" : "days"}`,
    value: days,
  }),
);

const VISIBILITY_OPTIONS = [
  { label: "Show All", value: "all" },
  { label: "Hide Old", value: "hide_old" },
  { label: "Hide New", value: "hide_new" },
] as const;

export function MapSettingsModal({ isOpen, onDidDismiss }: MapSettingsModalProps) {
  const { settings, setSetting } = useSettings();

  // Imported settings may hold a value outside the preset choices; surface it
  // so the select never renders an empty selection.
  const staleDayOptions = useMemo(() => {
    const options = [...STALE_DAY_OPTIONS];
    const current = settings.notAtHomeStaleDays;
    if (!(NOT_AT_HOME_STALE_DAY_CHOICES as readonly number[]).includes(current)) {
      options.push({ label: `${current} ${current === 1 ? "day" : "days"}`, value: current });
      options.sort((a, b) => a.value - b.value);
    }
    return options;
  }, [settings.notAtHomeStaleDays]);

  return (
    <IonModal isOpen={isOpen} onDidDismiss={onDidDismiss}>
      <IonHeader>
        <IonToolbar>
          <IonTitle>Map Settings</IonTitle>
          <IonButtons slot="end">
            <IonButton onClick={onDidDismiss}>Close</IonButton>
          </IonButtons>
        </IonToolbar>
      </IonHeader>
      <IonContent>
        <IonList>
          <IonItem>
            <IonSelect
              label="Mark Not At Homes Purple After"
              value={settings.notAtHomeStaleDays}
              interface="popover"
              onIonChange={(event) => {
                const value = event.detail.value;
                if (typeof value !== "number") {
                  return;
                }
                void setSetting("notAtHomeStaleDays", value).catch((error: unknown) => {
                  console.warn("Failed to persist not-at-home stale days", error);
                });
              }}
            >
              {staleDayOptions.map((option) => (
                <IonSelectOption key={option.value} value={option.value}>
                  {option.label}
                </IonSelectOption>
              ))}
            </IonSelect>
          </IonItem>
          <IonItem>
            <IonSelect
              label="Hide Not At Homes"
              value={settings.notAtHomeVisibility}
              interface="popover"
              onIonChange={(event) => {
                const value = event.detail.value;
                if (!isNotAtHomeVisibility(value)) {
                  return;
                }
                void setSetting("notAtHomeVisibility", value).catch((error: unknown) => {
                  console.warn("Failed to persist not-at-home visibility", error);
                });
              }}
            >
              {VISIBILITY_OPTIONS.map((option) => (
                <IonSelectOption key={option.value} value={option.value}>
                  {option.label}
                </IonSelectOption>
              ))}
            </IonSelect>
          </IonItem>
        </IonList>
      </IonContent>
    </IonModal>
  );
}

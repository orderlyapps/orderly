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
import {
  isMapEditColorScheme,
  isNotAtHomeVisibility,
  RECENT_MAP_COUNT_CHOICES,
  type MapEditColorScheme,
} from "../settings/schema.ts";
import { NOT_AT_HOME_STALE_DAY_CHOICES } from "./not-at-homes/schema.ts";

export interface MapSettingsModalProps {
  isOpen: boolean;
  onDidDismiss: () => void;
  showEditColorScheme?: boolean;
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

const EDIT_COLOR_SCHEME_OPTIONS = [
  { label: "Single Color", value: "standard" },
  { label: "Multicolored", value: "multicolored" },
] as const;

const RECENT_COUNT_OPTIONS = RECENT_MAP_COUNT_CHOICES.map((count) => ({
  label: count === 0 ? "None" : `${count} ${count === 1 ? "map" : "maps"}`,
  value: count,
}));

interface MapEditColorSchemeSelectProps {
  visible: boolean;
  value: MapEditColorScheme;
  onChange: (value: MapEditColorScheme) => void;
}

export function MapEditColorSchemeSelect({
  visible,
  value,
  onChange,
}: MapEditColorSchemeSelectProps) {
  if (!visible) {
    return null;
  }

  return (
    <IonItem>
      <IonSelect
        label="Edit Mode Map Colors"
        value={value}
        interface="popover"
        onIonChange={(event) => {
          const nextValue = event.detail.value;
          if (!isMapEditColorScheme(nextValue)) {
            return;
          }
          onChange(nextValue);
        }}
      >
        {EDIT_COLOR_SCHEME_OPTIONS.map((option) => (
          <IonSelectOption key={option.value} value={option.value}>
            {option.label}
          </IonSelectOption>
        ))}
      </IonSelect>
    </IonItem>
  );
}

export function MapSettingsModal({
  isOpen,
  onDidDismiss,
  showEditColorScheme = false,
}: MapSettingsModalProps) {
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
              label="Recent Maps Shown"
              value={settings.recentMapCount}
              interface="popover"
              onIonChange={(event) => {
                const value = event.detail.value;
                if (typeof value !== "number") {
                  return;
                }
                void setSetting("recentMapCount", value).catch((error: unknown) => {
                  console.warn("Failed to persist recent map count", error);
                });
              }}
            >
              {RECENT_COUNT_OPTIONS.map((option) => (
                <IonSelectOption key={option.value} value={option.value}>
                  {option.label}
                </IonSelectOption>
              ))}
            </IonSelect>
          </IonItem>
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
          <MapEditColorSchemeSelect
            visible={showEditColorScheme}
            value={settings.mapEditColorScheme}
            onChange={(value) => {
              void setSetting("mapEditColorScheme", value).catch((error: unknown) => {
                console.warn("Failed to persist map edit color scheme", error);
              });
            }}
          />
        </IonList>
      </IonContent>
    </IonModal>
  );
}

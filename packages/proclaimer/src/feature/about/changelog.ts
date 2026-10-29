export interface ChangelogEntry {
  version: string;
  date: string;
  changes: string[];
}

export const CHANGELOG: ChangelogEntry[] = [
  {
    version: "0.1.0",
    date: "2026-10-29",
    changes: [
      "Ministry: interactive map, plus letter writing and schedule pages",
      "Schedules: midweek, weekend, cleaning, and events pages",
      "Publishers section",
      "Settings: appearance and data export/import",
      "About page showing the app version and changelog",
    ],
  },
];

export const APP_VERSION = CHANGELOG[0]?.version ?? "0.0.0";

declare const __APP_BUILD_ID__: string | undefined;

export const BUILD_ID = typeof __APP_BUILD_ID__ === "string" ? __APP_BUILD_ID__ : undefined;

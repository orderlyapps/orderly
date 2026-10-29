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
      "Games: play Snake",
      "Settings: appearance and data export/import",
      "About page showing the app version and changelog",
    ],
  },
];

export const APP_VERSION = CHANGELOG[0]?.version ?? "0.0.0";

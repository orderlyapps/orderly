import changelog from "./changelog.json" with { type: "json" };

export interface ChangelogEntry {
  version: string;
  date: string;
  changes: string[];
}

export const CHANGELOG: ChangelogEntry[] = changelog;

export const APP_VERSION = CHANGELOG[0]?.version ?? "0.0.0";

declare const __APP_BUILD_ID__: string | undefined;

export const BUILD_ID = typeof __APP_BUILD_ID__ === "string" ? __APP_BUILD_ID__ : undefined;

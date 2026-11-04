import { z } from "zod";

import changelog from "./changelog.json" with { type: "json" };

export const changelogEntrySchema = z.object({
  version: z.string().min(1),
  date: z.iso.date(),
  changes: z.array(z.string()),
});

export type ChangelogEntry = z.infer<typeof changelogEntrySchema>;

export const CHANGELOG: ChangelogEntry[] = z.array(changelogEntrySchema).parse(changelog);

export const APP_VERSION = CHANGELOG[0]?.version ?? "0.0.0";

declare const __APP_BUILD_ID__: string | undefined;

export const BUILD_ID = typeof __APP_BUILD_ID__ === "string" ? __APP_BUILD_ID__ : undefined;

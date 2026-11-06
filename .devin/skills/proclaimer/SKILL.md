---
name: proclaimer
description: Work on the proclaimer app in this repo. Use when the user wants to make changes, fixes, or additions to proclaimer.
---

# Proclaimer

Proclaimer is an Ionic + React app deployed to Cloudflare Workers. When the user asks for changes to proclaimer, the work happens in two places:

- `apps/proclaimer` — the app shell: pages (`src/pages`), components (`src/components`), theme (`src/theme`), PWA config, and `wrangler.jsonc`.
- `packages/proclaimer` — the `proclaimer-core` workspace package: feature logic in `src/feature/<domain>` (about, auth, backend, cleaning, congregation, event, map, meeting, midweek-meeting, onboarding, publisher, settings, weekend-meeting) and utilities in `src/util`. Tests live in `packages/proclaimer/tests` mirroring the feature names.

## Commands

Run from the repo root:

- Dev server: `pnpm --dir apps/proclaimer dev` — builds `proclaimer-core`, then serves on port 4240 and rebuilds the package on change.
- Build / typecheck: `pnpm --dir apps/proclaimer build`
- Tests: `pnpm --dir packages/proclaimer test` (`vp test`)
- Lint/format/typecheck: `vp check` (repo-wide, per AGENTS.md)
- Deploy: use the `deploy-proclaimer` or `deploy-proclaimer-preview` skills.

## Conventions

- Feature code belongs in `proclaimer-core`, not the app shell — `apps/proclaimer` wires it up via the `proclaimer-core` dependency and re-exports from `packages/proclaimer/src/index.ts`.
- Each page gets its own file under `src/pages/`, with child pages nested in folders matching the parent route (per AGENTS.md).
- After changing `proclaimer-core`, the app must rebuild the package — `dev` and `build` scripts handle this via `vp run proclaimer-core#build`; a watch plugin also rebuilds it automatically during `vp dev`.

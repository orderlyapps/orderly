---
name: subbie
description: Work on the subbie app in this repo. Use when the user wants to make changes, fixes, or additions to subbie.
---

# Subbie

Subbie is an Ionic + React invoicing app deployed to Cloudflare Workers as `orderly-subbie`. When the user asks for changes to subbie, the work happens in two places:

- `apps/subbie` — the app shell: pages (`src/pages`), components (`src/components`), theme (`src/theme`), PWA config, and `wrangler.jsonc`.
- `packages/subbie` — the `subbie-core` workspace package: feature logic in `src/feature/<domain>` (about, banking, customers, invoices, items, onboarding, settings) and shared helpers in `src/shared`. Tests live in `packages/subbie/tests` mirroring the feature names.

## Commands

Run from the repo root:

- Dev server: `pnpm --dir apps/subbie dev` — builds `subbie-core`, then serves on port 4230 and rebuilds the package on change.
- Build / typecheck: `pnpm --dir apps/subbie build`
- Tests: `pnpm --dir packages/subbie test` (`vp test`)
- Lint/format/typecheck: `vp check` (repo-wide, per AGENTS.md)
- Deploy: use the `deploy-subbie` or `deploy-subbie-preview` skills.

## Conventions

- Feature code belongs in `subbie-core`, not the app shell — `apps/subbie` wires it up via the `subbie-core` dependency and re-exports from `packages/subbie/src/index.ts`.
- Each page gets its own file under `src/pages/`, with child pages nested in folders matching the parent route (per AGENTS.md).
- After changing `subbie-core`, the app must rebuild the package — `dev` and `build` scripts handle this via `vp run subbie-core#build`; a watch plugin also rebuilds it automatically during `vp dev`.

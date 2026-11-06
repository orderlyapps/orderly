---
name: ionic
description: Work on the ionic app in this repo. Use when the user wants to make changes, fixes, or additions to the ionic app.
---

# Ionic

The ionic app is an Ionic + React games app deployed to Cloudflare Workers as `orderly-ionic`. When the user asks for changes to it, the work happens in up to three places:

- `apps/ionic` — the app shell: pages (`src/pages`, including Games and Snake), components (`src/components`), theme (`src/theme`), PWA config, and `wrangler.jsonc`.
- `packages/ionic` — the `ionic-core` workspace package: feature logic in `src/feature/<domain>` (about, settings). Tests live in `packages/ionic/tests`.
- `packages/games` — the `games` workspace package: game implementations in `src/<game>` (snake, taboo) with shared code in `src/shared`. Tests live in `packages/games/tests`.

## Commands

Run from the repo root:

- Dev server: `pnpm --dir apps/ionic dev` — builds `ionic-core`, then serves on port 4220. A watch plugin rebuilds `ionic-core` on change, but `games` is not watched — rerun `vp run games#build` after changing it.
- Build / typecheck: `pnpm --dir apps/ionic build` (builds `games`, then `ionic-core`, then `tsc` + `vp build`)
- Tests: `pnpm --dir packages/ionic test` and `pnpm --dir packages/games test` (`vp test`)
- Lint/format/typecheck: `vp check` (repo-wide, per AGENTS.md)
- Deploy: use the `deploy-ionic` or `deploy-ionic-preview` skills.

## Conventions

- Feature code belongs in `ionic-core` and game logic in `games`, not the app shell — `apps/ionic` wires them up via the `ionic-core` and `games` dependencies.
- Each page gets its own file under `src/pages/`, with child pages nested in folders matching the parent route (per AGENTS.md).
- The build order matters: `games` builds before `ionic-core` (`vp run games#build && vp run ionic-core#build`).

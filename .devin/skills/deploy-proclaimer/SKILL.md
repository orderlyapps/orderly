---
name: deploy-proclaimer
description: Build and deploy the proclaimer app to Cloudflare Workers. Use when the user wants to deploy proclaimer.
---

# Deploy Proclaimer

Deploys the proclaimer app (`apps/proclaimer`) to Cloudflare Workers as `orderly-proclaimer`.

## Steps

1. Update the version and changelog before deploying:

   - Find the commit that added the last changelog entry, then list every commit since:

     ```
     git log -1 --format=%H -- packages/proclaimer/src/feature/about/changelog.json
     git log --oneline <sha>..HEAD
     ```

   - From those commits, collect all user-facing changes relevant to proclaimer — new features, fixes, and visible improvements in `apps/proclaimer` or the workspace package it uses (`packages/proclaimer`). Use `git show <sha> --stat` to inspect ambiguous commits. Skip commits for other apps, chores, refactors, merges, and `Cascade snapshot` commits.
   - Bump `version` in `apps/proclaimer/package.json` using semantic versioning (patch for fixes, minor for new features, major for breaking changes) based on the changes collected.
   - Add a matching entry at the top of `packages/proclaimer/src/feature/about/changelog.json` with the new version, today's date (`YYYY-MM-DD`), and a `changes` list with one concise user-facing bullet per change (group related commits into a single bullet). Keep entries newest-first; the first entry's version must equal the `package.json` version.

2. From the repo root, run the app's deploy script:

   ```
   pnpm --dir apps/proclaimer run deploy
   ```

   This builds `proclaimer-core`, runs `tsc`, builds the app with `vp build` (output in `apps/proclaimer/dist`), and runs `wrangler deploy`.

3. Verify the output reports `Deployed orderly-proclaimer triggers` and note the Version ID.

## Details

- Worker name: `orderly-proclaimer` (configured in `apps/proclaimer/wrangler.jsonc`)
- Deployed URL: https://orderly-proclaimer.orderlyapps.workers.dev
- Static assets are served from `dist/` with SPA fallback (`not_found_handling: single-page-application`)
- Requires Cloudflare auth (the user must already be logged in via wrangler); if `wrangler deploy` fails with an auth error, ask the user to run `wrangler login`

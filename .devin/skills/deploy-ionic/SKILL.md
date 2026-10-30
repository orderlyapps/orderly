---
name: deploy-ionic
description: Build and deploy the ionic app to Cloudflare Workers. Use when the user wants to deploy the ionic app.
---

# Deploy Ionic

Deploys the ionic app (`apps/ionic`) to Cloudflare Workers as `orderly-ionic`.

## Steps

1. Update the version and changelog before deploying:

   - Find the commit that added the last changelog entry, then list every commit since:

     ```
     git log -1 --format=%H -- packages/ionic/src/feature/about/changelog.json
     git log --oneline <sha>..HEAD
     ```

   - From those commits, collect all user-facing changes relevant to ionic — new features, fixes, and visible improvements in `apps/ionic` or the workspace packages it uses (`packages/ionic`, `packages/games`). Use `git show <sha> --stat` to inspect ambiguous commits. Skip commits for other apps, chores, refactors, merges, and `Cascade snapshot` commits.
   - Bump `version` in `apps/ionic/package.json` using semantic versioning (patch for fixes, minor for new features, major for breaking changes) based on the changes collected.
   - Add a matching entry at the top of `packages/ionic/src/feature/about/changelog.json` with the new version, today's date (`YYYY-MM-DD`), and a `changes` list with one concise user-facing bullet per change (group related commits into a single bullet). Keep entries newest-first; the first entry's version must equal the `package.json` version.

2. From the repo root, run the app's deploy script:

   ```
   pnpm --dir apps/ionic run deploy
   ```

   This builds `games` and `ionic-core`, runs `tsc`, builds the app with `vp build` (output in `apps/ionic/dist`), and runs `wrangler deploy`.

3. Verify the output reports `Deployed orderly-ionic triggers` and note the Version ID.

## Details

- Worker name: `orderly-ionic` (configured in `apps/ionic/wrangler.jsonc`)
- Deployed URL: https://orderly-ionic.orderlyapps.workers.dev
- Static assets are served from `dist/` with SPA fallback (`not_found_handling: single-page-application`)
- Requires Cloudflare auth (the user must already be logged in via wrangler); if `wrangler deploy` fails with an auth error, ask the user to run `wrangler login`

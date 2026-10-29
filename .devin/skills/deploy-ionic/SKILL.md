---
name: deploy-ionic
description: Build and deploy the ionic app to Cloudflare Workers. Use when the user wants to deploy the ionic app.
---

# Deploy Ionic

Deploys the ionic app (`apps/ionic`) to Cloudflare Workers as `orderly-ionic`.

## Steps

1. Update the version and changelog before deploying:

   - Bump `version` in `apps/ionic/package.json` using semantic versioning (patch for fixes, minor for new features, major for breaking changes).
   - Add a matching entry at the top of `CHANGELOG` in `packages/ionic/src/feature/about/changelog.ts` with the new version, today's date (`YYYY-MM-DD`), and a `changes` list summarising what shipped. Keep entries newest-first; the first entry's version must equal the `package.json` version.

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

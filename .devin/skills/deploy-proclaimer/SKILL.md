---
name: deploy-proclaimer
description: Build and deploy the proclaimer app to Cloudflare Workers. Use when the user wants to deploy proclaimer.
---

# Deploy Proclaimer

Deploys the proclaimer app (`apps/proclaimer`) to Cloudflare Workers as `orderly-proclaimer`.

## Steps

1. From the repo root, run the app's deploy script:

   ```
   pnpm --dir apps/proclaimer run deploy
   ```

   This builds `proclaimer-core`, runs `tsc`, builds the app with `vp build` (output in `apps/proclaimer/dist`), and runs `wrangler deploy`.

2. Verify the output reports `Deployed orderly-proclaimer triggers` and note the Version ID.

## Details

- Worker name: `orderly-proclaimer` (configured in `apps/proclaimer/wrangler.jsonc`)
- Deployed URL: https://orderly-proclaimer.orderlyapps.workers.dev
- Static assets are served from `dist/` with SPA fallback (`not_found_handling: single-page-application`)
- Requires Cloudflare auth (the user must already be logged in via wrangler); if `wrangler deploy` fails with an auth error, ask the user to run `wrangler login`

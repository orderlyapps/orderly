---
name: deploy-subbie
description: Build and deploy the subbie app to Cloudflare Workers. Use when the user wants to deploy subbie.
---

# Deploy Subbie

Deploys the subbie app (`apps/subbie`) to Cloudflare Workers as `orderly-subbie`.

## Steps

1. From the repo root, run the app's deploy script:

   ```
   pnpm --dir apps/subbie run deploy
   ```

   This builds `subbie-core`, runs `tsc`, builds the app with `vp build` (output in `apps/subbie/dist`), and runs `wrangler deploy`.

2. Verify the output reports `Deployed orderly-subbie triggers` and note the Version ID.

## Details

- Worker name: `orderly-subbie` (configured in `apps/subbie/wrangler.jsonc`)
- Deployed URL: https://orderly-subbie.orderlyapps.workers.dev
- Static assets are served from `dist/` with SPA fallback (`not_found_handling: single-page-application`)
- Requires Cloudflare auth (the user must already be logged in via wrangler); if `wrangler deploy` fails with an auth error, ask the user to run `wrangler login`

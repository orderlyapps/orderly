---
name: deploy-proclaimer-preview
description: Build and deploy the proclaimer app to a Cloudflare Workers branch preview. Use when the user wants to deploy proclaimer to a preview to check a feature they are working on.
---

# Deploy Proclaimer Preview

Deploys the proclaimer app (`apps/proclaimer`) to a Workers Preview named `preview` under `orderly-proclaimer`. Production is not touched. Unlike `deploy-proclaimer`, this does not bump the version or changelog.

## Steps

1. From the repo root, run the app's preview deploy script:

   ```
   pnpm --dir apps/proclaimer run deploy:preview
   ```

   This builds `proclaimer-core`, runs `tsc`, builds the app with `vp build` (stamping the build as `preview`), and runs `wrangler preview`.

2. Report the Preview URL from the output (`https://preview-orderly-proclaimer.orderlyapps.workers.dev`). Every `deploy:preview` redeploys this same URL, so the user can bookmark it; the output also prints a unique per-deployment URL.

3. Tell the user to check the build stamp on the app's About page (`preview · branch@commit · time UTC`) to confirm which build is running — the app is a PWA, so an installed copy may need a reload or reopen to pick up the new deployment.

## Details

- The Preview name is fixed to `preview` — one shared preview per app that each deploy overwrites. For a branch-scoped preview instead, run `wrangler preview --name <branch>` in `apps/proclaimer` after building.
- `wrangler preview` requires the (empty) `"previews": {}` block that is already in `apps/proclaimer/wrangler.jsonc`.
- Preview URLs are public.
- Requires Cloudflare auth (the user must already be logged in via wrangler); if `wrangler preview` fails with an auth error, ask the user to run `wrangler login`

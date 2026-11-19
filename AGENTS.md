<!--VITE PLUS START-->

# Using Vite+, the Unified Toolchain for the Web

This project is using Vite+, a unified toolchain built on top of Vite, Rolldown, Vitest, tsdown, Oxlint, Oxfmt, and Vite Task. Vite+ wraps runtime management, package management, and frontend tooling in a single global CLI called `vp`. Vite+ is distinct from Vite, and it invokes Vite through `vp dev` and `vp build`. Run `vp help` to print a list of commands and `vp <command> --help` for information about a specific command.

Docs are local at `node_modules/vite-plus/docs` or online at https://viteplus.dev/guide/.

## Built-in Commands vs Scripts

`vp <name>` runs a built-in command. `vp run <name>` runs a `package.json` script or a `vite.config.ts` task. Scripts cannot overwrite built-ins, so `vp dev` and `vp run dev` may do different things. Check `package.json` and `vite.config.ts` first, and run `vp run <name>` when the project defines a script or task with that name.

## Tool Versions

Run `vp toolchain` to show versions and relationships in the active Vite+
release. Add a tool name to select part of the graph. For example, run
`vp toolchain vite`. Use `--global` to ignore the local `vite-plus` package. Use
`vp why <package>` to show the package-manager dependency graph.

## Review Checklist

- [ ] Run `vp install` after pulling remote changes and before getting started.
- [ ] Run `vp check` and `vp test` to format, lint, type check and test changes.
- [ ] Check if there are `vite.config.ts` tasks or `package.json` scripts necessary for validation, run via `vp run <script>`.
- [ ] If setup, runtime, or package-manager behavior looks wrong, run `vp env doctor` and include its output when asking for help.

<!--VITE PLUS END-->

## Page Structure

- Each page must be in its own file under `src/pages/`.
- Nest child pages in child folders matching the parent route (e.g., `src/pages/Banking.tsx` for `/banking`, and `src/pages/banking/Statements.tsx` for `/banking/statements`).

## Local Supabase (proclaimer)

The `packages/proclaimer/supabase/` directory is linked to the remote `orderly-apps` project and holds `config.toml` plus migrations. Requires Docker running. Run `supabase` commands from `packages/proclaimer/` (or pass `--workdir packages/proclaimer` from the repo root).

- Start/stop the local stack: `supabase start` / `supabase stop`. Status and keys: `supabase status`.
- `apps/proclaimer/.env.local` overrides `.env` to point at the local API (`http://127.0.0.1:54321`). Delete it to use the remote project again.
- Studio: `http://127.0.0.1:54323`. Local mail (auth emails): `http://127.0.0.1:54324` (Mailpit).
- Pull remote schema changes: `SUPABASE_DB_PASSWORD=<pw> supabase db pull` (asks for the DB password, not the anon key). Apply new local migrations: `supabase db reset`.
- `supabase/seed.sql` is gitignored (it holds a real data dump — auth tokens, PII). Regenerate with `supabase db dump --linked --data-only -f supabase/seed.sql`; a missing seed on `db reset` only warns.
- Regenerate `packages/proclaimer/src/feature/backend/types.ts` (from repo root): `supabase gen types typescript --local --workdir packages/proclaimer > packages/proclaimer/src/feature/backend/types.ts`.

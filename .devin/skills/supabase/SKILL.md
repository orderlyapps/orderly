---
name: supabase
description: Work with the local Supabase stack for proclaimer — starting/stopping it, connecting the app, changing the schema, seeding data, and regenerating types. Use when the user asks about Supabase, the database, migrations, or local backend development.
---

# Supabase

Proclaimer's backend is Supabase. The project lives at `packages/proclaimer/supabase/` and is linked to the remote `orderly-apps` project (ref `xeagzahtpjviiklooglo`). Only proclaimer uses it — no other app in the monorepo.

## Running commands

- Requires Docker Desktop running.
- Run `supabase` commands from `packages/proclaimer/` (the dir containing `supabase/`), or pass `--workdir packages/proclaimer` from the repo root. Commands from the repo root without `--workdir` will not find the project (CLI v2).
- `supabase status` prints all local URLs and keys (`-o env` for machine-readable).

## Stack lifecycle

- Start: `supabase start` — applies `supabase/migrations/` and `supabase/seed.sql`.
- Stop: `supabase stop` (backs up data) / `supabase stop --no-backup`.
- Rebuild from scratch: `supabase db reset` — drops the DB, reapplies migrations, reseeds.

## Local endpoints

- API: `http://127.0.0.1:54321` — DB: `postgresql://postgres:postgres@127.0.0.1:54322/postgres`
- Studio: `http://127.0.0.1:54323` — Mailpit (auth emails): `http://127.0.0.1:54324`

## Connecting the app

- `apps/proclaimer/.env.local` overrides `.env` with `VITE_SUPABASE_URL=http://127.0.0.1:54321` and the local `VITE_SUPABASE_ANON_KEY` (get it from `supabase status`). Delete `.env.local` to point the app back at remote.
- The app reads `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY` in `apps/proclaimer/src/config.ts`; `proclaimer-core` initializes the client via `initSupabase` in `src/feature/backend/supabase.ts`.

## Schema changes

- Local-first workflow: create a migration with `supabase migration new <name>`, edit the SQL in `supabase/migrations/`, apply with `supabase db reset` (or `db push` for remote).
- Pull remote schema changes: `SUPABASE_DB_PASSWORD=<pw> supabase db pull` — needs the Postgres password (not the anon key); ask the user for it. If asked "Update remote migration history table?", answer yes.
- `supabase db diff` can generate a migration from changes made in Studio.

## Seeding and types

- `supabase/seed.sql` seeds the local DB on `start`/`db reset`. It is gitignored — it typically holds a real production data dump (auth tokens, PII), so never commit it. To refresh it from remote data: `SUPABASE_DB_PASSWORD=<pw> supabase db dump --linked --data-only -f supabase/seed.sql`, then `supabase db reset`. (pg_dump may warn about circular FKs on `congregation`/`publisher`/`group`; the dump still restores because seeding disables triggers via `session_replication_role`.) A "no files matched pattern: supabase/seed.sql" warning on a fresh clone just means an empty DB.
- Regenerate DB types after schema changes (from repo root): `supabase gen types typescript --local --workdir packages/proclaimer > packages/proclaimer/src/feature/backend/types.ts`.
- `collections.ts` queries tables through an untyped `SupabaseClient` cast — the generated `Database` type is strict, so keep generic wrappers loosely typed like that file does.

## Gotchas

- A fresh local DB has no auth users — sign up in the app and confirm via Mailpit, or create users in Studio.
- If ports 54321–54324 are busy, check `supabase status` — another stack may already be running.

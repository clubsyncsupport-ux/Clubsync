# Deploying to Postgres (Railway) — use this, don't replay SQLite migration history

`postgres_init.sql` in this folder is the complete current database schema,
pre-generated as valid PostgreSQL (not SQLite). It was built locally from
`prisma/schema.prisma` with zero live database connection — it's just SQL text,
safe to read before using.

**Why this exists:** the real migration history in `prisma/migrations/` was
written for SQLite and contains SQLite-only commands (`PRAGMA`, table-rebuild
tricks) that Postgres cannot run. Running `prisma migrate deploy` against a
fresh Postgres database using that history will fail on the first SQLite-only
migration it hits.

## On deploy day, once you have a live Railway Postgres `DATABASE_URL`:

1. In `prisma/schema.prisma`, change the datasource's `provider = "sqlite"`
   to `provider = "postgresql"` (this file's own top comment says the same).
2. Delete the old `prisma/migrations/` folder — its history doesn't apply to
   Postgres and would only cause confusion going forward.
3. Create `prisma/migrations/0_init/migration.sql` and paste in the contents
   of `postgres_init.sql` from this folder.
4. Run `npx prisma migrate resolve --applied 0_init` against the new
   `DATABASE_URL` (marks this baseline as already-applied without re-running
   it — you're telling Prisma "the schema already matches this," which is
   true since you're about to run it fresh).

   Actually simpler for a brand-new empty database: just run
   `npx prisma db push` once against the new `DATABASE_URL` — it applies the
   current `schema.prisma` directly with no migration history needed at all,
   which is the right move for a first-ever deploy with no existing
   production data to preserve. Do this INSTEAD of steps 3–4 if there's
   nothing in the new database yet (there won't be).
5. Run `npx prisma generate` so the Prisma Client matches.
6. From this point on, future schema changes should generate real Postgres
   migrations the normal way (`npx prisma migrate dev` against a local or
   Railway Postgres) — this SQLite-era workaround era is over once you're on
   Postgres.

Delete this whole `postgres-deploy/` folder once the swap is done — it's a
one-time deploy aid, not something the running app ever reads.

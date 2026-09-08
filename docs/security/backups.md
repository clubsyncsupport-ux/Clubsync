# Backups & Disaster Recovery

Confirmed 2026-09-07, directly from the developer: **this project is on Supabase's Free plan.** Supabase only takes automatic daily backups on paid plans (Pro and above) — the Free plan has none. That means today, if the database were ever corrupted, a bad migration went wrong, or something was accidentally deleted at the database level, **there is no way to restore it.**

This is a deliberate, informed tradeoff for the pilot stage, not an oversight: the developer isn't paying for Supabase Pro yet given the district's own approval process is expected to take a couple of months, and there's limited value in paying for production-grade backup infrastructure before there's real, district-approved usage to protect. Restated plainly for anyone reviewing this: **the honest current answer to "can you restore lost data" is no**, and that should be treated as a real, named risk during the pilot — not glossed over — even though the reasoning behind accepting it is sound.

## What already reduces the practical risk

- Schema changes go through `prisma db push` against columns only ever added, never dropped or altered destructively, in this project's history so far.
- Self-service account/data deletion (see `src/app/actions/settings.ts`) is deliberate, user-initiated, and narrowly scoped — not a bulk operation that could accidentally wipe more than intended.
- A one-off full data snapshot was taken locally (JSON export of every table) before the one large destructive cleanup performed this project has done — see the conversation history around 2026-09-02 — as a manual, one-time safety net, not a substitute for real backups.

## What changes this before a formal district rollout

If/when SD38 formally adopts ClubSync, upgrading to Supabase Pro (or higher) for real daily backups — and ideally testing an actual restore once, not just trusting the plan exists — is the single highest-value reliability fix available, and should happen before real student data at scale depends on this database with no safety net. This is a cost/timing decision for the developer to make, not something resolvable in code.

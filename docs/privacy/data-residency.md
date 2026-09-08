# Data Residency — What's Actually True

Last verified: 2026-09-06, directly against the running code and infrastructure config (not assumed from provider marketing).

This exists because "the database is in Canada" is true but incomplete — it does not mean every part of ClubSync processes or stores data in Canada. This document says precisely what's confirmed, what isn't, and what would need a dashboard check (not a code change) to confirm further.

## Confirmed Canadian

- **Primary database** — PostgreSQL via Supabase, region **Canada (Central)**. This is where every persistent record lives: users, clubs, events, registrations, service hours, everything in `prisma/schema.prisma`.
- **File storage** — Supabase Storage, same project/region as the database. Club logos, banners, and event attachments.

## Not confirmed Canadian — needs a decision or a dashboard check

- **Application hosting (Vercel).** Checked `vercel.json` (doesn't exist) and `next.config.ts` — there is **no region configuration anywhere in this codebase**, which means Vercel Functions run on whatever Vercel's default region is for this project. Vercel's default region for new projects is a US region unless explicitly pinned to another one (e.g. Montréal, `yul1`) in the project's dashboard settings — something outside this repo's control, and not verified here. Every server-rendered page and server action executes wherever the deployed function actually runs, which today is not confirmed to be Canada.
- **Password-reset email (Resend).** Resend's own documentation states email metadata and account data are stored in the United States. Resend never receives ClubSync's broader database — only the one-time reset link and the recipient's email address for that single message — but that narrow slice of data does leave Canada.
- **Google Sign-In / Google Calendar sync.** When someone uses either, ClubSync sends/receives data to/from Google's own infrastructure (name/email/photo for sign-in; calendar event data for the read-only sync). Google's processing location for this isn't something ClubSync controls or has verified. **Decision (2026-09-07): keeping both enabled for the pilot** — this was raised as an option to disable and explicitly declined, not overlooked. Worth surfacing this exact question to the district directly rather than assuming their policy's "no non-Canadian cloud services" language extends to a narrow, opt-in, per-user OAuth flow the same way it would to bulk database storage.

## What this document is not

It's not a decision about what to do next — removing Resend or reconfiguring Vercel's region are real product/infrastructure decisions with real tradeoffs (working functionality, deploy risk, whether the plan even supports region pinning), not something to change unilaterally in code without the developer's and/or the district's sign-off. Those decisions are tracked separately (Google's is now made, see above); this file's only job is to state the facts precisely so each decision can be made with accurate information instead of an overstated "everything is in Canada" claim.

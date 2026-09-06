# Subprocessors & External Services

Last verified: 2026-09-06, against the actual code and `.env` variable names (not marketing claims about any provider). Every external service that touches a ClubSync user's information, however narrowly, is listed here — the goal is that a privacy reviewer can see the whole picture in one place, not just "the database is in Canada."

| Provider | What it's used for | What it receives | Processing/storage location | Notes |
|---|---|---|---|---|
| **Supabase** | Primary database (PostgreSQL) and file storage | Every persistent record: accounts, clubs, events, registrations, service hours, uploaded files | Canada (Central) — confirmed | The actual source of truth for all app data. Accessed server-side only via a secret/service-role key (`SUPABASE_SECRET_KEY`); never exposed to the browser. |
| **Vercel** | Application hosting — serves every page, runs every server action | Every request ClubSync handles, transiently, to process it | Not confirmed Canadian — see `docs/privacy/data-residency.md` | No persistent storage of its own; a request is processed and the response returned, nothing is retained by ClubSync's own design. Standard platform request logs are Vercel's, not something this codebase controls. |
| **Resend** | Sends password-reset emails only | The recipient's email address and a one-time reset link, per email sent | United States (Resend's own documented storage location for email metadata) | No marketing or bulk email exists in the app — this is the only thing Resend is used for. Never receives the broader account database. |
| **Google (Sign-In)** | Optional alternative to a password for signing in | Name, email, profile photo (OAuth scope `openid email profile`) — nothing else, never a password | Google's infrastructure, not ClubSync's | Opt-in at signup/login only. |
| **Google (Calendar sync)** | Optional, separate opt-in from Settings — shows ClubSync events on a user's own Google Calendar | Event details ClubSync creates on the user's calendar (title, time, location) | Google's infrastructure | Read-only in the sense that matters here: scope is `calendar.readonly`, so ClubSync can never create, edit, or delete anything on the user's calendar — it only reads it to display alongside ClubSync's own events. Fully independent of Sign-In; a user can use one without the other. |

## Not currently in use

No analytics, ad tracking, error-reporting/monitoring service, CAPTCHA provider, or any other third-party script is integrated anywhere in the app. The only cookie set is the app's own sign-in session cookie (see Privacy Policy §13).

## What this doesn't cover

Whether each of these providers has a signed data-processing agreement or privacy protection schedule appropriate for handling a school district's student data is a contracts question, not a code question — worth raising with the district directly (see the SD38 compliance plan) rather than asserting compliance here.

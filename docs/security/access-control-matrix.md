# Access Control Matrix

Last verified: 2026-09-06, by reading the actual authorization functions every server action and page funnels through — `src/lib/director.ts` (`getDirectorContext`), `src/lib/school-admin.ts` (`getSchoolAdminContext`, `requireSchoolAccessForUser`, `requireSchoolAccessForStaffApproval`), and `src/lib/admin.ts` (`requireAdmin`) — not written from memory or assumption. Every one of these re-derives the caller's identity and role from their session on every call; none of them trust anything the client sends about who the caller is.

| Role | Own data | A specific club's data | Other clubs at the same school | Other schools | Platform-wide |
|---|---|---|---|---|---|
| **Student / Member** | Full access to their own account, registrations, service hours | Read what's public; register for events; see rosters/hours only if a Director/Officer | No access | No access | No access |
| **Club Officer** | Same as Student, plus: | Manage that club's events, members, attendance, announcements, service-hour verification (same power as Director in that one club) | No access | No access | No access |
| **Club Director** | Same as Officer | Full control of that club, including settings and archiving/deletion | No access | No access | No access |
| **School Admin** | Own account | Full Director-level power in **every** club at their own school (`getDirectorContext` treats a School Admin at the club's own school the same as that club's own Director) | Full access, but only within their own school | **No access** — every check compares `schoolAdminOfId` against the target's actual `schoolId`, derived server-side from the resource itself, never from client input | No access — cannot appoint/remove admins, cannot change anyone's platform role |
| **Platform Admin** | Own account | Full access everywhere | Full access everywhere | Full access everywhere | Full access — the only role that can appoint/remove School Admins or change platform roles |

## What actually enforces each boundary (verified in code)

- **Club-level access** (`getDirectorContext(clubId)`, `src/lib/director.ts`): authorized if the caller has a `DIRECTOR`/`OFFICER` membership in that specific club, is a Platform Admin, or is the School Admin of that club's school (`me.platformRole === "SCHOOL_ADMIN" && me.schoolAdminOfId === club.schoolId`). Every director-facing server action calls this first, with the `clubId` taken from the URL/route, not trusted from a hidden form field.
- **School-level access** (`getSchoolAdminContext(schoolId)` / `getSchoolAdminContextForClub(clubId)`, `src/lib/school-admin.ts`): authorized only for that exact school's assigned School Admin or a Platform Admin. The club variant derives the school ID from the club record itself server-side, so a School Admin can't reach another school's club by guessing/editing a club ID that happens to belong elsewhere.
- **Cross-school user actions** (suspend/reactivate/delete/approve-staff — `requireSchoolAccessForUser`, `requireSchoolAccessForStaffApproval`): re-fetches the *target* user's real `schoolId`/`platformRole`/`accountKind` from the database and checks it against the caller's own `schoolAdminOfId` — a School Admin additionally can only ever act on a plain `STUDENT` (for suspend/reactivate/delete) or `STAFF` account (for staff approval), never another admin, closing off any path to touching a peer or escalating.
- **Platform-wide actions** (`requireAdmin`, `src/lib/admin.ts`): gated purely on `platformRole === "PLATFORM_ADMIN"`, checked fresh from the database on every call.

## Known limitation, not a gap in this matrix

The Platform Admin role currently has unrestricted technical access to every school's data by design — there is no separate "technical maintainer" role with narrower access than the one account that also holds full platform authority. Today that's the same person (the developer). Whether that should change before a formal district-wide rollout (e.g. splitting "keeps the app running" from "can see every student's records") is a real governance question worth raising with the district, not something to redesign unilaterally under launch-week time pressure.

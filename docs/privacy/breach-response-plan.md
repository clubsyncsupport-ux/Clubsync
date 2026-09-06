# ClubSync Privacy & Security Breach Response Plan

Version 1.0 — 2026-09-06

This is the operational version of the commitment published at [clubsync.ca/privacy](https://www.clubsync.ca/privacy#p14), written for whoever is actually handling an incident, not for a general audience. It deliberately echoes the language SD38's own Policy 311-G(B) uses — "without delay," "as soon as reasonably possible" — so it reads as a direct match, not generic boilerplate.

**Primary principle:** report a suspected breach immediately. Don't wait for a complete picture before escalating.

## 1. What counts as a breach

Suspected or confirmed unauthorized access, use, disclosure, alteration, loss, theft, or destruction of personal information. Examples: a student reaching another student's records, a compromised account (student, director, admin, or the platform admin), unauthorized database or backup access, personal information appearing somewhere it shouldn't (logs, a public URL), or a leaked credential that could grant access.

## 2. Immediate response

1. **Contain it.** Disable the affected account/session, rotate any exposed credential or token, restrict the affected route if needed, and preserve logs/evidence — don't delete or rebuild anything before evidence is captured.
2. **Escalate without delay.** If ClubSync is operating on behalf of a school/district at the time, the developer notifies that school's designated contact (and SD38's Privacy Officer, once formally adopted) immediately, with whatever is known so far — an incomplete picture reported now beats a complete one reported late.
3. **Don't independently decide on external notification.** ClubSync does not notify affected students, parents, media, or a regulator (like the OIPC) on its own once operating under a school's or district's authority — that decision belongs to the school/district, who has the full legal picture ClubSync doesn't.

## 3. Investigation

Determine: what happened, when it started and ended, which systems/accounts were affected, which individuals may be affected, what information was actually involved (not just theoretically exposed), how it was contained, and whether anything else (another account, another vendor) is implicated. Document all of it as it's found, not retroactively.

## 4. Notification

The school/district decides whether affected individuals, the OIPC, or others need to be told. ClubSync's job at that point is to hand over the technical facts needed to write that notification clearly: what happened, what information was involved, what's been done to contain it, what's being done to prevent it recurring, and what affected people should do.

## 5. Recovery

Before returning to normal operation: rotate every credential that could have been exposed, remove any unauthorized access, fix the actual vulnerability (not just the symptom), require affected users to reset credentials if warranted, and get explicit confirmation from the school/district contact that it's safe to resume before treating the incident as closed.

## 6. After

Document root cause, what was fixed, what changed as a result (code, process, or policy), and whether the Privacy Policy or any compliance documentation (including the files in `docs/privacy/`) needs updating because of what was learned.

---

**Emergency principle:** when in doubt, escalate. Reporting a false alarm costs a few minutes of someone's time; sitting on a real one doesn't.

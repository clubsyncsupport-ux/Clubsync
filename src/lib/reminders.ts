import "server-only";
import { db } from "@/lib/db";
import { formatEventDate } from "@/lib/format";
import { parseReminderOffsets } from "@/lib/constants";

// Generates "event coming up" notifications for a user's registered events
// once they fall inside one of the user's reminder windows (per their
// Settings preference, or a per-event override — e.g. "1 day before" and
// "1 hour before" at once). There's no background job runner in this stack,
// so this runs opportunistically on each authenticated page load instead of
// on a schedule — deduplicated per (event, offset) by checking for an
// existing reminder notification first. A real deployment could instead run
// this on a cron (e.g. Vercel Cron) for precise timing regardless of
// whether the user has the app open.
//
// The actual reminder check (fetching every upcoming registration, joined
// through its event and club) is real work to repeat on literally every
// single navigation app-wide, for every student, even pages that have
// nothing to do with events. A reminder is only ever "due" within a coarse
// multi-minute window anyway, so skip the check entirely if it already ran
// recently — worst case a reminder shows a few minutes later than the exact
// instant it became due, which nobody would notice.
// The narrowest configured reminder window is "10 minutes before" (see
// REMINDER_OFFSETS in constants.ts) — kept well under that so this can never
// skip past a window entirely, only delay noticing it by a few minutes.
const CHECK_INTERVAL_MS = 3 * 60 * 1000;

export async function generateEventReminders(userId: string) {
  const now = new Date();

  const user = await db.user.findUniqueOrThrow({
    where: { id: userId },
    select: { reminderOffsets: true, remindersCheckedAt: true },
  });
  if (user.remindersCheckedAt && now.getTime() - user.remindersCheckedAt.getTime() < CHECK_INTERVAL_MS) {
    return;
  }
  // Record the check up front, before any early return below, so a user with
  // no upcoming registrations right now still gets the same debounce benefit
  // instead of re-querying every time simply because there was nothing to do.
  await db.user.update({ where: { id: userId }, data: { remindersCheckedAt: now } });

  const registrations = await db.eventRegistration.findMany({
    where: {
      userId,
      status: { in: ["REGISTERED", "WAITLISTED"] },
      event: { status: "SCHEDULED", startAt: { gt: now } },
    },
    include: { event: { include: { club: true } } },
  });
  if (registrations.length === 0) return;

  const defaultOffsets = parseReminderOffsets(user.reminderOffsets);

  const candidates: { title: string; body: string; linkUrl: string }[] = [];
  for (const reg of registrations) {
    const offsets = reg.reminderOffsets ? parseReminderOffsets(reg.reminderOffsets) : defaultOffsets;
    for (const offset of offsets) {
      const windowStart = new Date(reg.event.startAt.getTime() - offset * 60 * 1000);
      if (now >= windowStart && now < reg.event.startAt) {
        candidates.push({
          title: `Upcoming: ${reg.event.title}`,
          body: `${reg.event.club.name} · ${formatEventDate(reg.event.startAt)}`,
          linkUrl: `/events/${reg.eventId}#r${offset}`,
        });
      }
    }
  }
  if (candidates.length === 0) return;

  const existing = await db.notification.findMany({
    where: { userId, type: "EVENT_REMINDER", linkUrl: { in: candidates.map((c) => c.linkUrl) } },
    select: { linkUrl: true },
  });
  const alreadyNotified = new Set(existing.map((n) => n.linkUrl));

  const toCreate = candidates.filter((c) => !alreadyNotified.has(c.linkUrl));
  if (toCreate.length === 0) return;

  await db.notification.createMany({
    data: toCreate.map((c) => ({
      userId,
      type: "EVENT_REMINDER" as const,
      title: c.title,
      body: c.body,
      linkUrl: c.linkUrl,
    })),
  });
}

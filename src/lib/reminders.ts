import "server-only";
import { db } from "@/lib/db";
import { formatEventDate } from "@/lib/format";
import { parseReminderOffsets } from "@/lib/constants";

// Generates "event coming up" notifications for a user's registered events
// once they fall inside one of the user's reminder windows (per their
// Settings preference, or a per-event override — e.g. "1 day before" and
// "1 hour before" at once). There's no background job runner in this stack,
// so this runs opportunistically on each authenticated page load instead of
// on a schedule — cheap (scoped to one user's own registrations) and
// deduplicated per (event, offset) by checking for an existing reminder
// notification first. A real deployment could instead run this on a cron
// (e.g. Vercel Cron) for precise timing regardless of whether the user has
// the app open.
export async function generateEventReminders(userId: string) {
  const now = new Date();

  const [user, registrations] = await Promise.all([
    db.user.findUniqueOrThrow({ where: { id: userId }, select: { reminderOffsets: true } }),
    db.eventRegistration.findMany({
      where: {
        userId,
        status: { in: ["REGISTERED", "WAITLISTED"] },
        event: { status: "SCHEDULED", startAt: { gt: now } },
      },
      include: { event: { include: { club: true } } },
    }),
  ]);

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

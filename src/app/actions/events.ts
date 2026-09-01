"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth/session";
import { db } from "@/lib/db";

export async function updateRegistrationRemindersAction(eventId: string, offsetMinutes: number[]) {
  const user = await requireUser();
  // Empty selection means "use my account default" — stored as null rather
  // than an empty string so future changes to that default still apply here.
  const reminderOffsets = offsetMinutes.length > 0 ? offsetMinutes.join(",") : null;
  await db.eventRegistration.updateMany({
    where: { eventId, userId: user.id },
    data: { reminderOffsets },
  });
  revalidatePath(`/events/${eventId}`);
}

export type RegisterResult = { ok: true; status: "REGISTERED" | "WAITLISTED" } | { ok: false; error: string };

// Shared by the single-event join (registerForEventAction) and the
// "join several occurrences of a recurring event at once" bulk action below
// — every eligibility/capacity rule lives here exactly once so the two
// entry points can never drift apart.
async function attemptRegisterForEvent(userId: string, eventId: string, roleId?: string): Promise<RegisterResult> {
  const event = await db.event.findUniqueOrThrow({ where: { id: eventId }, include: { roles: true } });

  const membership = await db.clubMembership.findUnique({ where: { userId_clubId: { userId, clubId: event.clubId } } });
  if (!membership || membership.status !== "ACTIVE") {
    return { ok: false, error: "You need to be a member of this club to join its events." };
  }

  if (event.visibility === "PRIVATE") {
    const invited = await db.eventInvite.findUnique({ where: { eventId_userId: { eventId, userId } } });
    if (!invited) return { ok: false, error: "This event is private." };
  }

  const me = await db.user.findUniqueOrThrow({ where: { id: userId } });

  if (event.allowedGrades) {
    const allowed = event.allowedGrades.split(",");
    if (!me.grade || !allowed.includes(me.grade)) {
      return { ok: false, error: `This event is only open to ${allowed.join(", ")}.` };
    }
  }

  if (event.registrationDeadline && event.registrationDeadline < new Date()) {
    return { ok: false, error: "Registration for this event has closed." };
  }

  // When an event has roles defined, everyone has to pick one to join — this
  // is what lets a director see which roles are filled at a glance instead
  // of just a single headcount.
  let role: (typeof event.roles)[number] | undefined;
  if (event.roles.length > 0) {
    if (!roleId) return { ok: false, error: "Select a role to join this event." };
    role = event.roles.find((r) => r.id === roleId);
    if (!role) return { ok: false, error: "That role no longer exists." };
    // A role can carry its own grade floor independent of (and possibly
    // narrower than) the event's own allowedGrades — e.g. "Scorekeeper"
    // restricted to Grade 10+ on an event otherwise open to everyone.
    if (role.allowedGrades) {
      const roleAllowed = role.allowedGrades.split(",");
      if (!me.grade || !roleAllowed.includes(me.grade)) {
        return { ok: false, error: `The "${role.name}" role is only open to ${roleAllowed.join(", ")}.` };
      }
    }
  }

  const activeCount = await db.eventRegistration.count({
    where: { eventId, status: "REGISTERED" },
  });

  let status: "REGISTERED" | "WAITLISTED" = "REGISTERED";
  if (event.maxParticipants && activeCount >= event.maxParticipants) {
    if (!event.waitlistEnabled) return { ok: false, error: "This event is full." };
    status = "WAITLISTED";
  }

  if (role && status === "REGISTERED") {
    const roleFilledCount = await db.eventRegistration.count({ where: { eventId, roleId: role.id, status: "REGISTERED" } });
    if (roleFilledCount >= role.capacity) {
      if (!event.waitlistEnabled) return { ok: false, error: `The "${role.name}" role is full — try a different one.` };
      status = "WAITLISTED";
    }
  }

  // The waitlist itself can have its own cap, independent of maxParticipants
  // (which only limits REGISTERED). Checked at whichever granularity applies
  // — a role's own waitlist cap if this join is for a specific role, and the
  // event's overall waitlist cap either way — so the waitlist can't grow
  // unbounded once someone actually needs it.
  if (status === "WAITLISTED") {
    // Exclude the person's own existing registration from these counts —
    // otherwise someone already waitlisted who re-submits (e.g. switching
    // roles) would get falsely blocked by their own prior row.
    if (role?.waitlistCapacity != null) {
      const roleWaitlistCount = await db.eventRegistration.count({
        where: { eventId, roleId: role.id, status: "WAITLISTED", userId: { not: userId } },
      });
      if (roleWaitlistCount >= role.waitlistCapacity) {
        return { ok: false, error: `The waitlist for the "${role.name}" role is full.` };
      }
    }
    if (event.waitlistCapacity != null) {
      const eventWaitlistCount = await db.eventRegistration.count({
        where: { eventId, status: "WAITLISTED", userId: { not: userId } },
      });
      if (eventWaitlistCount >= event.waitlistCapacity) {
        return { ok: false, error: "The waitlist for this event is full." };
      }
    }
  }

  await db.eventRegistration.upsert({
    where: { eventId_userId: { eventId, userId } },
    update: { status, roleId: role?.id ?? null },
    create: { eventId, userId, status, roleId: role?.id ?? null },
  });

  await db.notification.create({
    data: {
      userId,
      type: "REGISTRATION",
      title: status === "REGISTERED" ? "You're registered!" : "Added to waitlist",
      body: `${event.title}`,
      linkUrl: `/events/${event.id}`,
    },
  });

  return { ok: true, status };
}

export async function registerForEventAction(eventId: string, roleId?: string): Promise<RegisterResult> {
  const user = await requireUser();
  const result = await attemptRegisterForEvent(user.id, eventId, roleId);
  revalidatePath(`/events/${eventId}`);
  revalidatePath("/my-events");
  revalidatePath("/calendar");
  revalidatePath("/home");
  return result;
}

// Every occurrence of a recurring series shares one "root" id — the first
// occurrence's own id, stored as recurrenceParentId on every later one (and
// left null on the first occurrence itself).
export async function getRecurringSeriesEventsAction(eventId: string) {
  const event = await db.event.findUniqueOrThrow({ where: { id: eventId } });
  const rootId = event.recurrenceParentId ?? event.id;
  const series = await db.event.findMany({
    where: { OR: [{ id: rootId }, { recurrenceParentId: rootId }] },
    orderBy: { startAt: "asc" },
    select: { id: true, startAt: true, status: true },
  });
  return series.map((e) => ({ id: e.id, startAt: e.startAt, cancelled: e.status === "CANCELLED" }));
}

export type BulkRegisterResult = { eventId: string; startAt: Date } & RegisterResult;

// Lets someone join specific occurrences of a recurring event in one action
// instead of either joining every occurrence one at a time or (previously)
// having no way to pick a subset at all. Each occurrence has its own
// independent EventRole rows (same name, different ids — roles are created
// fresh per occurrence at series-creation time), so this takes a role NAME
// and resolves the matching role's real id separately for every event.
export async function registerForRecurringSeriesAction(eventIds: string[], roleName?: string): Promise<BulkRegisterResult[]> {
  const user = await requireUser();
  const results: BulkRegisterResult[] = [];
  for (const eventId of eventIds) {
    const event = await db.event.findUnique({ where: { id: eventId }, select: { startAt: true, roles: true } });
    if (!event) continue;
    const roleId = roleName ? event.roles.find((r) => r.name === roleName)?.id : undefined;
    const result = await attemptRegisterForEvent(user.id, eventId, roleId);
    results.push({ eventId, startAt: event.startAt, ...result });
  }
  revalidatePath("/my-events");
  revalidatePath("/calendar");
  revalidatePath("/home");
  return results;
}

export async function cancelRegistrationAction(eventId: string) {
  const user = await requireUser();
  await db.eventRegistration.updateMany({
    where: { eventId, userId: user.id },
    data: { status: "CANCELLED" },
  });

  // Promote the earliest waitlisted registrant, if any and if there's now room.
  const event = await db.event.findUnique({ where: { id: eventId } });
  if (event?.maxParticipants) {
    const activeCount = await db.eventRegistration.count({ where: { eventId, status: "REGISTERED" } });
    if (activeCount < event.maxParticipants) {
      const nextWaitlisted = await db.eventRegistration.findFirst({
        where: { eventId, status: "WAITLISTED" },
        orderBy: { registeredAt: "asc" },
      });
      if (nextWaitlisted) {
        await db.eventRegistration.update({ where: { id: nextWaitlisted.id }, data: { status: "REGISTERED" } });
        await db.notification.create({
          data: {
            userId: nextWaitlisted.userId,
            type: "REGISTRATION",
            title: "You're off the waitlist!",
            body: event.title,
            linkUrl: `/events/${event.id}`,
          },
        });
      }
    }
  }

  revalidatePath(`/events/${eventId}`);
  revalidatePath("/my-events");
  revalidatePath("/calendar");
  revalidatePath("/home");
}

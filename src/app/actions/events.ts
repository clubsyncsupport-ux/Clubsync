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

export async function registerForEventAction(eventId: string, roleId?: string): Promise<RegisterResult> {
  const user = await requireUser();
  const event = await db.event.findUniqueOrThrow({ where: { id: eventId }, include: { roles: true } });

  // Event detail pages are now viewable by any director/admin at the school
  // for coordination purposes (they may not be a member of this specific
  // club) — this is the check that stops that read-only visibility from
  // accidentally letting them join an event for a club they're not in.
  const membership = await db.clubMembership.findUnique({ where: { userId_clubId: { userId: user.id, clubId: event.clubId } } });
  if (!membership || membership.status !== "ACTIVE") {
    return { ok: false, error: "You need to be a member of this club to join its events." };
  }

  if (event.visibility === "PRIVATE") {
    const invited = await db.eventInvite.findUnique({ where: { eventId_userId: { eventId, userId: user.id } } });
    if (!invited) return { ok: false, error: "This event is private." };
  }

  if (event.allowedGrades) {
    const allowed = event.allowedGrades.split(",");
    const me = await db.user.findUniqueOrThrow({ where: { id: user.id } });
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

  await db.eventRegistration.upsert({
    where: { eventId_userId: { eventId, userId: user.id } },
    update: { status, roleId: role?.id ?? null },
    create: { eventId, userId: user.id, status, roleId: role?.id ?? null },
  });

  await db.notification.create({
    data: {
      userId: user.id,
      type: "REGISTRATION",
      title: status === "REGISTERED" ? "You're registered!" : "Added to waitlist",
      body: `${event.title}`,
      linkUrl: `/events/${event.id}`,
    },
  });

  revalidatePath(`/events/${eventId}`);
  revalidatePath("/my-events");
  revalidatePath("/calendar");
  revalidatePath("/home");
  return { ok: true, status };
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

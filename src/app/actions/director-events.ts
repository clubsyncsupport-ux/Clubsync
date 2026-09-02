"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { addDays, addMonths, addWeeks } from "date-fns";
import { db } from "@/lib/db";
import { getDirectorContext } from "@/lib/director";
import { saveUploadedFile } from "@/lib/storage";
import { checkAndUnlockAchievements } from "@/lib/achievements";
import type { Event } from "@prisma/client";

export type ActionState = { error: string | null };

function combineDateTime(date: string, time: string): Date {
  return new Date(`${date}T${time}`);
}

export async function createEventAction(clubId: string, formData: FormData): Promise<ActionState> {
  const { club } = await getDirectorContext(clubId);

  const title = String(formData.get("title") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const category = String(formData.get("category") ?? "Meeting");
  const date = String(formData.get("date") ?? "");
  const startTime = String(formData.get("startTime") ?? "15:00");
  const endTime = String(formData.get("endTime") ?? "16:00");
  const building = String(formData.get("building") ?? "").trim() || null;
  const room = String(formData.get("room") ?? "").trim() || null;
  const address = String(formData.get("address") ?? "").trim() || null;
  const mapLink = String(formData.get("mapLink") ?? "").trim() || null;
  const maxParticipantsRaw = String(formData.get("maxParticipants") ?? "").trim();
  const registrationDeadlineRaw = String(formData.get("registrationDeadline") ?? "").trim();
  const waitlistEnabled = formData.get("waitlistEnabled") === "on";
  const waitlistCapacityRaw = String(formData.get("waitlistCapacity") ?? "").trim();
  const awardsServiceHours = formData.get("awardsServiceHours") === "on";
  const defaultServiceHours = Number(formData.get("defaultServiceHours") ?? 0);
  const serviceTaskDescription = String(formData.get("serviceTaskDescription") ?? "").trim() || null;
  const attendanceEnabled = formData.get("attendanceEnabled") === "on";
  const visibility = String(formData.get("visibility") ?? "PUBLIC") as "PUBLIC" | "PRIVATE";
  const inviteUserIds = formData.getAll("inviteUserIds").map(String);
  // Assigned students are auto-registered with no Join needed. If the event
  // is Private, they also need to be able to see it — union them into the
  // invite list so a director doesn't have to pick the same people twice.
  const assignedUserIds = formData.getAll("assignedUserIds").map(String);
  const allInviteIds = Array.from(new Set([...inviteUserIds, ...assignedUserIds]));
  const recurrence = String(formData.get("recurrence") ?? "NONE") as "NONE" | "DAILY" | "WEEKLY" | "MONTHLY";
  const recurrenceUntilRaw = String(formData.get("recurrenceUntil") ?? "").trim();
  const allowedGrades = String(formData.get("allowedGrades") ?? "").trim() || null;
  const attachmentFiles = formData.getAll("attachments").filter((f): f is File => f instanceof File && f.size > 0);
  // Parallel arrays (index-matched) — see the "Roles" section of the create form.
  const roleNames = formData.getAll("roleName").map(String);
  const roleCapacities = formData.getAll("roleCapacity").map((v) => Number(v));
  const roleAllowedGradesRaw = formData.getAll("roleAllowedGrades").map(String);
  const roleWaitlistCapacitiesRaw = formData.getAll("roleWaitlistCapacity").map(String);
  const roles = roleNames
    .map((name, i) => ({
      name: name.trim(),
      capacity: roleCapacities[i],
      allowedGrades: roleAllowedGradesRaw[i]?.trim() || null,
      waitlistCapacity: roleWaitlistCapacitiesRaw[i]?.trim() ? Number(roleWaitlistCapacitiesRaw[i]) : null,
    }))
    .filter((r) => r.name && Number.isFinite(r.capacity) && r.capacity > 0);

  if (!title || !description || !date) return { error: "Title, description, and date are required." };

  const savedAttachments: { filename: string; url: string; mimeType: string; size: number }[] = [];
  for (const file of attachmentFiles) {
    try {
      savedAttachments.push(await saveUploadedFile(file, "attachments"));
    } catch (e) {
      return { error: e instanceof Error ? e.message : "One of the attachments failed to upload." };
    }
  }

  const startAt = combineDateTime(date, startTime);
  const endAt = combineDateTime(date, endTime);
  if (isNaN(startAt.getTime()) || isNaN(endAt.getTime())) return { error: "Invalid date or time." };

  const occurrences: Date[] = [startAt];
  if (recurrence !== "NONE" && recurrenceUntilRaw) {
    const until = new Date(`${recurrenceUntilRaw}T23:59:59`);
    let cursor = startAt;
    const step = recurrence === "DAILY" ? (d: Date) => addDays(d, 1) : recurrence === "WEEKLY" ? (d: Date) => addWeeks(d, 1) : (d: Date) => addMonths(d, 1);
    while (occurrences.length < 52) {
      cursor = step(cursor);
      if (cursor > until) break;
      occurrences.push(cursor);
    }
  }
  const duration = endAt.getTime() - startAt.getTime();

  let parentId: string | null = null;
  for (const occStart of occurrences) {
    const occEnd = new Date(occStart.getTime() + duration);
    const created: Event = await db.event.create({
      data: {
        clubId,
        title,
        description,
        category,
        startAt: occStart,
        endAt: occEnd,
        building,
        room,
        address,
        mapLink,
        visibility,
        allowedGrades,
        maxParticipants: maxParticipantsRaw ? Number(maxParticipantsRaw) : null,
        registrationDeadline: registrationDeadlineRaw ? new Date(registrationDeadlineRaw) : null,
        waitlistEnabled,
        waitlistCapacity: waitlistEnabled && waitlistCapacityRaw ? Number(waitlistCapacityRaw) : null,
        awardsServiceHours,
        defaultServiceHours: awardsServiceHours ? defaultServiceHours : 0,
        serviceTaskDescription,
        attendanceEnabled,
        recurrence,
        recurrenceParentId: parentId,
        recurrenceUntil: recurrenceUntilRaw ? new Date(recurrenceUntilRaw) : null,
        createdById: club.createdById,
        invites: visibility === "PRIVATE" ? { create: allInviteIds.map((userId) => ({ userId })) } : undefined,
        attachments: savedAttachments.length ? { create: savedAttachments } : undefined,
        registrations: assignedUserIds.length ? { create: assignedUserIds.map((userId) => ({ userId, status: "REGISTERED" as const })) } : undefined,
        roles: roles.length
          ? {
              create: roles.map((r, i) => ({
                name: r.name,
                capacity: r.capacity,
                allowedGrades: r.allowedGrades,
                waitlistCapacity: r.waitlistCapacity,
                order: i,
              })),
            }
          : undefined,
      },
    });
    if (!parentId) parentId = created.id;
  }

  if (assignedUserIds.length > 0 && parentId) {
    await db.notification.createMany({
      data: assignedUserIds.map((userId) => ({
        userId,
        type: "REGISTRATION" as const,
        title: "You've been assigned to an event",
        body: title,
        linkUrl: `/events/${parentId}`,
      })),
    });
  }

  revalidatePath(`/director/${clubId}/events`);
  revalidatePath(`/director/${clubId}`);
  revalidatePath("/calendar");
  redirect(`/director/${clubId}/events`);
}

export async function updateEventAction(eventId: string, formData: FormData): Promise<ActionState> {
  const event = await db.event.findUniqueOrThrow({ where: { id: eventId } });
  await getDirectorContext(event.clubId);

  const title = String(formData.get("title") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const date = String(formData.get("date") ?? "");
  const startTime = String(formData.get("startTime") ?? "15:00");
  const endTime = String(formData.get("endTime") ?? "16:00");
  const visibility = String(formData.get("visibility") ?? "PUBLIC") as "PUBLIC" | "PRIVATE";
  const allowedGrades = String(formData.get("allowedGrades") ?? "").trim() || null;
  const waitlistEnabled = formData.get("waitlistEnabled") === "on";
  const waitlistCapacityRaw = String(formData.get("waitlistCapacity") ?? "").trim();
  const registrationDeadlineRaw = String(formData.get("registrationDeadline") ?? "").trim();

  if (!title || !description || !date) return { error: "Title, description, and date are required." };

  await db.event.update({
    where: { id: eventId },
    data: {
      title,
      description,
      category: String(formData.get("category") ?? event.category),
      startAt: combineDateTime(date, startTime),
      endAt: combineDateTime(date, endTime),
      building: String(formData.get("building") ?? "").trim() || null,
      room: String(formData.get("room") ?? "").trim() || null,
      address: String(formData.get("address") ?? "").trim() || null,
      visibility,
      allowedGrades,
      maxParticipants: String(formData.get("maxParticipants") ?? "").trim() ? Number(formData.get("maxParticipants")) : null,
      registrationDeadline: registrationDeadlineRaw ? new Date(registrationDeadlineRaw) : null,
      waitlistEnabled,
      waitlistCapacity: waitlistEnabled && waitlistCapacityRaw ? Number(waitlistCapacityRaw) : null,
      awardsServiceHours: formData.get("awardsServiceHours") === "on",
      defaultServiceHours: formData.get("awardsServiceHours") === "on" ? Number(formData.get("defaultServiceHours") ?? 0) : 0,
      serviceTaskDescription: String(formData.get("serviceTaskDescription") ?? "").trim() || null,
      attendanceEnabled: formData.get("attendanceEnabled") === "on",
    },
  });

  // Roles: parallel arrays (index-matched), same convention as
  // createEventAction. roleId is "" for a role added during this edit.
  // updateMany (not update) scopes by eventId too, so a tampered roleId from
  // another event silently matches nothing instead of editing someone else's role.
  const roleIds = formData.getAll("roleId").map(String);
  const roleNames = formData.getAll("roleName").map(String);
  const roleCapacities = formData.getAll("roleCapacity").map((v) => Number(v));
  const roleAllowedGradesRaw = formData.getAll("roleAllowedGrades").map(String);
  const roleWaitlistCapacitiesRaw = formData.getAll("roleWaitlistCapacity").map(String);
  const roleDrafts = roleNames
    .map((name, i) => ({
      id: roleIds[i] || null,
      name: name.trim(),
      capacity: roleCapacities[i],
      allowedGrades: roleAllowedGradesRaw[i]?.trim() || null,
      waitlistCapacity: roleWaitlistCapacitiesRaw[i]?.trim() ? Number(roleWaitlistCapacitiesRaw[i]) : null,
    }))
    .filter((r) => r.name && Number.isFinite(r.capacity) && r.capacity > 0);

  let newRoleOrder = await db.eventRole.count({ where: { eventId } });
  for (const r of roleDrafts) {
    if (r.id) {
      await db.eventRole.updateMany({
        where: { id: r.id, eventId },
        data: { name: r.name, capacity: r.capacity, allowedGrades: r.allowedGrades, waitlistCapacity: r.waitlistCapacity },
      });
    } else {
      await db.eventRole.create({
        data: { eventId, name: r.name, capacity: r.capacity, allowedGrades: r.allowedGrades, waitlistCapacity: r.waitlistCapacity, order: newRoleOrder++ },
      });
    }
  }

  // Only delete a removed role if it truly has no active registrants —
  // re-checked here rather than trusting the disabled-button in the UI.
  // (Registrations would survive anyway via onDelete: SetNull, but a silent
  // deletion would confusingly strand someone's chosen role as "no role".)
  const removedRoleIds = formData.getAll("removedRoleId").map(String);
  if (removedRoleIds.length > 0) {
    const registrantsInRemovedRoles = await db.eventRegistration.findMany({
      where: { eventId, roleId: { in: removedRoleIds }, status: { in: ["REGISTERED", "WAITLISTED", "ATTENDED", "NO_SHOW"] } },
      select: { roleId: true },
    });
    const rolesWithRegistrants = new Set(registrantsInRemovedRoles.map((r) => r.roleId));
    const safeToDelete = removedRoleIds.filter((id) => !rolesWithRegistrants.has(id));
    if (safeToDelete.length > 0) {
      await db.eventRole.deleteMany({ where: { id: { in: safeToDelete }, eventId } });
    }
  }

  // Adding newly-assigned students here — never removing. Un-assigning goes
  // through the existing "Remove" control in the Registrants list instead,
  // so this can't accidentally kick someone who self-joined off the event.
  const assignedUserIds = formData.getAll("assignedUserIds").map(String);
  const newlyAssigned: string[] = [];
  for (const userId of assignedUserIds) {
    const existing = await db.eventRegistration.findUnique({ where: { eventId_userId: { eventId, userId } } });
    if (!existing) newlyAssigned.push(userId);
    await db.eventRegistration.upsert({
      where: { eventId_userId: { eventId, userId } },
      update: {},
      create: { eventId, userId, status: "REGISTERED" },
    });
  }
  if (newlyAssigned.length > 0) {
    await db.notification.createMany({
      data: newlyAssigned.map((userId) => ({
        userId,
        type: "REGISTRATION" as const,
        title: "You've been assigned to an event",
        body: title,
        linkUrl: `/events/${eventId}`,
      })),
    });
  }

  // Visibility/invites: sync to whatever's checked, but a student already on
  // the roster (registered before or just assigned above) always keeps
  // access — switching to Private, or unchecking them, must never leave a
  // registered student unable to view the event they're signed up for.
  if (visibility === "PRIVATE") {
    const checkedInviteIds = formData.getAll("inviteUserIds").map(String);
    const activeRegistrations = await db.eventRegistration.findMany({
      where: { eventId, status: { in: ["REGISTERED", "WAITLISTED", "ATTENDED", "NO_SHOW"] } },
      select: { userId: true },
    });
    const finalInviteIds = Array.from(
      new Set([...checkedInviteIds, ...assignedUserIds, ...activeRegistrations.map((r) => r.userId)])
    );
    await db.eventInvite.deleteMany({ where: { eventId, userId: { notIn: finalInviteIds.length ? finalInviteIds : ["__none__"] } } });
    if (finalInviteIds.length > 0) {
      await db.eventInvite.createMany({ data: finalInviteIds.map((userId) => ({ eventId, userId })), skipDuplicates: true });
    }
  } else {
    await db.eventInvite.deleteMany({ where: { eventId } });
  }

  revalidatePath(`/director/${event.clubId}/events/${eventId}`);
  revalidatePath(`/director/${event.clubId}/events`);
  revalidatePath(`/events/${eventId}`);
  revalidatePath("/calendar");
  return { error: null };
}

export async function cancelEventAction(eventId: string) {
  const event = await db.event.findUniqueOrThrow({ where: { id: eventId } });
  await getDirectorContext(event.clubId);
  await cancelOneEvent(event.id, event.clubId, event.title);
  revalidatePath(`/director/${event.clubId}/events`);
  revalidatePath(`/director/${event.clubId}/events/${eventId}`);
  revalidatePath("/calendar");
}

async function cancelOneEvent(eventId: string, clubId: string, title: string) {
  await db.event.update({ where: { id: eventId }, data: { status: "CANCELLED" } });
  const registrants = await db.eventRegistration.findMany({ where: { eventId, status: "REGISTERED" } });
  await db.notification.createMany({
    data: registrants.map((r) => ({
      userId: r.userId,
      type: "REGISTRATION" as const,
      title: "Event cancelled",
      body: title,
      linkUrl: `/events/${eventId}`,
    })),
  });
}

// Cancels a specific subset of a recurring series' occurrences (director
// picks which dates from a checklist) instead of only being able to cancel
// one occurrence at a time. Re-verifies every event actually belongs to the
// given club — the picker only ever offers a series' own occurrences, but
// never trust a client-supplied id list without checking server-side.
export async function cancelRecurringEventsAction(clubId: string, eventIds: string[]) {
  await getDirectorContext(clubId);
  const events = await db.event.findMany({ where: { id: { in: eventIds }, clubId, status: { not: "CANCELLED" } } });
  for (const event of events) {
    await cancelOneEvent(event.id, clubId, event.title);
  }
  revalidatePath(`/director/${clubId}/events`);
  revalidatePath("/calendar");
  return { cancelledCount: events.length };
}

export async function markEventCompletedAction(eventId: string) {
  const event = await db.event.findUniqueOrThrow({ where: { id: eventId } });
  await getDirectorContext(event.clubId);
  await db.event.update({ where: { id: eventId }, data: { status: "COMPLETED" } });
  revalidatePath(`/director/${event.clubId}/events`);
}

export async function finalizeEventAction(
  eventId: string,
  eventImpact: string,
  hoursByUser: Record<string, number>
): Promise<ActionState> {
  const event = await db.event.findUniqueOrThrow({ where: { id: eventId } });
  const { user } = await getDirectorContext(event.clubId);

  const entries = Object.entries(hoursByUser).filter(([, hours]) => hours > 0);

  // One findFirst+create/update round trip per attendee, sequentially
  // awaited inside a single interactive transaction, used to blow past
  // Prisma's default 5s transaction timeout once an event had ~20+
  // attendees. Look up existing records in one query up front, then run
  // the per-user writes concurrently instead of one at a time.
  const existingRecords = await db.serviceHourRecord.findMany({
    where: { eventId, userId: { in: entries.map(([id]) => id) } },
  });
  const existingByUserId = new Map(existingRecords.map((r) => [r.userId, r]));

  await db.$transaction(
    async (tx) => {
      await Promise.all(
        entries.map(([userId, hours]) => {
          const existing = existingByUserId.get(userId);
          if (existing) {
            return tx.serviceHourRecord.update({
              where: { id: existing.id },
              data: { hours, status: "VERIFIED", approvedById: user.id, approvedAt: new Date(), eventImpact: eventImpact || null },
            });
          }
          return tx.serviceHourRecord.create({
            data: {
              userId,
              clubId: event.clubId,
              eventId,
              hours,
              status: "VERIFIED",
              approvedById: user.id,
              approvedAt: new Date(),
              taskDescription: event.serviceTaskDescription,
              eventImpact: eventImpact || null,
            },
          });
        })
      );
      await tx.eventRegistration.updateMany({
        where: { eventId, userId: { in: entries.map(([id]) => id) } },
        data: { status: "ATTENDED" },
      });
      await tx.event.update({ where: { id: eventId }, data: { status: "FINALIZED", eventImpact: eventImpact || null } });
    },
    { timeout: 15000 }
  );

  // Same sequential-loop pitfall as the transaction above, just outside it —
  // at 50+ attendees this could get slow enough to risk a request timeout,
  // even though nothing here needs to be atomic with anything else.
  await Promise.all(
    entries.map(async ([userId]) => {
      await checkAndUnlockAchievements(userId);
      await db.notification.create({
        data: {
          userId,
          type: "SERVICE_HOURS",
          title: "Service hours verified",
          body: `${event.title} — ${hoursByUser[userId]} hours`,
          linkUrl: "/service-hours",
        },
      });
    })
  );

  revalidatePath(`/director/${event.clubId}/events/${eventId}`);
  revalidatePath(`/director/${event.clubId}/events`);
  revalidatePath(`/director/${event.clubId}`);
  return { error: null };
}

export async function directorRemoveRegistrantAction(eventId: string, userId: string) {
  const event = await db.event.findUniqueOrThrow({ where: { id: eventId } });
  await getDirectorContext(event.clubId);

  await db.eventRegistration.updateMany({ where: { eventId, userId }, data: { status: "CANCELLED" } });
  await db.notification.create({
    data: {
      userId,
      type: "REGISTRATION",
      title: "Removed from event",
      body: event.title,
      linkUrl: `/events/${eventId}`,
    },
  });

  // Promote the earliest waitlisted registrant, if any and if there's now room.
  if (event.maxParticipants) {
    const activeCount = await db.eventRegistration.count({ where: { eventId, status: "REGISTERED" } });
    if (activeCount < event.maxParticipants) {
      const nextWaitlisted = await db.eventRegistration.findFirst({ where: { eventId, status: "WAITLISTED" }, orderBy: { registeredAt: "asc" } });
      if (nextWaitlisted) {
        await db.eventRegistration.update({ where: { id: nextWaitlisted.id }, data: { status: "REGISTERED" } });
        await db.notification.create({
          data: { userId: nextWaitlisted.userId, type: "REGISTRATION", title: "You're off the waitlist!", body: event.title, linkUrl: `/events/${eventId}` },
        });
      }
    }
  }

  revalidatePath(`/director/${event.clubId}/events/${eventId}`);
  revalidatePath(`/events/${eventId}`);
}

export async function toggleChecklistVisibilityAction(eventId: string) {
  const event = await db.event.findUniqueOrThrow({ where: { id: eventId } });
  await getDirectorContext(event.clubId);
  await db.event.update({ where: { id: eventId }, data: { checklistVisibleToStudents: !event.checklistVisibleToStudents } });
  revalidatePath(`/director/${event.clubId}/events/${eventId}`);
  revalidatePath(`/events/${eventId}`);
}

export async function addChecklistItemAction(eventId: string, task: string) {
  const event = await db.event.findUniqueOrThrow({ where: { id: eventId } });
  await getDirectorContext(event.clubId);
  const count = await db.eventChecklistItem.count({ where: { eventId } });
  await db.eventChecklistItem.create({ data: { eventId, task, order: count } });
  revalidatePath(`/director/${event.clubId}/events/${eventId}`);
}

export async function toggleChecklistItemAction(itemId: string) {
  const item = await db.eventChecklistItem.findUniqueOrThrow({ where: { id: itemId }, include: { event: true } });
  await getDirectorContext(item.event.clubId);
  await db.eventChecklistItem.update({ where: { id: itemId }, data: { completed: !item.completed } });
  revalidatePath(`/director/${item.event.clubId}/events/${item.eventId}`);
}

export async function deleteChecklistItemAction(itemId: string) {
  const item = await db.eventChecklistItem.findUniqueOrThrow({ where: { id: itemId }, include: { event: true } });
  await getDirectorContext(item.event.clubId);
  await db.eventChecklistItem.delete({ where: { id: itemId } });
  revalidatePath(`/director/${item.event.clubId}/events/${item.eventId}`);
}

export async function uploadEventAttachmentAction(eventId: string, formData: FormData): Promise<ActionState> {
  const event = await db.event.findUniqueOrThrow({ where: { id: eventId } });
  await getDirectorContext(event.clubId);

  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) return { error: "Choose a file to upload." };

  try {
    const saved = await saveUploadedFile(file, "attachments");
    await db.eventAttachment.create({
      data: { eventId, filename: saved.filename, url: saved.url, mimeType: saved.mimeType, size: saved.size },
    });
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Upload failed." };
  }

  revalidatePath(`/director/${event.clubId}/events/${eventId}`);
  return { error: null };
}

export async function deleteEventAttachmentAction(attachmentId: string) {
  const attachment = await db.eventAttachment.findUniqueOrThrow({ where: { id: attachmentId }, include: { event: true } });
  await getDirectorContext(attachment.event.clubId);
  await db.eventAttachment.delete({ where: { id: attachmentId } });
  revalidatePath(`/director/${attachment.event.clubId}/events/${attachment.eventId}`);
}

// Marks one registrant Attended or Not Attended on the Attendance page.
// Attended + awardsServiceHours auto-creates/restores a VERIFIED
// ServiceHourRecord at the event's default hours; un-marking removes it —
// this stays in sync automatically per the spec ("saved automatically").
export async function markAttendanceAction(eventId: string, userId: string, attended: boolean) {
  const event = await db.event.findUniqueOrThrow({ where: { id: eventId } });
  const { user } = await getDirectorContext(event.clubId);

  await db.eventRegistration.updateMany({
    where: { eventId, userId },
    data: { status: attended ? "ATTENDED" : "NO_SHOW" },
  });

  if (attended && event.awardsServiceHours) {
    const existing = await db.serviceHourRecord.findFirst({ where: { eventId, userId } });
    if (existing) {
      await db.serviceHourRecord.update({
        where: { id: existing.id },
        data: { hours: event.defaultServiceHours, status: "VERIFIED", approvedById: user.id, approvedAt: new Date() },
      });
    } else {
      await db.serviceHourRecord.create({
        data: {
          userId,
          clubId: event.clubId,
          eventId,
          hours: event.defaultServiceHours,
          status: "VERIFIED",
          approvedById: user.id,
          approvedAt: new Date(),
          taskDescription: event.serviceTaskDescription,
        },
      });
    }
    await checkAndUnlockAchievements(userId);
  } else if (!attended) {
    await db.serviceHourRecord.deleteMany({ where: { eventId, userId } });
  }

  revalidatePath(`/director/${event.clubId}/events/${eventId}/attendance`);
  revalidatePath(`/director/${event.clubId}/attendance`);
  revalidatePath("/service-hours");
}

// Defaults everyone still sitting in "REGISTERED" to ATTENDED once an
// attendance-enabled event's start time has passed — a director shouldn't
// have to manually click every single name; they only need to change the
// handful who actually didn't show up (still fully overridable afterward,
// same as any other attendance mark). Only ever moves people forward from
// REGISTERED, never touches someone already marked ATTENDED/NO_SHOW.
export async function autoMarkAttendedIfPastAction(eventId: string) {
  const event = await db.event.findUniqueOrThrow({ where: { id: eventId } });
  if (!event.attendanceEnabled || event.startAt > new Date()) return { markedCount: 0 };

  const { user } = await getDirectorContext(event.clubId);
  const stillRegistered = await db.eventRegistration.findMany({ where: { eventId, status: "REGISTERED" } });
  if (stillRegistered.length === 0) return { markedCount: 0 };

  await db.eventRegistration.updateMany({
    where: { eventId, status: "REGISTERED" },
    data: { status: "ATTENDED" },
  });

  if (event.awardsServiceHours) {
    const existing = await db.serviceHourRecord.findMany({
      where: { eventId, userId: { in: stillRegistered.map((r) => r.userId) } },
    });
    const existingByUserId = new Map(existing.map((r) => [r.userId, r]));
    await Promise.all(
      stillRegistered.map((r) => {
        const record = existingByUserId.get(r.userId);
        if (record) {
          return db.serviceHourRecord.update({
            where: { id: record.id },
            data: { hours: event.defaultServiceHours, status: "VERIFIED", approvedById: user.id, approvedAt: new Date() },
          });
        }
        return db.serviceHourRecord.create({
          data: {
            userId: r.userId,
            clubId: event.clubId,
            eventId,
            hours: event.defaultServiceHours,
            status: "VERIFIED",
            approvedById: user.id,
            approvedAt: new Date(),
            taskDescription: event.serviceTaskDescription,
          },
        });
      })
    );
    await Promise.all(stillRegistered.map((r) => checkAndUnlockAchievements(r.userId)));
  }

  revalidatePath(`/director/${event.clubId}/events/${eventId}/attendance`);
  revalidatePath(`/director/${event.clubId}/attendance`);
  revalidatePath("/service-hours");
  return { markedCount: stillRegistered.length };
}

export async function updateAttendanceHoursAction(eventId: string, userId: string, hours: number) {
  const event = await db.event.findUniqueOrThrow({ where: { id: eventId } });
  const { user } = await getDirectorContext(event.clubId);
  if (!Number.isFinite(hours) || hours < 0) return;

  const existing = await db.serviceHourRecord.findFirst({ where: { eventId, userId } });
  if (existing) {
    await db.serviceHourRecord.update({ where: { id: existing.id }, data: { hours } });
  } else {
    await db.serviceHourRecord.create({
      data: {
        userId,
        clubId: event.clubId,
        eventId,
        hours,
        status: "VERIFIED",
        approvedById: user.id,
        approvedAt: new Date(),
        taskDescription: event.serviceTaskDescription,
      },
    });
  }
  await checkAndUnlockAchievements(userId);
  revalidatePath(`/director/${event.clubId}/events/${eventId}/attendance`);
  revalidatePath("/service-hours");
}

export async function updateAttendanceNoteAction(eventId: string, userId: string, note: string) {
  const event = await db.event.findUniqueOrThrow({ where: { id: eventId } });
  await getDirectorContext(event.clubId);
  await db.eventRegistration.updateMany({ where: { eventId, userId }, data: { attendanceNote: note.trim() || null } });
  revalidatePath(`/director/${event.clubId}/events/${eventId}/attendance`);
}

"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { getDirectorContext } from "@/lib/director";
import { getSchoolAdminContext } from "@/lib/school-admin";
import { notifySchoolAdmins } from "@/lib/approvals";
import { canActionApprovals } from "@/lib/constants";
import { logAudit } from "@/lib/admin";

export type ApprovalKind = "event" | "clubRegistration";

async function loadClubIdAndSchoolId(kind: ApprovalKind, id: string) {
  if (kind === "event") {
    const event = await db.event.findUniqueOrThrow({ where: { id }, include: { club: true } });
    return { clubId: event.clubId, schoolId: event.club.schoolId, event };
  }
  const registration = await db.clubRegistration.findUniqueOrThrow({ where: { id }, include: { club: true } });
  return { clubId: registration.clubId, schoolId: registration.club.schoolId, registration };
}

// A recurring event proposal can be up to 52 rows sharing one
// recurrenceParentId — approving/rejecting has to move the whole series at
// once, not one occurrence at a time (making an admin click through 52 rows
// to approve one weekly meeting would clearly be wrong; neither the source
// spec nor the original design addressed this, so this is a deliberate
// resolution, not something explicitly asked for).
function eventSeriesWhere(eventId: string, recurrenceParentId: string | null) {
  const parentId = recurrenceParentId ?? eventId;
  return { OR: [{ id: parentId }, { recurrenceParentId: parentId }] };
}

export async function approveAsSponsorAction(kind: ApprovalKind, id: string): Promise<{ error: string | null }> {
  const { clubId, schoolId } = await loadClubIdAndSchoolId(kind, id);
  const { isDirector, user } = await getDirectorContext(clubId);
  if (!isDirector) return { error: "Only the club's Sponsor Teacher can approve this." };

  const now = new Date();
  if (kind === "event") {
    const event = await db.event.findUniqueOrThrow({ where: { id } });
    if (event.approvalStatus !== "PENDING_SPONSOR") return { error: "This isn't awaiting sponsor approval." };
    await db.event.updateMany({
      where: eventSeriesWhere(id, event.recurrenceParentId),
      data: { approvalStatus: "PENDING_ADMIN", sponsorApprovedById: user.id, sponsorApprovedAt: now },
    });
    await logAudit(user.id, "SPONSOR_APPROVE_EVENT", "Event", id, { approvalStatus: "PENDING_SPONSOR" }, { approvalStatus: "PENDING_ADMIN" });
    await notifySchoolAdmins(schoolId, {
      type: "EVENT_PROPOSAL",
      title: "Event proposal needs your approval",
      body: `"${event.title}" has been sponsor-approved and is ready for administrator review.`,
      linkUrl: `/school-admin/${schoolId}/approvals`,
    });
  } else {
    const registration = await db.clubRegistration.findUniqueOrThrow({ where: { id } });
    if (registration.status !== "PENDING_SPONSOR") return { error: "This isn't awaiting sponsor approval." };
    await db.clubRegistration.update({
      where: { id },
      data: { status: "PENDING_ADMIN", sponsorApprovedById: user.id, sponsorApprovedAt: now },
    });
    await logAudit(user.id, "SPONSOR_APPROVE_REGISTRATION", "ClubRegistration", id, { status: "PENDING_SPONSOR" }, { status: "PENDING_ADMIN" });
    await notifySchoolAdmins(schoolId, {
      type: "CLUB_REGISTRATION",
      title: "Club registration needs your approval",
      body: `A club registration has been sponsor-approved and is ready for administrator review.`,
      linkUrl: `/school-admin/${schoolId}/approvals`,
    });
  }

  revalidatePath(`/director/${clubId}`);
  revalidatePath(`/school-admin/${schoolId}/approvals`);
  return { error: null };
}

export async function approveAsAdminAction(kind: ApprovalKind, id: string): Promise<{ error: string | null }> {
  const { clubId, schoolId } = await loadClubIdAndSchoolId(kind, id);
  const { user, isPlatformAdmin, platformRole } = await getSchoolAdminContext(schoolId);
  if (!isPlatformAdmin && !canActionApprovals(platformRole)) {
    return { error: "Only a Principal or Vice Principal can approve this." };
  }

  const now = new Date();
  if (kind === "event") {
    const event = await db.event.findUniqueOrThrow({ where: { id } });
    if (event.approvalStatus !== "PENDING_ADMIN") return { error: "This isn't awaiting administrator approval." };
    await db.event.updateMany({
      where: eventSeriesWhere(id, event.recurrenceParentId),
      data: { approvalStatus: "APPROVED", adminApprovedById: user.id, adminApprovedAt: now },
    });
    await logAudit(user.id, "ADMIN_APPROVE_EVENT", "Event", id, { approvalStatus: "PENDING_ADMIN" }, { approvalStatus: "APPROVED" });
  } else {
    const registration = await db.clubRegistration.findUniqueOrThrow({ where: { id } });
    if (registration.status !== "PENDING_ADMIN") return { error: "This isn't awaiting administrator approval." };
    await db.clubRegistration.update({
      where: { id },
      data: { status: "APPROVED", adminApprovedById: user.id, adminApprovedAt: now },
    });
    await logAudit(user.id, "ADMIN_APPROVE_REGISTRATION", "ClubRegistration", id, { status: "PENDING_ADMIN" }, { status: "APPROVED" });
  }

  revalidatePath(`/director/${clubId}`);
  revalidatePath(`/school-admin/${schoolId}/approvals`);
  revalidatePath("/discover");
  revalidatePath("/home");
  revalidatePath("/calendar");
  return { error: null };
}

export async function rejectApprovalAction(kind: ApprovalKind, id: string, reason: string): Promise<{ error: string | null }> {
  const { clubId, schoolId } = await loadClubIdAndSchoolId(kind, id);

  const currentStatus =
    kind === "event"
      ? (await db.event.findUniqueOrThrow({ where: { id }, select: { approvalStatus: true } })).approvalStatus
      : (await db.clubRegistration.findUniqueOrThrow({ where: { id }, select: { status: true } })).status;

  let actorId: string;
  if (currentStatus === "PENDING_SPONSOR") {
    const { isDirector, user } = await getDirectorContext(clubId);
    if (!isDirector) return { error: "Only the club's Sponsor Teacher can reject this at this stage." };
    actorId = user.id;
  } else if (currentStatus === "PENDING_ADMIN") {
    const { isPlatformAdmin, platformRole, user } = await getSchoolAdminContext(schoolId);
    if (!isPlatformAdmin && !canActionApprovals(platformRole)) {
      return { error: "Only a Principal or Vice Principal can reject this at this stage." };
    }
    actorId = user.id;
  } else {
    return { error: "This isn't pending approval." };
  }

  if (kind === "event") {
    const event = await db.event.findUniqueOrThrow({ where: { id } });
    await db.event.updateMany({
      where: eventSeriesWhere(id, event.recurrenceParentId),
      data: { approvalStatus: "REJECTED", rejectionReason: reason || null },
    });
    await logAudit(actorId, "REJECT_EVENT", "Event", id, { approvalStatus: currentStatus }, { approvalStatus: "REJECTED" }, reason || undefined);
    await db.notification.create({
      data: {
        userId: event.createdById,
        type: "EVENT_PROPOSAL",
        title: "Event proposal not approved",
        body: reason || `"${event.title}" was not approved.`,
        linkUrl: `/director/${clubId}/events/${event.id}`,
      },
    });
  } else {
    const registration = await db.clubRegistration.findUniqueOrThrow({ where: { id } });
    await db.clubRegistration.update({ where: { id }, data: { status: "REJECTED", rejectionReason: reason || null } });
    await logAudit(actorId, "REJECT_REGISTRATION", "ClubRegistration", id, { status: currentStatus }, { status: "REJECTED" }, reason || undefined);
    await db.notification.create({
      data: {
        userId: registration.submittedById,
        type: "CLUB_REGISTRATION",
        title: "Club registration not approved",
        body: reason || "Your club registration was not approved.",
        linkUrl: `/director/${clubId}/registration`,
      },
    });
  }

  revalidatePath(`/director/${clubId}`);
  revalidatePath(`/school-admin/${schoolId}/approvals`);
  return { error: null };
}

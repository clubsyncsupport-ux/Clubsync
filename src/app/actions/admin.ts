"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import { requireAdmin, logAudit } from "@/lib/admin";
import { getSchoolAdminContextForClub, requireSchoolAccessForUser } from "@/lib/school-admin";
import { checkAndUnlockAchievements } from "@/lib/achievements";

// ---- Users ----
// suspend/reactivate/delete are usable by a School Admin, but only against a
// STUDENT-role account at their own school — requireSchoolAccessForUser
// re-derives and re-checks the target's schoolId/platformRole server-side on
// every call, so a School Admin can never reach a Platform Admin, another
// School Admin, or a student at a different school no matter what userId a
// client sends.

export async function suspendUserAction(userId: string) {
  const { me } = await requireSchoolAccessForUser(userId);
  await db.user.update({ where: { id: userId }, data: { accountStatus: "SUSPENDED" } });
  await db.session.deleteMany({ where: { userId } });
  await logAudit(me.id, "SUSPEND_USER", "User", userId);
  revalidatePath("/admin/users");
  revalidatePath(`/admin/users/${userId}`);
  if (me.platformRole === "SCHOOL_ADMIN" && me.schoolAdminOfId) {
    revalidatePath(`/school-admin/${me.schoolAdminOfId}/students`);
    revalidatePath(`/school-admin/${me.schoolAdminOfId}/students/${userId}`);
  }
}

export async function reactivateUserAction(userId: string) {
  const { me } = await requireSchoolAccessForUser(userId);
  await db.user.update({ where: { id: userId }, data: { accountStatus: "ACTIVE" } });
  await logAudit(me.id, "REACTIVATE_USER", "User", userId);
  revalidatePath("/admin/users");
  revalidatePath(`/admin/users/${userId}`);
  if (me.platformRole === "SCHOOL_ADMIN" && me.schoolAdminOfId) {
    revalidatePath(`/school-admin/${me.schoolAdminOfId}/students`);
    revalidatePath(`/school-admin/${me.schoolAdminOfId}/students/${userId}`);
  }
}

export async function deleteUserAction(userId: string) {
  const { me } = await requireSchoolAccessForUser(userId);
  await db.user.delete({ where: { id: userId } });
  await logAudit(me.id, "DELETE_USER", "User", userId);
  revalidatePath("/admin/users");
  if (me.platformRole === "SCHOOL_ADMIN" && me.schoolAdminOfId) {
    revalidatePath(`/school-admin/${me.schoolAdminOfId}/students`);
    redirect(`/school-admin/${me.schoolAdminOfId}/students`);
  }
  redirect("/admin/users");
}

// Stand-in for self-service password reset until a real email provider is
// connected (see the note on AuthProvider.requestPasswordReset). The admin
// generates a temporary password here and relays it to the account owner
// directly — unlike the old self-service flow, this requires the admin to
// actually know who they're handing access to.
const TEMP_PASSWORD_CHARS = "ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789";

export async function adminResetPasswordAction(userId: string): Promise<{ tempPassword: string }> {
  const { me } = await requireSchoolAccessForUser(userId);

  const tempPassword = Array.from(crypto.randomFillSync(new Uint8Array(12)))
    .map((n) => TEMP_PASSWORD_CHARS[n % TEMP_PASSWORD_CHARS.length])
    .join("");
  const passwordHash = await bcrypt.hash(tempPassword, 10);

  await db.user.update({ where: { id: userId }, data: { passwordHash } });
  await db.session.deleteMany({ where: { userId } });
  await logAudit(me.id, "ADMIN_RESET_PASSWORD", "User", userId);

  return { tempPassword };
}

export type GrantAdminState = { error: string | null; success?: boolean };

export async function grantAdminByIdentifierAction(_prev: GrantAdminState, formData: FormData): Promise<GrantAdminState> {
  const admin = await requireAdmin();
  const identifier = String(formData.get("identifier") ?? "").trim().toLowerCase();
  if (!identifier) return { error: "Enter an email." };

  const user = await db.user.findUnique({ where: { email: identifier } });
  if (!user) return { error: "No account found with that email." };

  await db.user.update({ where: { id: user.id }, data: { platformRole: "PLATFORM_ADMIN" } });
  await logAudit(admin.id, "SET_PLATFORM_ROLE", "User", user.id, undefined, { role: "PLATFORM_ADMIN" });
  revalidatePath("/admin/settings");
  return { error: null, success: true };
}

export async function setPlatformRoleAction(userId: string, role: "STUDENT" | "PLATFORM_ADMIN") {
  const admin = await requireAdmin();
  // Prevent an admin from accidentally revoking their own access — if
  // they're the only admin left, that would lock everyone out of /admin.
  if (userId === admin.id && role === "STUDENT") return;
  await db.user.update({ where: { id: userId }, data: { platformRole: role } });
  await logAudit(admin.id, "SET_PLATFORM_ROLE", "User", userId, undefined, { role });
  revalidatePath("/admin/users");
  revalidatePath(`/admin/users/${userId}`);
  revalidatePath("/admin/settings");
}

// ---- Teacher approval ----
// A STAFF account can't create a club (see createClubAction) until a
// Platform Admin approves it here — without this gate, a student could
// pick "Teacher" at signup to skip the supervisor-vouching a
// student-created club otherwise requires.

export async function approveStaffAction(userId: string) {
  const admin = await requireAdmin();
  await db.user.update({ where: { id: userId, accountKind: "STAFF" }, data: { staffApprovalStatus: "APPROVED" } });
  await logAudit(admin.id, "APPROVE_STAFF", "User", userId);
  revalidatePath("/admin/settings");
}

export async function rejectStaffAction(userId: string) {
  const admin = await requireAdmin();
  await db.user.update({ where: { id: userId, accountKind: "STAFF" }, data: { staffApprovalStatus: "REJECTED" } });
  await logAudit(admin.id, "REJECT_STAFF", "User", userId);
  revalidatePath("/admin/settings");
}

// ---- Schools ----

export type SchoolFormState = { error: string | null; success?: boolean };

export async function createSchoolAction(_prev: SchoolFormState, formData: FormData): Promise<SchoolFormState> {
  const admin = await requireAdmin();
  const name = String(formData.get("name") ?? "").trim();
  const city = String(formData.get("city") ?? "").trim() || null;
  const region = String(formData.get("region") ?? "").trim() || null;
  const country = String(formData.get("country") ?? "").trim() || null;
  if (!name) return { error: "Enter a school name." };

  const existing = await db.school.findUnique({ where: { name } });
  if (existing) return { error: "A school with that name already exists." };

  const school = await db.school.create({ data: { name, city, region, country } });
  await logAudit(admin.id, "CREATE_SCHOOL", "School", school.id, undefined, { name, city, region, country });
  revalidatePath("/admin/schools");
  redirect(`/admin/schools/${school.id}`);
}

export async function updateSchoolAction(schoolId: string, _prev: SchoolFormState, formData: FormData): Promise<SchoolFormState> {
  const admin = await requireAdmin();
  const name = String(formData.get("name") ?? "").trim();
  const city = String(formData.get("city") ?? "").trim() || null;
  const region = String(formData.get("region") ?? "").trim() || null;
  const country = String(formData.get("country") ?? "").trim() || null;
  if (!name) return { error: "Enter a school name." };

  const before = await db.school.findUniqueOrThrow({ where: { id: schoolId } });
  const dup = await db.school.findFirst({ where: { name, NOT: { id: schoolId } } });
  if (dup) return { error: "A school with that name already exists." };

  await db.school.update({ where: { id: schoolId }, data: { name, city, region, country } });
  await logAudit(
    admin.id,
    "UPDATE_SCHOOL",
    "School",
    schoolId,
    { name: before.name, city: before.city, region: before.region, country: before.country },
    { name, city, region, country }
  );
  revalidatePath("/admin/schools");
  revalidatePath(`/admin/schools/${schoolId}`);
  return { error: null, success: true };
}

export async function deleteSchoolAction(schoolId: string): Promise<{ error: string | null }> {
  const admin = await requireAdmin();
  const school = await db.school.findUniqueOrThrow({
    where: { id: schoolId },
    include: { _count: { select: { users: true, clubs: true } } },
  });
  if (school._count.users > 0 || school._count.clubs > 0) {
    return { error: "This school still has students and/or clubs — remove or transfer them first." };
  }
  await db.school.delete({ where: { id: schoolId } });
  await logAudit(admin.id, "DELETE_SCHOOL", "School", schoolId, { name: school.name });
  revalidatePath("/admin/schools");
  return { error: null };
}

export async function assignSchoolAdminAction(schoolId: string, _prev: SchoolFormState, formData: FormData): Promise<SchoolFormState> {
  const admin = await requireAdmin();
  const identifier = String(formData.get("identifier") ?? "").trim().toLowerCase();
  if (!identifier) return { error: "Enter an email." };

  const user = await db.user.findUnique({ where: { email: identifier } });
  if (!user) return { error: "No account found with that email." };
  if (user.platformRole === "PLATFORM_ADMIN") return { error: "That account is already a Platform Admin." };

  await db.user.update({ where: { id: user.id }, data: { platformRole: "SCHOOL_ADMIN", schoolAdminOfId: schoolId } });
  await logAudit(admin.id, "ASSIGN_SCHOOL_ADMIN", "User", user.id, undefined, { schoolId });
  revalidatePath(`/admin/schools/${schoolId}`);
  revalidatePath("/admin/schools");
  return { error: null, success: true };
}

export async function reassignSchoolAdminAction(userId: string, newSchoolId: string) {
  const admin = await requireAdmin();
  const user = await db.user.findUniqueOrThrow({ where: { id: userId } });
  if (user.platformRole !== "SCHOOL_ADMIN") return;
  const previousSchoolId = user.schoolAdminOfId;
  await db.user.update({ where: { id: userId }, data: { schoolAdminOfId: newSchoolId } });
  await logAudit(admin.id, "REASSIGN_SCHOOL_ADMIN", "User", userId, { schoolId: previousSchoolId }, { schoolId: newSchoolId });
  if (previousSchoolId) revalidatePath(`/admin/schools/${previousSchoolId}`);
  revalidatePath(`/admin/schools/${newSchoolId}`);
  revalidatePath("/admin/schools");
}

export async function removeSchoolAdminAction(userId: string) {
  const admin = await requireAdmin();
  const user = await db.user.findUniqueOrThrow({ where: { id: userId } });
  if (user.platformRole !== "SCHOOL_ADMIN") return;
  const previousSchoolId = user.schoolAdminOfId;
  await db.user.update({ where: { id: userId }, data: { platformRole: "STUDENT", schoolAdminOfId: null } });
  await logAudit(admin.id, "REMOVE_SCHOOL_ADMIN", "User", userId, { schoolId: previousSchoolId }, undefined);
  if (previousSchoolId) revalidatePath(`/admin/schools/${previousSchoolId}`);
  revalidatePath("/admin/schools");
}

// ---- Clubs ----
// Every action below is reachable from both /admin/clubs/[clubId] (Platform
// Admin only) and /school-admin/[schoolId]/clubs/[clubId] (School Admin at
// their own school, or Platform Admin) via the shared <ClubAdminActions>
// component. getSchoolAdminContextForClub re-derives the club's schoolId
// server-side on every call — a School Admin can never touch a club at
// another school no matter what clubId a client sends.

function revalidateClubPaths(clubId: string, schoolId: string, isPlatformAdmin: boolean) {
  revalidatePath("/admin/clubs");
  revalidatePath(`/admin/clubs/${clubId}`);
  if (!isPlatformAdmin) {
    revalidatePath(`/school-admin/${schoolId}/clubs`);
    revalidatePath(`/school-admin/${schoolId}/clubs/${clubId}`);
  }
}

export async function archiveClubAction(clubId: string) {
  const { club, school, user, isPlatformAdmin } = await getSchoolAdminContextForClub(clubId);
  await db.club.update({ where: { id: clubId }, data: { status: "ARCHIVED" } });
  await logAudit(user.id, "ARCHIVE_CLUB", "Club", clubId);
  revalidateClubPaths(club.id, school.id, isPlatformAdmin);
}

export async function restoreClubAction(clubId: string) {
  const { club, school, user, isPlatformAdmin } = await getSchoolAdminContextForClub(clubId);
  await db.club.update({ where: { id: clubId }, data: { status: "ACTIVE" } });
  await logAudit(user.id, "RESTORE_CLUB", "Club", clubId);
  revalidateClubPaths(club.id, school.id, isPlatformAdmin);
}

export async function deleteClubAction(clubId: string) {
  const { school, user, isPlatformAdmin } = await getSchoolAdminContextForClub(clubId);
  await db.club.delete({ where: { id: clubId } });
  await logAudit(user.id, "DELETE_CLUB", "Club", clubId);
  revalidatePath("/admin/clubs");
  if (!isPlatformAdmin) {
    revalidatePath(`/school-admin/${school.id}/clubs`);
    redirect(`/school-admin/${school.id}/clubs`);
  }
  redirect("/admin/clubs");
}

export async function transferClubOwnershipAction(clubId: string, newDirectorUserId: string) {
  const { club, school, user, isPlatformAdmin } = await getSchoolAdminContextForClub(clubId);
  await db.$transaction([
    db.clubMembership.updateMany({ where: { clubId, role: "DIRECTOR" }, data: { role: "OFFICER" } }),
    db.clubMembership.upsert({
      where: { userId_clubId: { userId: newDirectorUserId, clubId } },
      update: { role: "DIRECTOR", status: "ACTIVE" },
      create: { userId: newDirectorUserId, clubId, role: "DIRECTOR", status: "ACTIVE" },
    }),
  ]);
  await logAudit(user.id, "TRANSFER_OWNERSHIP", "Club", clubId, undefined, { newDirectorUserId });
  revalidateClubPaths(club.id, school.id, isPlatformAdmin);
}

export async function mergeClubsAction(sourceClubId: string, targetClubId: string) {
  const { school, user, isPlatformAdmin } = await getSchoolAdminContextForClub(sourceClubId);
  if (sourceClubId === targetClubId) return;

  // The source club's school is already verified above; also verify the
  // *target* club belongs to the same school — without this, a School Admin
  // could merge another school's club into their own by passing an
  // arbitrary targetClubId.
  const targetClub = await db.club.findUniqueOrThrow({ where: { id: targetClubId } });
  if (targetClub.schoolId !== school.id) {
    throw new Error("Target club must belong to the same school.");
  }

  await db.$transaction(async (tx) => {
    const sourceMembers = await tx.clubMembership.findMany({ where: { clubId: sourceClubId } });
    for (const m of sourceMembers) {
      await tx.clubMembership.upsert({
        where: { userId_clubId: { userId: m.userId, clubId: targetClubId } },
        update: {},
        create: { userId: m.userId, clubId: targetClubId, role: m.role === "DIRECTOR" ? "OFFICER" : m.role, status: m.status },
      });
    }
    await tx.event.updateMany({ where: { clubId: sourceClubId }, data: { clubId: targetClubId } });
    await tx.announcement.updateMany({ where: { clubId: sourceClubId }, data: { clubId: targetClubId } });
    await tx.serviceHourRecord.updateMany({ where: { clubId: sourceClubId }, data: { clubId: targetClubId } });
    await tx.club.update({ where: { id: sourceClubId }, data: { status: "MERGED", mergedIntoId: targetClubId } });
  });

  await logAudit(user.id, "MERGE_CLUBS", "Club", sourceClubId, undefined, { mergedIntoId: targetClubId });
  revalidatePath("/admin/clubs");
  if (!isPlatformAdmin) {
    revalidatePath(`/school-admin/${school.id}/clubs`);
    redirect(`/school-admin/${school.id}/clubs/${targetClubId}`);
  }
  redirect(`/admin/clubs/${targetClubId}`);
}

// ---- Events ----

export async function adminDeleteEventAction(eventId: string) {
  const admin = await requireAdmin();
  await db.event.delete({ where: { id: eventId } });
  await logAudit(admin.id, "DELETE_EVENT", "Event", eventId);
  revalidatePath("/admin/events");
}

export async function adminCancelEventAction(eventId: string) {
  const admin = await requireAdmin();
  await db.event.update({ where: { id: eventId }, data: { status: "CANCELLED" } });
  await logAudit(admin.id, "CANCEL_EVENT", "Event", eventId);
  revalidatePath("/admin/events");
}

// ---- Service Hours ----

export async function adminUpdateServiceHoursAction(recordId: string, hours: number, reason: string) {
  const before = await db.serviceHourRecord.findUniqueOrThrow({ where: { id: recordId } });
  const { me } = await requireSchoolAccessForUser(before.userId);
  await db.serviceHourRecord.update({ where: { id: recordId }, data: { hours } });
  await logAudit(me.id, "EDIT_SERVICE_HOURS", "ServiceHourRecord", recordId, { hours: before.hours }, { hours }, reason);
  revalidatePath("/admin/service-hours");
  revalidatePath(`/admin/users/${before.userId}`);
  if (me.schoolAdminOfId) revalidatePath(`/school-admin/${me.schoolAdminOfId}/students/${before.userId}`);
}

export async function adminDeleteServiceHoursAction(recordId: string, reason: string) {
  const before = await db.serviceHourRecord.findUniqueOrThrow({ where: { id: recordId } });
  const { me } = await requireSchoolAccessForUser(before.userId);
  await db.serviceHourRecord.delete({ where: { id: recordId } });
  await logAudit(me.id, "DELETE_SERVICE_HOURS", "ServiceHourRecord", recordId, before, undefined, reason);
  revalidatePath("/admin/service-hours");
  revalidatePath(`/admin/users/${before.userId}`);
  if (me.schoolAdminOfId) revalidatePath(`/school-admin/${me.schoolAdminOfId}/students/${before.userId}`);
}

export async function adminVerifyServiceHoursAction(recordId: string) {
  const admin = await requireAdmin();
  const record = await db.serviceHourRecord.update({
    where: { id: recordId },
    data: { status: "VERIFIED", approvedById: admin.id, approvedAt: new Date() },
  });
  await logAudit(admin.id, "VERIFY_SERVICE_HOURS", "ServiceHourRecord", recordId, { status: "PENDING" }, { status: "VERIFIED" });
  await checkAndUnlockAchievements(record.userId);
  await db.notification.create({
    data: {
      userId: record.userId,
      type: "SERVICE_HOURS",
      title: "Service hours verified",
      body: `Your ${record.hours} self-reported hour${record.hours === 1 ? "" : "s"} ${record.organizationName ? `at ${record.organizationName} ` : ""}${record.hours === 1 ? "was" : "were"} verified.`,
      linkUrl: "/service-hours",
    },
  });
  revalidatePath("/admin/service-hours");
  revalidatePath("/service-hours");
}

export async function adminRejectServiceHoursAction(recordId: string, reason: string) {
  const admin = await requireAdmin();
  const record = await db.serviceHourRecord.update({
    where: { id: recordId },
    data: { status: "REJECTED" },
  });
  await logAudit(admin.id, "REJECT_SERVICE_HOURS", "ServiceHourRecord", recordId, { status: "PENDING" }, { status: "REJECTED" }, reason);
  await db.notification.create({
    data: {
      userId: record.userId,
      type: "SERVICE_HOURS",
      title: "Service hours not verified",
      body: reason || "Your self-reported hours could not be verified.",
      linkUrl: "/service-hours",
    },
  });
  revalidatePath("/admin/service-hours");
  revalidatePath("/service-hours");
}

// ---- Manual service-hour correction ----

export type AddHoursState = { error: string | null; success?: boolean };

export async function adminAddServiceHoursAction(userId: string, _prev: AddHoursState, formData: FormData): Promise<AddHoursState> {
  const { me } = await requireSchoolAccessForUser(userId);
  const hours = Number(formData.get("hours"));
  const reason = String(formData.get("reason") ?? "").trim();
  const taskDescription = String(formData.get("taskDescription") ?? "").trim();
  if (!Number.isFinite(hours) || hours <= 0) return { error: "Enter a valid number of hours." };
  if (!reason) return { error: "A reason is required so there's a record of why these hours were added manually." };

  const record = await db.serviceHourRecord.create({
    data: {
      userId,
      hours,
      taskDescription: taskDescription || null,
      status: "VERIFIED",
      approvedById: me.id,
      approvedAt: new Date(),
    },
  });
  await logAudit(me.id, "ADD_SERVICE_HOURS", "ServiceHourRecord", record.id, undefined, { hours }, reason);
  await checkAndUnlockAchievements(userId);
  revalidatePath("/admin/service-hours");
  revalidatePath(`/admin/users/${userId}`);
  revalidatePath(`/school-admin/${me.schoolAdminOfId}/students/${userId}`);
  revalidatePath("/service-hours");
  return { error: null, success: true };
}

// ---- Account merging ----
// For a student who ends up with two accounts (e.g. signed up once, then again
// later with a different email via "Continue with Google") — moves club
// memberships, service-hour records, and event registrations from `sourceUserId`
// into `targetUserId`, then marks the source MERGED (blocked from logging in,
// never deleted, so the transfer stays auditable and reversible-by-hand if needed).
// Deliberately does NOT deduplicate service-hour records that exist on both
// accounts for the same event — merging can genuinely double up an attended
// event's hours, and it's safer to leave both records for a human to review and
// remove the extra one via adminDeleteServiceHoursAction than to guess which to drop.

export type MergePreview = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  clubCount: number;
  verifiedHours: number;
  eventCount: number;
};

export async function previewMergeCandidateAction(targetUserId: string, email: string): Promise<{ error: string | null; candidate?: MergePreview }> {
  const { me, targetUser: target } = await requireSchoolAccessForUser(targetUserId);
  const identifier = email.trim().toLowerCase();
  if (!identifier) return { error: "Enter an email." };

  const candidate = await db.user.findUnique({ where: { email: identifier } });
  if (!candidate) return { error: "No account found with that email." };
  if (candidate.id === targetUserId) return { error: "That's the same account." };
  if (candidate.accountStatus === "MERGED") return { error: "That account has already been merged into another one." };
  if (candidate.schoolId !== target.schoolId) return { error: "Both accounts must be at the same school." };
  // Re-verify access to the *candidate* side too — a School Admin can only ever
  // reach STUDENT accounts at their own school, same as every other admin action.
  if (me.platformRole === "SCHOOL_ADMIN" && candidate.platformRole !== "STUDENT") {
    return { error: "That account can't be merged by a School Admin." };
  }

  const [clubCount, hoursAgg, eventCount] = await Promise.all([
    db.clubMembership.count({ where: { userId: candidate.id, status: "ACTIVE" } }),
    db.serviceHourRecord.aggregate({ where: { userId: candidate.id, status: "VERIFIED" }, _sum: { hours: true } }),
    db.eventRegistration.count({ where: { userId: candidate.id, status: "ATTENDED" } }),
  ]);

  return {
    error: null,
    candidate: {
      id: candidate.id,
      firstName: candidate.firstName,
      lastName: candidate.lastName,
      email: candidate.email,
      clubCount,
      verifiedHours: hoursAgg._sum.hours ?? 0,
      eventCount,
    },
  };
}

export async function mergeUserAccountsAction(targetUserId: string, sourceUserId: string): Promise<{ error: string | null }> {
  if (targetUserId === sourceUserId) return { error: "Can't merge an account into itself." };
  const { me, targetUser: target } = await requireSchoolAccessForUser(targetUserId);
  const { targetUser: source } = await requireSchoolAccessForUser(sourceUserId);
  if (source.schoolId !== target.schoolId) return { error: "Both accounts must be at the same school." };
  if (source.accountStatus === "MERGED") return { error: "That account has already been merged." };

  await db.$transaction(async (tx) => {
    const sourceMemberships = await tx.clubMembership.findMany({ where: { userId: sourceUserId } });
    for (const m of sourceMemberships) {
      await tx.clubMembership.upsert({
        where: { userId_clubId: { userId: targetUserId, clubId: m.clubId } },
        update: {},
        create: { userId: targetUserId, clubId: m.clubId, role: m.role, status: m.status },
      });
    }

    // Every service-hour record moves over as-is, duplicates included on purpose (see note above).
    await tx.serviceHourRecord.updateMany({ where: { userId: sourceUserId }, data: { userId: targetUserId } });

    // Event registrations can't duplicate (eventId, userId is unique) — if the
    // target already has one for a given event, leave the source's copy behind
    // on the now-merged account rather than erroring the whole merge.
    const sourceRegs = await tx.eventRegistration.findMany({ where: { userId: sourceUserId } });
    for (const r of sourceRegs) {
      const existing = await tx.eventRegistration.findUnique({ where: { eventId_userId: { eventId: r.eventId, userId: targetUserId } } });
      if (!existing) {
        await tx.eventRegistration.update({ where: { id: r.id }, data: { userId: targetUserId } });
      }
    }

    await tx.session.deleteMany({ where: { userId: sourceUserId } });
    await tx.user.update({ where: { id: sourceUserId }, data: { accountStatus: "MERGED", mergedIntoId: targetUserId } });
  });

  await checkAndUnlockAchievements(targetUserId);
  await logAudit(me.id, "MERGE_USERS", "User", sourceUserId, undefined, { mergedIntoId: targetUserId });
  revalidatePath("/admin/users");
  revalidatePath(`/admin/users/${targetUserId}`);
  if (me.schoolAdminOfId) revalidatePath(`/school-admin/${me.schoolAdminOfId}/students/${targetUserId}`);
  return { error: null };
}

import "server-only";
import { notFound, redirect } from "next/navigation";
import { requireUser } from "@/lib/auth/session";
import { db } from "@/lib/db";

// Loads a school and verifies the current user is its assigned School Admin
// (or a Platform Admin, who has full power in every school). Every
// /school-admin/[schoolId]/* page should call this first.
export async function getSchoolAdminContext(schoolId: string) {
  const authUser = await requireUser();
  const [school, me] = await Promise.all([
    db.school.findUnique({ where: { id: schoolId } }),
    db.user.findUniqueOrThrow({ where: { id: authUser.id } }),
  ]);

  if (!school) notFound();

  const isPlatformAdmin = me.platformRole === "PLATFORM_ADMIN";
  const isSchoolAdminHere = me.platformRole === "SCHOOL_ADMIN" && me.schoolAdminOfId === schoolId;
  const isAuthorized = isSchoolAdminHere || isPlatformAdmin;
  if (!isAuthorized) notFound();

  return { school, user: authUser, isPlatformAdmin };
}

// For actions/pages that start from a club (or another school-owned resource)
// rather than a schoolId directly — loads the club, derives its schoolId, then
// runs the exact same authorization check as getSchoolAdminContext. Never
// trusts a client-supplied schoolId; always derives it server-side from the
// resource itself.
export async function getSchoolAdminContextForClub(clubId: string) {
  const club = await db.club.findUnique({ where: { id: clubId } });
  if (!club) notFound();
  const { school, user, isPlatformAdmin } = await getSchoolAdminContext(club.schoolId);
  return { club, school, user, isPlatformAdmin };
}

// For user-management actions (suspend/reactivate/delete) that a School Admin
// may only ever run against a student at their own school — never against a
// Platform Admin, another School Admin, or anyone at a different school. The
// target's own schoolId/platformRole are always re-derived server-side here,
// never trusted from the caller.
export async function requireSchoolAccessForUser(targetUserId: string) {
  const authUser = await requireUser();
  const [me, targetUser] = await Promise.all([
    db.user.findUniqueOrThrow({ where: { id: authUser.id } }),
    db.user.findUniqueOrThrow({ where: { id: targetUserId } }),
  ]);

  if (me.platformRole === "PLATFORM_ADMIN") return { me, targetUser, isPlatformAdmin: true };

  const isSchoolAdminForTarget =
    me.platformRole === "SCHOOL_ADMIN" &&
    me.schoolAdminOfId !== null &&
    me.schoolAdminOfId === targetUser.schoolId &&
    targetUser.platformRole === "STUDENT";
  if (isSchoolAdminForTarget) return { me, targetUser, isPlatformAdmin: false };

  redirect("/access-denied");
}

// Same shape as requireSchoolAccessForUser, but for approving/rejecting a
// pending Teacher account rather than moderating a student — the target
// check is accountKind STAFF (not platformRole STUDENT) since those are
// independent fields. A School Admin can only ever reach a pending teacher
// at their own school; a Platform Admin can reach any of them.
export async function requireSchoolAccessForStaffApproval(targetUserId: string) {
  const authUser = await requireUser();
  const [me, targetUser] = await Promise.all([
    db.user.findUniqueOrThrow({ where: { id: authUser.id } }),
    db.user.findUniqueOrThrow({ where: { id: targetUserId } }),
  ]);

  if (me.platformRole === "PLATFORM_ADMIN") return { me, targetUser, isPlatformAdmin: true };

  const isSchoolAdminForTarget =
    me.platformRole === "SCHOOL_ADMIN" &&
    me.schoolAdminOfId !== null &&
    me.schoolAdminOfId === targetUser.schoolId &&
    targetUser.accountKind === "STAFF";
  if (isSchoolAdminForTarget) return { me, targetUser, isPlatformAdmin: false };

  redirect("/access-denied");
}

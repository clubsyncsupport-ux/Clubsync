import "server-only";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth/session";
import { db } from "@/lib/db";

// Loads a club and verifies the current user is its Director/Officer (or a
// Platform Admin). Every /director/[clubId]/* page should call this first.
export async function getDirectorContext(clubId: string) {
  const authUser = await requireUser();
  const [club, membership, me] = await Promise.all([
    db.club.findUnique({ where: { id: clubId } }),
    db.clubMembership.findUnique({ where: { userId_clubId: { userId: authUser.id, clubId } } }),
    db.user.findUniqueOrThrow({ where: { id: authUser.id } }),
  ]);

  if (!club) notFound();

  const isPlatformAdmin = me.platformRole === "PLATFORM_ADMIN";
  // A School Admin gets full Director power in every club at their own
  // school — same "step in and help" precedent as Platform Admin below, just
  // scoped to the one school they administer.
  const isSchoolAdminHere = me.platformRole === "SCHOOL_ADMIN" && me.schoolAdminOfId === club.schoolId;
  const isAuthorized = (membership && (membership.role === "DIRECTOR" || membership.role === "OFFICER")) || isPlatformAdmin || isSchoolAdminHere;
  if (!isAuthorized) notFound();

  // Platform Admins (and, at their own school, School Admins) get full
  // Director-level power in every club — e.g. to step in and help a director
  // who's stuck or unreachable — not just Officer-level view access.
  return { club, user: authUser, isDirector: membership?.role === "DIRECTOR" || isPlatformAdmin || isSchoolAdminHere };
}

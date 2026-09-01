import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth/session";
import { db } from "@/lib/db";

// Fetches the full DB record for the logged-in user, with the relations
// nearly every page needs (school, active club memberships). Redirects to
// onboarding if the account hasn't finished profile setup yet.
export async function getViewer() {
  const authUser = await requireUser();
  const user = await db.user.findUniqueOrThrow({
    where: { id: authUser.id },
    include: {
      school: true,
      memberships: { where: { status: "ACTIVE" }, include: { club: true }, orderBy: { joinedAt: "asc" } },
    },
  });
  if (user.accountStatus === "SUSPENDED") redirect("/suspended");
  if (user.accountStatus === "MERGED") redirect("/merged");
  if (!user.schoolId) redirect("/onboarding");
  return user;
}

export type Viewer = Awaited<ReturnType<typeof getViewer>>;

/** getViewer()'s `memberships` relation is ACTIVE-only (the right default for nav/counts),
 * which means a pending join request is otherwise invisible everywhere — this fills that gap
 * for pages that need to show "request sent" instead of silently falling back to "not joined". */
export async function getPendingMembershipClubIds(userId: string) {
  const pending = await db.clubMembership.findMany({ where: { userId, status: "PENDING" }, select: { clubId: true } });
  return new Set(pending.map((m) => m.clubId));
}

export function directorClubs(viewer: Viewer) {
  return viewer.memberships.filter((m) => m.role === "DIRECTOR" || m.role === "OFFICER").map((m) => m.club);
}

// A STAFF account (a teacher who signed up directly as a Club Director, no
// personal student profile) has nothing to do on the student-only pages
// under (app) — Home, Calendar, Hours, Discover all assume a real student
// profile. Settings and Notifications stay reachable for every account kind,
// so this is called individually by the student-only pages, not the shared
// (app) layout itself.
export function requireStudentViewer(viewer: Viewer) {
  if (viewer.accountKind === "STAFF") redirect("/teacher");
  return viewer;
}

// Where a user should land after login / visiting "/" — STAFF accounts
// (teachers, with no student profile) always land on their account-level
// Teacher Dashboard first, whether they have zero, one, or several clubs —
// they pick a specific club from there, same as the profile switcher.
export async function resolveLandingPath(userId: string): Promise<string> {
  const user = await db.user.findUnique({ where: { id: userId } });
  if (!user) return "/welcome";
  // A School Admin account with no personal student/staff profile has no
  // onboarding to complete and no student app to land in — send them
  // straight to the school they administer instead of the onboarding trap.
  if (user.platformRole === "SCHOOL_ADMIN" && user.schoolAdminOfId && !user.schoolId) return `/school-admin/${user.schoolAdminOfId}`;
  if (!user.schoolId) return "/onboarding";
  if (user.accountKind === "STAFF") return "/teacher";
  return "/home";
}

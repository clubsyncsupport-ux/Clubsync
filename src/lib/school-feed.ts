import "server-only";
import { db } from "@/lib/db";
import { isSchoolAdminTier } from "@/lib/constants";

type Poster = {
  id: string;
  accountKind: string;
  platformRole: string;
  schoolId: string | null;
  schoolAdminOfId: string | null;
  staffApprovalStatus: string | null;
};

// Who can post to a school's feed: approved teachers/sponsor teachers at that
// school, that school's Principal / Vice Principal / School Admin, and the
// platform admin. Students — including club officers — only read it.
export function canPostSchoolFeed(user: Poster, schoolId: string): boolean {
  if (user.platformRole === "PLATFORM_ADMIN") return true;
  if (isSchoolAdminTier(user.platformRole)) return user.schoolAdminOfId === schoolId;
  // Teachers who signed up themselves sit at PENDING until a platform admin
  // approves them (and REJECTED if not) — neither should be able to broadcast
  // to the school. Older/seeded teacher accounts have no status at all and are
  // treated as approved.
  const awaitingOrDenied = user.staffApprovalStatus === "PENDING" || user.staffApprovalStatus === "REJECTED";
  return user.accountKind === "STAFF" && !awaitingOrDenied && user.schoolId === schoolId;
}

export function canDeleteSchoolFeedPost(user: Poster, post: { authorId: string; schoolId: string }): boolean {
  if (user.id === post.authorId) return true;
  if (user.platformRole === "PLATFORM_ADMIN") return true;
  return isSchoolAdminTier(user.platformRole) && user.schoolAdminOfId === post.schoolId;
}

export async function getSchoolFeed(schoolId: string, limit = 40) {
  return db.schoolAnnouncement.findMany({
    where: { schoolId },
    orderBy: { createdAt: "desc" },
    take: limit,
    select: {
      id: true,
      body: true,
      imageUrl: true,
      createdAt: true,
      authorId: true,
      schoolId: true,
      author: { select: { firstName: true, lastName: true, avatarUrl: true, accountKind: true, platformRole: true } },
      event: {
        select: {
          id: true,
          title: true,
          category: true,
          startAt: true,
          building: true,
          room: true,
          awardsServiceHours: true,
          status: true,
          club: { select: { id: true, name: true, color: true, slug: true } },
        },
      },
    },
  });
}

// What a poster can attach: upcoming, approved, public events at their school
// — the whole point is promoting something people can actually sign up for.
export async function getPromotableEvents(schoolId: string) {
  return db.event.findMany({
    where: {
      club: { schoolId, status: "ACTIVE" },
      status: "SCHEDULED",
      approvalStatus: "APPROVED",
      visibility: "PUBLIC",
      startAt: { gte: new Date() },
    },
    orderBy: { startAt: "asc" },
    take: 60,
    select: { id: true, title: true, startAt: true, club: { select: { name: true } } },
  });
}

export function posterLabel(author: { accountKind: string; platformRole: string }): string {
  if (author.platformRole === "PRINCIPAL") return "Principal";
  if (author.platformRole === "VICE_PRINCIPAL") return "Vice Principal";
  if (author.platformRole === "SCHOOL_ADMIN") return "School Admin";
  if (author.platformRole === "PLATFORM_ADMIN") return "Platform Admin";
  return "Teacher";
}

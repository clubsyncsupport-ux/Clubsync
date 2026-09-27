import "server-only";
import { requireUser } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { isSchoolAdminTier } from "@/lib/constants";

// Chat's own role tier — distinct from ClubMembership.role because it also
// needs to represent OVERSIGHT (a School Admin/Principal/Vice Principal/
// Platform Admin who is watching a club's chat from outside it, not
// participating in it). Non-throwing, unlike getDirectorContext, because
// plain Members call chat actions too, not just Directors/Officers.
export type ChatRole = "SPONSOR_TEACHER" | "SUPER_ADMIN" | "ADMIN" | "MEMBER" | "OVERSIGHT";

export type ChatContext =
  | { authorized: false }
  | { authorized: true; clubId: string; schoolId: string; userId: string; chatRole: ChatRole; isOversight: boolean };

export async function getChatContext(clubId: string): Promise<ChatContext> {
  const authUser = await requireUser();
  const [club, membership, me] = await Promise.all([
    db.club.findUnique({ where: { id: clubId }, select: { schoolId: true } }),
    db.clubMembership.findUnique({ where: { userId_clubId: { userId: authUser.id, clubId } } }),
    db.user.findUniqueOrThrow({ where: { id: authUser.id } }),
  ]);
  if (!club) return { authorized: false };

  // An actual club member's own role always takes precedence over oversight
  // status — oversight is for admins watching from OUTSIDE the club, not a
  // demotion for one who happens to also be a real participant.
  if (membership && membership.status === "ACTIVE") {
    const chatRole: ChatRole =
      membership.role === "DIRECTOR"
        ? "SPONSOR_TEACHER"
        : membership.role === "SUPER_ADMIN"
          ? "SUPER_ADMIN"
          : membership.role === "OFFICER"
            ? "ADMIN"
            : "MEMBER";
    return { authorized: true, clubId, schoolId: club.schoolId, userId: authUser.id, chatRole, isOversight: false };
  }

  const isOversight = me.platformRole === "PLATFORM_ADMIN" || (isSchoolAdminTier(me.platformRole) && me.schoolAdminOfId === club.schoolId);
  if (isOversight) {
    return { authorized: true, clubId, schoolId: club.schoolId, userId: authUser.id, chatRole: "OVERSIGHT", isOversight: true };
  }

  return { authorized: false };
}

// The one hard rule: a DIRECT channel may never contain both a Sponsor
// Teacher and a plain Member, regardless of group size — that's the
// structural guarantee against a private 1:1 between staff and an
// individual student. Sponsor-Teacher<->Admin and Sponsor-Teacher<->Super-
// Admin are fine (those are the club's own leadership, not a vulnerable
// individual student). Per a separate, deliberate v1 simplification: an
// Admin also can't start a DIRECT channel with a plain Member at all (the
// spec's "with Super Admin's OK" approval workflow is out of scope for
// now) — Admins use a shared channel instead.
export function canCreateDirectChannel(participantRoles: ChatRole[]): { ok: boolean; error?: string } {
  const hasSponsorTeacher = participantRoles.includes("SPONSOR_TEACHER");
  const hasMember = participantRoles.includes("MEMBER");
  const hasAdmin = participantRoles.includes("ADMIN");
  if (hasSponsorTeacher && hasMember) {
    return { ok: false, error: "The Sponsor Teacher can't have a private conversation with a plain Member." };
  }
  if (hasAdmin && hasMember) {
    return { ok: false, error: "An Admin can't start a direct message with a plain Member — use a shared channel instead." };
  }
  return { ok: true };
}

// Who can create/manage topic channels — Admin tier and above, matching the
// general "who manages the club's structure" pattern (e.g. MemberGroup
// creation is director-side only). Plain Members can only join/request.
export function canManageChannels(chatRole: ChatRole): boolean {
  return chatRole === "ADMIN" || chatRole === "SUPER_ADMIN" || chatRole === "SPONSOR_TEACHER";
}

// Selects only the fields a chat UI ever needs off User — never the full
// row (which includes passwordHash and other sensitive fields).
const CHANNEL_MEMBER_SELECT = {
  id: true,
  userId: true,
  status: true,
  canPost: true,
  user: { select: { id: true, firstName: true, lastName: true, avatarUrl: true } },
} as const;

export async function getVisibleChannels(clubId: string, userId: string, chatRole: ChatRole) {
  if (chatRole === "OVERSIGHT") {
    return db.channel.findMany({
      where: { clubId },
      include: { memberships: { select: CHANNEL_MEMBER_SELECT } },
      orderBy: { createdAt: "asc" },
    });
  }

  return db.channel.findMany({
    where: {
      clubId,
      OR: [
        { visibility: { in: ["OPEN", "REQUEST"] } },
        { visibility: "INVITE", memberships: { some: { userId, status: "ACTIVE" } } },
        { visibility: "DIRECT", memberships: { some: { userId, status: "ACTIVE" } } },
      ],
    },
    include: { memberships: { select: CHANNEL_MEMBER_SELECT } },
    orderBy: { createdAt: "asc" },
  });
}

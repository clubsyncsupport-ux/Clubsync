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

// teacherMessagingOff / viewerIsStaff: whether this school has switched teacher
// messaging off, and whether the person looking is a teacher account. The chat
// screens use them to explain why a teacher can't reply; the actions enforce it.
export type ChatContext =
  | { authorized: false }
  | {
      authorized: true;
      clubId: string;
      schoolId: string;
      userId: string;
      chatRole: ChatRole;
      isOversight: boolean;
      teacherMessagingOff: boolean;
      viewerIsStaff: boolean;
    };

export async function getChatContext(clubId: string): Promise<ChatContext> {
  const authUser = await requireUser();
  const [club, membership, me] = await Promise.all([
    db.club.findUnique({ where: { id: clubId }, select: { schoolId: true, school: { select: { teacherMessaging: true } } } }),
    db.clubMembership.findUnique({ where: { userId_clubId: { userId: authUser.id, clubId } } }),
    db.user.findUniqueOrThrow({ where: { id: authUser.id } }),
  ]);
  if (!club) return { authorized: false };
  const policy = { teacherMessagingOff: !club.school.teacherMessaging, viewerIsStaff: me.accountKind === "STAFF" };

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
    return { authorized: true, clubId, schoolId: club.schoolId, userId: authUser.id, chatRole, isOversight: false, ...policy };
  }

  const isOversight = me.platformRole === "PLATFORM_ADMIN" || (isSchoolAdminTier(me.platformRole) && me.schoolAdminOfId === club.schoolId);
  if (isOversight) {
    return { authorized: true, clubId, schoolId: club.schoolId, userId: authUser.id, chatRole: "OVERSIGHT", isOversight: true, ...policy };
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

function hubChannelDisplayName(name: string | null, memberships: { userId: string; user: { firstName: string; lastName: string } }[], myUserId: string): string {
  if (name) return name;
  const others = memberships.filter((m) => m.userId !== myUserId);
  return others.map((m) => `${m.user.firstName} ${m.user.lastName[0]}.`).join(", ") || "Direct Message";
}

export type ChatHubChannel = {
  id: string;
  name: string | null;
  visibility: "OPEN" | "REQUEST" | "INVITE" | "DIRECT";
  restrictedPosting: boolean;
  memberships: { id: string; userId: string; status: "ACTIVE" | "PENDING"; canPost: boolean; user: { id: string; firstName: string; lastName: string; avatarUrl: string | null } }[];
  clubId: string;
  clubName: string;
  clubSlug: string;
  clubColor: string;
  /** The viewer's own role inside this channel's club (it differs per club). */
  chatRole: ChatRole;
  displayName: string;
  isDirect: boolean;
  lastMessage: { body: string; senderName: string; createdAt: string } | null;
};

export function chatRoleForClubRole(role: string): ChatRole {
  return role === "DIRECTOR" ? "SPONSOR_TEACHER" : role === "SUPER_ADMIN" ? "SUPER_ADMIN" : role === "OFFICER" ? "ADMIN" : "MEMBER";
}

// The Chats inbox — every channel the viewer can see across every club
// they're an active member of, in one query instead of one per club, newest
// activity first. Only ever called with the caller's own memberships (never
// OVERSIGHT — that's for admins watching from outside a club they don't
// belong to, which has no meaning for "my own chats").
export async function getChatHubChannels(
  memberships: { clubId: string; role: string; club: { name: string; slug: string; color: string } }[],
  userId: string
): Promise<ChatHubChannel[]> {
  const clubIds = memberships.map((m) => m.clubId);
  if (clubIds.length === 0) return [];
  const roleByClub = new Map(memberships.map((m) => [m.clubId, m.role]));
  const clubInfoById = new Map(memberships.map((m) => [m.clubId, m.club]));

  const channels = await db.channel.findMany({
    where: {
      clubId: { in: clubIds },
      OR: [
        { visibility: { in: ["OPEN", "REQUEST"] } },
        { visibility: "INVITE", memberships: { some: { userId, status: "ACTIVE" } } },
        { visibility: "DIRECT", memberships: { some: { userId, status: "ACTIVE" } } },
      ],
    },
    include: {
      memberships: { select: CHANNEL_MEMBER_SELECT },
      messages: {
        orderBy: { createdAt: "desc" },
        take: 1,
        select: { body: true, filteredBody: true, createdAt: true, sender: { select: { firstName: true } } },
      },
    },
  });

  return channels
    .map((c): ChatHubChannel => {
      const role = roleByClub.get(c.clubId)!;
      const chatRole = chatRoleForClubRole(role);
      const showRealText = chatRole === "SPONSOR_TEACHER"; // the club's Sponsor Teacher always sees the real, unfiltered text
      const last = c.messages[0];
      const club = clubInfoById.get(c.clubId)!;
      return {
        id: c.id,
        name: c.name,
        visibility: c.visibility as ChatHubChannel["visibility"],
        restrictedPosting: c.restrictedPosting,
        memberships: c.memberships.map((m) => ({ id: m.id, userId: m.userId, status: m.status as "ACTIVE" | "PENDING", canPost: m.canPost, user: m.user })),
        clubId: c.clubId,
        clubName: club.name,
        clubSlug: club.slug,
        clubColor: club.color,
        chatRole,
        displayName: hubChannelDisplayName(c.name, c.memberships, userId),
        isDirect: c.visibility === "DIRECT",
        lastMessage: last
          ? { body: showRealText ? last.body : (last.filteredBody ?? last.body), senderName: last.sender.firstName, createdAt: last.createdAt.toISOString() }
          : null,
      };
    })
    .sort((a, b) => (b.lastMessage ? Date.parse(b.lastMessage.createdAt) : 0) - (a.lastMessage ? Date.parse(a.lastMessage.createdAt) : 0));
}

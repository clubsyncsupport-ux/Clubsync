import "server-only";
import { db } from "@/lib/db";
import { getChatContext, chatRoleForClubRole, type ChatRole } from "@/lib/chat";

export const MESSAGE_PAGE_SIZE = 50;

const MESSAGE_SELECT = {
  id: true,
  channelId: true,
  body: true,
  filteredBody: true,
  attachmentUrl: true,
  createdAt: true,
  sender: { select: { id: true, firstName: true, lastName: true, avatarUrl: true } },
  reactions: { select: { userId: true, emoji: true } },
} as const;

// Reading a channel needs to be an ACTIVE member of both the club and the
// channel — except for the OVERSIGHT tier, which reads from outside by design.
// Every lookup that doesn't depend on another runs in the same round trip
// (the club membership is found through the channel relation, so the club id
// isn't needed up front), because each sequential database hop is felt as lag
// in a chat that polls every couple of seconds.
async function authorizeChannelRead(userId: string, channelId: string): Promise<ChatRole | null> {
  const [clubMembership, channelMembership] = await Promise.all([
    db.clubMembership.findFirst({
      where: { userId, status: "ACTIVE", club: { channels: { some: { id: channelId } } } },
      select: { role: true },
    }),
    db.channelMembership.findUnique({ where: { channelId_userId: { channelId, userId } }, select: { status: true } }),
  ]);
  if (clubMembership && channelMembership?.status === "ACTIVE") return chatRoleForClubRole(clubMembership.role);
  if (clubMembership) return null; // a club member who hasn't joined this channel

  // Not in the club at all: only an admin watching from outside may read.
  const channel = await db.channel.findUnique({ where: { id: channelId }, select: { clubId: true } });
  if (!channel) return null;
  const ctx = await getChatContext(channel.clubId);
  return ctx.authorized && ctx.chatRole === "OVERSIGHT" ? "OVERSIGHT" : null;
}

// The real, unfiltered text is resolved here, server-side, and only for the
// Sponsor Teacher / oversight tier — a filtered message shouldn't hide a real
// behavior problem from the one adult responsible for the club. Everyone
// else gets the cleaned-up version; `filteredBody` itself never crosses into
// the response for them, so there's nothing to reconstruct the original from
// client-side.
function presentMessages<T extends { body: string; filteredBody: string | null; createdAt: Date }>(chatRole: ChatRole, messages: T[]) {
  const showRealText = chatRole === "SPONSOR_TEACHER" || chatRole === "OVERSIGHT";
  return messages.map(({ filteredBody, ...m }) => ({
    ...m,
    createdAt: m.createdAt.toISOString(),
    body: showRealText ? m.body : (filteredBody ?? m.body),
  }));
}

// Three shapes, one function:
//  - neither `since` nor `before`: the NEWEST page (a club with a year of
//    history opens at today, not at its very first message)
//  - `since`: everything from the newest message already held onward. It's
//    that message's server timestamp, never the client's clock, whose drift
//    used to be able to skip a message outright. `gte` + the client's
//    de-dupe by id means a message sharing a millisecond can't be missed.
//  - `before`: the page just before the oldest message held ("Load earlier").
export async function getChannelMessages(userId: string, channelId: string, opts: { since?: string | null; before?: string | null }) {
  const chatRole = await authorizeChannelRead(userId, channelId);
  if (!chatRole) return [];

  if (opts.since) {
    const sinceDate = new Date(opts.since);
    if (isNaN(sinceDate.getTime())) return [];
    const messages = await db.chatMessage.findMany({
      where: { channelId, createdAt: { gte: sinceDate } },
      select: MESSAGE_SELECT,
      orderBy: { createdAt: "asc" },
      take: 100,
    });
    return presentMessages(chatRole, messages);
  }

  let beforeDate: Date | undefined;
  if (opts.before) {
    beforeDate = new Date(opts.before);
    if (isNaN(beforeDate.getTime())) return [];
  }
  const page = await db.chatMessage.findMany({
    where: { channelId, ...(beforeDate ? { createdAt: { lt: beforeDate } } : {}) },
    select: MESSAGE_SELECT,
    orderBy: { createdAt: "desc" },
    take: MESSAGE_PAGE_SIZE,
  });
  return presentMessages(chatRole, page.reverse());
}

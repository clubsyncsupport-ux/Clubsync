// Server-side only (every caller is a server action or page). It deliberately
// has no `server-only` marker so the backfill script can run it with tsx.
import { db } from "@/lib/db";

// Every club starts with the same two channels, so its chat is never an empty
// room: General for everyone to talk in, and Announcements where only the
// club's Director posts (everyone else reads). Both are OPEN, and every active
// member is added to them automatically.
const DEFAULT_CHANNELS = [
  { name: "General", restrictedPosting: false },
  { name: "Announcements", restrictedPosting: true },
] as const;

const DEFAULT_NAMES = DEFAULT_CHANNELS.map((c) => c.name);

// Creates whichever default channels a club is missing and puts every active
// member into them. Safe to run any number of times — it only fills gaps, so
// it's called when a club is created, when someone becomes a member, and as a
// one-off backfill for clubs that existed before this.
export async function ensureDefaultChannels(clubId: string): Promise<void> {
  const club = await db.club.findUnique({
    where: { id: clubId },
    select: { createdById: true, memberships: { where: { status: "ACTIVE" }, select: { userId: true, role: true } } },
  });
  if (!club) return;
  const directorIds = club.memberships.filter((m) => m.role === "DIRECTOR").map((m) => m.userId);

  await Promise.all(
    DEFAULT_CHANNELS.map(async (def) => {
      const channel = await db.channel.upsert({
        where: { clubId_name: { clubId, name: def.name } },
        update: {},
        create: { clubId, name: def.name, visibility: "OPEN", restrictedPosting: def.restrictedPosting, createdById: club.createdById },
        select: { id: true, visibility: true, restrictedPosting: true },
      });
      // A club that already made its own invite-only "General" keeps its own
      // rules — we don't pour the whole roster into it.
      if (channel.visibility !== "OPEN") return;

      await db.channelMembership.createMany({
        data: club.memberships.map((m) => ({
          channelId: channel.id,
          userId: m.userId,
          status: "ACTIVE",
          canPost: !channel.restrictedPosting || m.role === "DIRECTOR",
        })),
        skipDuplicates: true,
      });
      // A teacher who became Director after the channel existed can post in it.
      if (channel.restrictedPosting && directorIds.length > 0) {
        await db.channelMembership.updateMany({ where: { channelId: channel.id, userId: { in: directorIds }, canPost: false }, data: { canPost: true } });
      }
    })
  );
}

// Catches anyone who became a member through a path that doesn't set up
// channels itself (merging accounts, say): adds the viewer to any default
// channel of theirs they're missing from. Cheap — two queries when there's
// nothing to do — and meant to be run after the page has been sent.
export async function healDefaultChannelsFor(userId: string): Promise<void> {
  const memberships = await db.clubMembership.findMany({ where: { userId, status: "ACTIVE" }, select: { clubId: true, role: true } });
  if (memberships.length === 0) return;
  const roleByClub = new Map(memberships.map((m) => [m.clubId, m.role]));

  const missing = await db.channel.findMany({
    where: { clubId: { in: [...roleByClub.keys()] }, name: { in: DEFAULT_NAMES }, visibility: "OPEN", memberships: { none: { userId } } },
    select: { id: true, clubId: true, restrictedPosting: true },
  });
  if (missing.length === 0) return;

  await db.channelMembership.createMany({
    data: missing.map((c) => ({
      channelId: c.id,
      userId,
      status: "ACTIVE",
      canPost: !c.restrictedPosting || roleByClub.get(c.clubId) === "DIRECTOR",
    })),
    skipDuplicates: true,
  });
}

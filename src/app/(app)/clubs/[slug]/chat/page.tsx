import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getChatContext, getVisibleChannels } from "@/lib/chat";
import { db } from "@/lib/db";
import { BackButton } from "@/components/ui/back-button";
import { ChatView, type MemberOption, type ChatRole } from "@/components/chat/chat-view";

export const metadata: Metadata = { title: "Chat" };

export default async function ClubChatPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const club = await db.club.findUnique({ where: { slug }, select: { id: true, name: true } });
  if (!club) notFound();

  const ctx = await getChatContext(club.id);
  if (!ctx.authorized) notFound();

  const [channels, memberships] = await Promise.all([
    getVisibleChannels(club.id, ctx.userId, ctx.chatRole),
    db.clubMembership.findMany({
      where: { clubId: club.id, status: "ACTIVE" },
      select: { userId: true, role: true, user: { select: { firstName: true, lastName: true } } },
    }),
  ]);

  const members: MemberOption[] = memberships.map((m) => ({
    id: m.userId,
    name: `${m.user.firstName} ${m.user.lastName}`,
    chatRole: (m.role === "DIRECTOR" ? "SPONSOR_TEACHER" : m.role === "SUPER_ADMIN" ? "SUPER_ADMIN" : m.role === "OFFICER" ? "ADMIN" : "MEMBER") as ChatRole,
  }));

  return (
    <div className="mx-auto max-w-4xl px-4 py-6 animate-fade-in">
      <BackButton fallbackHref={`/clubs/${slug}`} />
      <h1 className="mt-3 text-2xl font-bold tracking-tight text-text-primary">{club.name} — Chat</h1>
      <ChatView
        clubId={club.id}
        userId={ctx.userId}
        chatRole={ctx.chatRole}
        channels={channels.map((c) => ({
          id: c.id,
          name: c.name,
          visibility: c.visibility as "OPEN" | "REQUEST" | "INVITE" | "DIRECT",
          restrictedPosting: c.restrictedPosting,
          memberships: c.memberships.map((m) => ({ id: m.id, userId: m.userId, status: m.status as "ACTIVE" | "PENDING", canPost: m.canPost, user: m.user })),
        }))}
        members={members}
      />
    </div>
  );
}

import type { Metadata } from "next";
import { after } from "next/server";
import { requireTeacher } from "@/lib/teacher";
import { getViewer } from "@/lib/viewer";
import { getChatHubChannels } from "@/lib/chat";
import { healDefaultChannelsFor } from "@/lib/default-channels";
import { getSchoolFeed } from "@/lib/school-feed";
import { timeAgo } from "@/lib/format";
import { ChatInbox, type InboxChannel } from "@/components/chat/chat-inbox";

export const metadata: Metadata = { title: "Chats" };

export default async function TeacherChatsPage({ searchParams }: { searchParams: Promise<{ channel?: string }> }) {
  const { channel } = await searchParams;
  const user = await requireTeacher();
  const viewer = await getViewer();
  after(() => healDefaultChannelsFor(viewer.id));
  const [channels, [latest]] = await Promise.all([
    getChatHubChannels(
      viewer.memberships.map((m) => ({ clubId: m.clubId, role: m.role, club: { name: m.club.name, slug: m.club.slug, color: m.club.color } })),
      user.id
    ),
    user.schoolId ? getSchoolFeed(user.schoolId, 1) : Promise.resolve([]),
  ]);

  const inbox: InboxChannel[] = channels.map((c) => ({
    ...c,
    lastMessage: c.lastMessage ? { body: c.lastMessage.body, senderName: c.lastMessage.senderName, ago: timeAgo(new Date(c.lastMessage.createdAt)) } : null,
  }));

  return (
    <div className="mx-auto max-w-5xl px-4 py-6 animate-fade-in">
      <h1 className="text-2xl font-bold tracking-tight text-text-primary">Chats</h1>
      <p className="mt-1 text-[15px] text-text-secondary">Every conversation across the clubs you run, in one place.</p>
      <ChatInbox
        userId={user.id}
        channels={inbox}
        initialChannelId={channel}
        announcement={{ href: "/teacher/school-feed", preview: latest ? latest.body : null, ago: latest ? timeAgo(latest.createdAt) : null }}
        audience="teacher"
        teacherMessaging={{ off: !viewer.school?.teacherMessaging, viewerIsStaff: viewer.accountKind === "STAFF" }}
      />
    </div>
  );
}

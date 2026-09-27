import type { Metadata } from "next";
import Link from "next/link";
import { getViewer, requireStudentViewer } from "@/lib/viewer";
import { getChatHubChannels } from "@/lib/chat";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { BackButton } from "@/components/ui/back-button";
import { ClubLogo } from "@/components/club-logo";
import { timeAgo } from "@/lib/format";

export const metadata: Metadata = { title: "Chats" };

export default async function ChatsHubPage() {
  const viewer = requireStudentViewer(await getViewer());
  const channels = await getChatHubChannels(
    viewer.memberships.map((m) => ({ clubId: m.clubId, role: m.role, club: { name: m.club.name, slug: m.club.slug, color: m.club.color } })),
    viewer.id
  );

  return (
    <div className="mx-auto max-w-2xl px-4 py-6 animate-fade-in">
      <BackButton fallbackHref="/home" />
      <h1 className="mt-3 text-2xl font-bold tracking-tight text-text-primary">Chats</h1>
      <p className="mt-1 text-[15px] text-text-secondary">Every conversation across your clubs, in one place.</p>

      <div className="mt-5">
        {channels.length === 0 ? (
          <Card>
            <EmptyState icon="💬" title="No chats yet" description="Join a club and start a conversation to see it here." />
          </Card>
        ) : (
          <div className="space-y-2">
            {channels.map((c) => (
              <Link key={c.id} href={`/clubs/${c.clubSlug}/chat`} className="block">
                <Card className="transition-colors hover:border-border-strong">
                  <CardContent className="flex items-center gap-3 p-4">
                    <ClubLogo name={c.clubName} color={c.clubColor} size="sm" />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <p className="truncate font-semibold text-text-primary">
                          {c.isDirect ? "💬 " : "# "}
                          {c.displayName}
                        </p>
                        {c.lastMessage && <span className="shrink-0 text-xs text-text-muted">{timeAgo(c.lastMessage.createdAt)}</span>}
                      </div>
                      <p className="truncate text-xs text-text-muted">{c.clubName}</p>
                      <p className="mt-0.5 truncate text-sm text-text-secondary">{c.lastMessage ? c.lastMessage.body : "No messages yet"}</p>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

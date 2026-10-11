"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/cn";
import { ClubLogo } from "@/components/club-logo";
import { ChannelPane, type ChannelData, type ChatRole, type TeacherMessagingPolicy } from "@/components/chat/chat-view";

export type InboxChannel = ChannelData & {
  clubId: string;
  clubName: string;
  clubSlug: string;
  clubColor: string;
  chatRole: ChatRole;
  displayName: string;
  isDirect: boolean;
  lastMessage: { body: string; senderName: string; ago: string } | null;
};

// Every chat from every club in one place: the list on the left, the open
// conversation on the right (on a phone it's list-then-conversation, with a
// back arrow). Switching between clubs' chats is one tap instead of
// club page -> chat -> back -> next club page -> chat.
export function ChatInbox({
  userId,
  channels,
  initialChannelId,
  announcement,
  audience,
  teacherMessaging,
}: {
  userId: string;
  channels: InboxChannel[];
  initialChannelId?: string;
  announcement: { href: string; preview: string | null; ago: string | null };
  /** Where "open club chat" and club-level management live for this viewer. */
  audience: "student" | "teacher";
  teacherMessaging?: TeacherMessagingPolicy;
}) {
  const router = useRouter();
  const validInitial = initialChannelId && channels.some((c) => c.id === initialChannelId) ? initialChannelId : null;
  const [selectedId, setSelectedId] = useState<string | null>(validInitial ?? channels[0]?.id ?? null);
  // Phone only: whether the conversation (vs the list) is on screen. Opening
  // from a notification or the floating button lands straight on the thread.
  const [showThread, setShowThread] = useState(validInitial !== null);
  const selected = channels.find((c) => c.id === selectedId) ?? null;

  function open(id: string) {
    setSelectedId(id);
    setShowThread(true);
    window.history.replaceState(null, "", `?channel=${id}`);
  }

  function clubChatHref(c: InboxChannel) {
    return audience === "teacher" ? `/director/${c.clubId}/chat?channel=${c.id}` : `/clubs/${c.clubSlug}/chat?channel=${c.id}`;
  }

  return (
    <div className="mt-4 grid gap-4 md:grid-cols-[300px_1fr]">
      <div data-tour="chats-list" className={cn("space-y-2 md:max-h-[720px] md:overflow-y-auto", showThread && "hidden md:block")}>
        <Link
          href={announcement.href}
          data-tour="chats-announcements"
          className="flex items-center gap-3 rounded-2xl border border-accent/40 bg-surface-1 p-3 transition-colors hover:border-accent"
        >
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-accent-soft text-lg">📣</div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center justify-between gap-2">
              <p className="truncate text-sm font-semibold text-text-primary">School announcements</p>
              {announcement.ago && <span className="shrink-0 text-[11px] text-text-muted">{announcement.ago}</span>}
            </div>
            <p className="truncate text-xs text-text-secondary">{announcement.preview ?? "No announcements yet"}</p>
          </div>
        </Link>

        {channels.length === 0 ? (
          <p className="rounded-2xl border border-border bg-surface-1 p-4 text-sm text-text-muted">
            No chats yet. Join a club and its channels will show up here.
          </p>
        ) : (
          channels.map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => open(c.id)}
              className={cn(
                "flex w-full items-center gap-3 rounded-2xl border p-3 text-left transition-colors",
                // The "currently open" highlight only means something when the
                // list and the conversation are side by side; on a phone the
                // list is shown on its own, so nothing should look open.
                "border-border bg-surface-1 hover:border-border-strong",
                c.id === selectedId && "md:border-accent md:bg-accent-soft"
              )}
            >
              <ClubLogo name={c.clubName} color={c.clubColor} size="sm" />
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <p className="truncate text-sm font-semibold text-text-primary">
                    {c.isDirect ? "💬 " : "# "}
                    {c.displayName}
                  </p>
                  {c.lastMessage && <span className="shrink-0 text-[11px] text-text-muted">{c.lastMessage.ago}</span>}
                </div>
                <p className="truncate text-[11px] text-text-muted">{c.clubName}</p>
                <p className="truncate text-xs text-text-secondary">
                  {c.lastMessage ? `${c.lastMessage.senderName}: ${c.lastMessage.body}` : "No messages yet"}
                </p>
              </div>
            </button>
          ))
        )}
      </div>

      <div className={cn(!showThread && "hidden md:block")}>
        {selected ? (
          <ChannelPane
            key={selected.id}
            channel={selected}
            userId={userId}
            chatRole={selected.chatRole}
            canManage={false}
            members={[]}
            onChange={() => router.refresh()}
            clubLabel={{ name: selected.clubName, href: clubChatHref(selected) }}
            onBack={() => setShowThread(false)}
            teacherMessaging={teacherMessaging}
          />
        ) : (
          <div className="hidden h-[75vh] min-h-[420px] items-center justify-center rounded-2xl border border-border bg-surface-1 p-8 text-sm text-text-muted md:flex md:max-h-[720px]">
            Pick a chat to start.
          </div>
        )}
      </div>
    </div>
  );
}

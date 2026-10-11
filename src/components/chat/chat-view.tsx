"use client";

import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  createChannelAction,
  deleteChannelAction,
  joinChannelAction,
  approveChannelJoinAction,
  denyChannelJoinAction,
  addMemberToInviteChannelAction,
  removeChannelMemberAction,
  toggleCanPostAction,
  startDirectChannelAction,
  sendChatMessageAction,
  addReactionAction,
  removeReactionAction,
} from "@/app/actions/chat";
import { Button } from "@/components/ui/button";
import { Input, Select } from "@/components/ui/input";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/cn";
import { filterProfanity } from "@/lib/profanity-filter";
import { ChevronLeft, Paperclip, X } from "lucide-react";

export type ChatRole = "SPONSOR_TEACHER" | "SUPER_ADMIN" | "ADMIN" | "MEMBER" | "OVERSIGHT";

/** Whether the school has switched teacher messaging off, and whether the
 * person looking is a teacher. Teachers become read-only; students are told. */
export type TeacherMessagingPolicy = { off: boolean; viewerIsStaff: boolean };

export type ChannelMember = { id: string; userId: string; status: "ACTIVE" | "PENDING"; canPost: boolean; user: { id: string; firstName: string; lastName: string; avatarUrl: string | null } };
export type ChannelData = { id: string; name: string | null; visibility: "OPEN" | "REQUEST" | "INVITE" | "DIRECT"; restrictedPosting: boolean; memberships: ChannelMember[] };
export type MemberOption = { id: string; name: string; chatRole: ChatRole };
export type ChatMessageData = {
  id: string;
  body: string;
  attachmentUrl: string | null;
  createdAt: string;
  sender: { id: string; firstName: string; lastName: string; avatarUrl: string | null };
  reactions: { userId: string; emoji: string }[];
  /** Set only on a message that's still being sent — shows it dimmed with this label. */
  pending?: string;
};

const REACTION_EMOJI = ["👍", "❤️", "😂", "🎉"];
const POLL_MS = 2500;
const PAGE_SIZE = 50;

// Plain GET (see /api/chat/messages) — null means the request failed, which
// callers treat as "nothing new yet" rather than an error to show.
async function fetchMessages(channelId: string, opts: { since?: string | null; before?: string | null }): Promise<ChatMessageData[] | null> {
  const params = new URLSearchParams({ channelId });
  if (opts.since) params.set("since", opts.since);
  if (opts.before) params.set("before", opts.before);
  try {
    const res = await fetch(`/api/chat/messages?${params}`, { cache: "no-store" });
    if (!res.ok) return null;
    return ((await res.json()) as { messages: ChatMessageData[] }).messages;
  } catch {
    return null;
  }
}

function channelDisplayName(channel: ChannelData, myUserId: string) {
  if (channel.name) return channel.name;
  const others = channel.memberships.filter((m) => m.userId !== myUserId);
  return others.map((m) => `${m.user.firstName} ${m.user.lastName[0]}.`).join(", ") || "Direct Message";
}

export function ChatView({
  clubId,
  userId,
  chatRole,
  channels: initialChannels,
  members,
  initialChannelId,
  teacherMessaging,
}: {
  clubId: string;
  userId: string;
  chatRole: ChatRole;
  channels: ChannelData[];
  members: MemberOption[];
  teacherMessaging?: TeacherMessagingPolicy;
  /** From a notification's or the Chats hub's deep link (?channel=...) —
   * only honored if that channel is actually in the visible list, so a
   * stale/invalid id can't be used to probe for a channel's existence. */
  initialChannelId?: string;
}) {
  const router = useRouter();
  const channels = initialChannels;
  const [selectedId, setSelectedId] = useState<string | null>(
    (initialChannelId && initialChannels.some((c) => c.id === initialChannelId) ? initialChannelId : initialChannels[0]?.id) ?? null
  );
  const [showNewChannel, setShowNewChannel] = useState(false);
  const [showNewDM, setShowNewDM] = useState(false);
  const canManage = chatRole === "ADMIN" || chatRole === "SUPER_ADMIN" || chatRole === "SPONSOR_TEACHER";
  const isOversight = chatRole === "OVERSIGHT";

  const selected = useMemo(() => channels.find((c) => c.id === selectedId) ?? null, [channels, selectedId]);

  function reload() {
    // Server actions already revalidatePath the page; router.refresh()
    // re-runs the server component and flows the fresh `channels` prop back
    // down (synced by the effect above) without a full page reload.
    router.refresh();
  }

  return (
    <div className="mt-4 grid gap-4 md:grid-cols-[240px_1fr]">
      <div className="space-y-1 rounded-2xl border border-border bg-surface-1 p-2">
        {channels.map((c) => (
          <button
            key={c.id}
            onClick={() => setSelectedId(c.id)}
            className={cn(
              "flex w-full items-center justify-between rounded-xl px-3 py-2 text-left text-sm font-medium",
              c.id === selectedId ? "bg-accent-soft text-accent-soft-text" : "text-text-primary hover:bg-surface-2"
            )}
          >
            <span className="truncate">{c.visibility === "DIRECT" ? "💬 " : "# "}{channelDisplayName(c, userId)}</span>
          </button>
        ))}
        {channels.length === 0 && <p className="p-3 text-sm text-text-muted">No channels yet.</p>}

        {!isOversight && (
          <div className="mt-2 space-y-1 border-t border-border pt-2">
            {canManage && (
              <button onClick={() => setShowNewChannel((v) => !v)} className="w-full rounded-xl px-3 py-2 text-left text-xs font-medium text-accent hover:bg-surface-2">
                + New channel
              </button>
            )}
            <button onClick={() => setShowNewDM((v) => !v)} className="w-full rounded-xl px-3 py-2 text-left text-xs font-medium text-accent hover:bg-surface-2">
              + New message
            </button>
          </div>
        )}

        {showNewChannel && (
          <NewChannelForm
            clubId={clubId}
            onDone={() => {
              setShowNewChannel(false);
              reload();
            }}
          />
        )}
        {showNewDM && (
          <NewDMForm
            clubId={clubId}
            members={members.filter((m) => m.id !== userId)}
            onCreated={(channelId) => {
              setShowNewDM(false);
              reload();
              setSelectedId(channelId);
            }}
          />
        )}
      </div>

      {selected ? (
        <ChannelPane channel={selected} userId={userId} chatRole={chatRole} canManage={canManage} members={members} onChange={reload} teacherMessaging={teacherMessaging} />
      ) : (
        <div className="flex h-[75vh] min-h-[420px] items-center justify-center rounded-2xl border border-border bg-surface-1 p-8 text-sm text-text-muted md:max-h-[720px]">
          Pick a channel to view messages.
        </div>
      )}
    </div>
  );
}

// One channel's header + messages + composer/join footer. Shared by the
// per-club chat page and the all-clubs Chats inbox, so both behave the same.
export function ChannelPane({
  channel,
  userId,
  chatRole,
  canManage,
  members,
  onChange,
  clubLabel,
  onBack,
  teacherMessaging,
}: {
  channel: ChannelData;
  userId: string;
  chatRole: ChatRole;
  canManage: boolean;
  members: MemberOption[];
  onChange: () => void;
  teacherMessaging?: TeacherMessagingPolicy;
  /** The inbox mixes clubs, so each pane says which one it belongs to. */
  clubLabel?: { name: string; href: string };
  /** Mobile only: returns from the thread to the channel list. */
  onBack?: () => void;
}) {
  const [pending, startTransition] = useTransition();
  const isOversight = chatRole === "OVERSIGHT";
  const myMembership = channel.memberships.find((m) => m.userId === userId);
  // With teacher messaging switched off a teacher can read but not send, and
  // everyone else is told so (nobody should wait for a reply that won't come).
  const teacherBlocked = !!teacherMessaging?.off && teacherMessaging.viewerIsStaff;
  const teachersReadOnly = !!teacherMessaging?.off && !teacherMessaging.viewerIsStaff && !isOversight;
  const canPost = !isOversight && !teacherBlocked && myMembership?.status === "ACTIVE" && (!channel.restrictedPosting || myMembership.canPost);

  return (
    <div className="flex h-[75vh] min-h-[420px] flex-col rounded-2xl border border-border bg-surface-1 md:max-h-[720px]">
      <ChannelHeader
        channel={channel}
        canManage={canManage}
        isOversight={isOversight}
        userId={userId}
        members={members}
        onChange={onChange}
        clubLabel={clubLabel}
        onBack={onBack}
      />
      {teachersReadOnly && (
        <p className="border-b border-border bg-surface-2 px-3 py-1.5 text-center text-[11px] text-text-muted">
          Teachers can read this chat but won&rsquo;t reply here.
        </p>
      )}
      {/* Keyed by membership status too, not just channelId: joining a
          channel (PENDING/absent -> ACTIVE) needs a fresh mount so the thread
          loads the history it couldn't read before it was a member. */}
      <ChannelThread
        key={`${channel.id}-${myMembership?.status ?? "none"}`}
        channelId={channel.id}
        userId={userId}
        chatRole={chatRole}
        isOversight={isOversight}
        canPost={canPost}
      />
      {!canPost &&
        (!isOversight && myMembership?.status === "PENDING" ? (
          <p className="border-t border-border p-3 text-center text-xs text-text-muted">Waiting for approval to join this channel.</p>
        ) : !isOversight && !myMembership ? (
          <div className="border-t border-border p-3 text-center">
            <Button
              size="sm"
              disabled={pending}
              onClick={() =>
                startTransition(async () => {
                  await joinChannelAction(channel.id);
                  onChange();
                })
              }
            >
              {channel.visibility === "REQUEST" ? "Request to join" : "Join channel"}
            </Button>
          </div>
        ) : teacherBlocked ? (
          <p className="border-t border-border p-3 text-center text-xs text-text-muted">
            Teacher messaging is turned off at your school. You can read this chat, but you can&rsquo;t send messages in it.
          </p>
        ) : !isOversight && channel.restrictedPosting && !myMembership?.canPost ? (
          <p className="border-t border-border p-3 text-center text-xs text-text-muted">Only approved posters can send messages here.</p>
        ) : (
          <p className="border-t border-border p-3 text-center text-xs text-text-muted">Read-only oversight view.</p>
        ))}
    </div>
  );
}

// Keyed by channelId from the parent, so switching channels remounts this
// fresh (new `messages`/cursor) instead of needing an effect to reset state on
// prop change.
function ChannelThread({
  channelId,
  userId,
  chatRole,
  isOversight,
  canPost,
}: {
  channelId: string;
  userId: string;
  chatRole: ChatRole;
  isOversight: boolean;
  canPost: boolean;
}) {
  const [messages, setMessages] = useState<ChatMessageData[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [loadingOlder, startLoadOlder] = useTransition();
  // Server timestamp of the newest real message held — the polling cursor.
  // (Never the browser's own clock: a few seconds of drift there used to be
  // able to skip a message outright.)
  const cursorRef = useRef<string | null>(null);
  const tmpRef = useRef(0);
  const scrollerRef = useRef<HTMLDivElement>(null);
  const showRealText = chatRole === "SPONSOR_TEACHER";

  // Folds fresh messages into state: new ids are appended, a message we
  // already hold gets its reactions refreshed (so someone else's reaction
  // shows up), and `dropId` removes a just-confirmed "sending…" placeholder in
  // the same update so the real message replaces it without a flicker.
  const merge = useCallback((fresh: ChatMessageData[], dropId?: string) => {
    setMessages((prev) => {
      const base = dropId ? prev.filter((m) => m.id !== dropId) : prev;
      const freshById = new Map(fresh.map((m) => [m.id, m]));
      const seen = new Set(base.map((m) => m.id));
      const refreshed = base.map((m) => {
        const f = freshById.get(m.id);
        return f && f.reactions.length !== m.reactions.length ? { ...m, reactions: f.reactions } : m;
      });
      const added = fresh.filter((m) => !seen.has(m.id));
      return added.length === 0 ? refreshed : [...refreshed, ...added];
    });
  }, []);

  // Pulled out of the polling effect so sending a message can run one
  // immediately instead of waiting for the next scheduled tick.
  const poll = useCallback(
    async (dropId?: string) => {
      const firstLoad = cursorRef.current === null;
      const fresh = await fetchMessages(channelId, { since: cursorRef.current });
      if (fresh === null) return; // network hiccup or signed out — try again next tick
      // The cursor only moves once messages have actually arrived — a poll
      // that returns nothing (e.g. not a member yet) can't skip anything.
      if (fresh.length > 0) cursorRef.current = fresh[fresh.length - 1].createdAt;
      if (firstLoad) setHasMore(fresh.length >= PAGE_SIZE);
      setLoaded(true);
      merge(fresh, dropId);
    },
    [channelId, merge]
  );

  useEffect(() => {
    poll();
    const interval = setInterval(() => {
      if (document.visibilityState === "visible") poll();
    }, POLL_MS);
    return () => clearInterval(interval);
  }, [poll]);

  function loadOlder() {
    const oldest = messages.find((m) => !m.id.startsWith("tmp-"));
    if (!oldest) return;
    startLoadOlder(async () => {
      const older = await fetchMessages(channelId, { before: oldest.createdAt });
      if (older === null) return;
      setHasMore(older.length >= PAGE_SIZE);
      setMessages((prev) => {
        const seen = new Set(prev.map((m) => m.id));
        return [...older.filter((m) => !seen.has(m.id)), ...prev];
      });
    });
  }

  // Your own message shows up the instant you press Send (dimmed, "Sending…")
  // and is swapped for the real one when the server confirms — the wait for
  // the round trip and the next poll is no longer something you sit through.
  // It shows the same cleaned-up text everyone else will see; only the Sponsor
  // Teacher sees the original.
  const onSending = useCallback(
    (body: string, hasFile: boolean) => {
      const id = `tmp-${++tmpRef.current}`;
      const shown = showRealText ? body : filterProfanity(body).filtered;
      setMessages((prev) => [
        ...prev,
        {
          id,
          body: shown,
          attachmentUrl: null,
          createdAt: new Date().toISOString(),
          sender: { id: userId, firstName: "", lastName: "", avatarUrl: null },
          reactions: [],
          pending: hasFile ? "Uploading attachment…" : "Sending…",
        },
      ]);
      scrollerRef.current?.scrollTo({ top: 0 });
      return id;
    },
    [showRealText, userId]
  );

  const onSettled = useCallback(
    async (id: string, ok: boolean) => {
      if (!ok) {
        setMessages((prev) => prev.filter((m) => m.id !== id));
        return;
      }
      try {
        await poll(id);
      } finally {
        setMessages((prev) => prev.filter((m) => m.id !== id));
      }
    },
    [poll]
  );

  // Reactions don't create a new ChatMessage row, so the cursor poll never
  // surfaces your own just-added one — apply it locally right away.
  function applyReaction(messageId: string, emoji: string, add: boolean) {
    setMessages((prev) =>
      prev.map((m) => {
        if (m.id !== messageId) return m;
        const reactions = add
          ? [...m.reactions.filter((r) => !(r.userId === userId && r.emoji === emoji)), { userId, emoji }]
          : m.reactions.filter((r) => !(r.userId === userId && r.emoji === emoji));
        return { ...m, reactions };
      })
    );
  }

  return (
    <>
      {/* column-reverse (not a scrollIntoView effect) so the thread opens
          already at the newest message and stays pinned there as new ones
          arrive, the same way Instagram/Slack do it — the array itself
          stays oldest-first everywhere else, only reversed here for
          display. The last child below is therefore the visual TOP. */}
      <div ref={scrollerRef} className="flex flex-1 flex-col-reverse gap-2 overflow-y-auto p-4">
        {[...messages].reverse().map((m) => (
          <MessageRow key={m.id} message={m} userId={userId} isOversight={isOversight} onReactionChange={applyReaction} />
        ))}
        {hasMore && (
          <button
            type="button"
            onClick={loadOlder}
            disabled={loadingOlder}
            className="mx-auto mb-1 rounded-full border border-border px-3 py-1 text-xs font-medium text-text-secondary hover:bg-surface-2 disabled:opacity-50"
          >
            {loadingOlder ? "Loading…" : "Load earlier messages"}
          </button>
        )}
        {!loaded && <p className="text-sm text-text-muted">Loading messages…</p>}
        {loaded && messages.length === 0 && <p className="text-sm text-text-muted">No messages yet.</p>}
      </div>
      {canPost && <Composer channelId={channelId} onSending={onSending} onSettled={onSettled} />}
    </>
  );
}

function ChannelHeader({
  channel,
  canManage,
  isOversight,
  userId,
  members,
  onChange,
  clubLabel,
  onBack,
}: {
  channel: ChannelData;
  canManage: boolean;
  isOversight: boolean;
  userId: string;
  members: MemberOption[];
  onChange: () => void;
  clubLabel?: { name: string; href: string };
  onBack?: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [addingUserId, setAddingUserId] = useState("");
  const [pending, startTransition] = useTransition();
  const pendingRequests = channel.memberships.filter((m) => m.status === "PENDING");
  const activeMembers = channel.memberships.filter((m) => m.status === "ACTIVE");
  const addableMembers = members.filter((m) => !activeMembers.some((am) => am.userId === m.id));

  return (
    <div className="border-b border-border p-3">
      <div className="flex items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2">
          {onBack && (
            <button type="button" onClick={onBack} aria-label="Back to all chats" className="-ml-1 shrink-0 rounded-full p-1 text-text-secondary hover:bg-surface-2 md:hidden">
              <ChevronLeft className="h-5 w-5" strokeWidth={2} />
            </button>
          )}
          <div className="min-w-0">
            <span className="block truncate text-sm font-semibold text-text-primary">{channelDisplayName(channel, userId)}</span>
            {clubLabel && (
              <Link href={clubLabel.href} className="block truncate text-xs text-text-muted hover:text-accent">
                {clubLabel.name} · open club chat
              </Link>
            )}
          </div>
          {channel.restrictedPosting && <Badge tone="warning">Restricted posting</Badge>}
          {isOversight && <Badge tone="neutral">Oversight (read-only)</Badge>}
        </div>
        {(canManage || isOversight) && channel.visibility !== "DIRECT" && (
          <button onClick={() => setExpanded((v) => !v)} className="text-xs font-medium text-accent">
            {expanded ? "Hide" : "Manage"}
          </button>
        )}
      </div>

      {expanded && (
        <div className="mt-3 space-y-3">
          {canManage && pendingRequests.length > 0 && (
            <div className="space-y-1">
              <p className="text-xs font-semibold uppercase tracking-wide text-text-muted">Pending requests</p>
              {pendingRequests.map((m) => (
                <div key={m.userId} className="flex items-center justify-between gap-2 text-sm">
                  <span>{m.user.firstName} {m.user.lastName}</span>
                  <div className="flex gap-2">
                    <button
                      disabled={pending}
                      onClick={() => startTransition(async () => {
                        await approveChannelJoinAction(m.id);
                        onChange();
                      })}
                      className="text-xs font-medium text-success"
                    >
                      Approve
                    </button>
                    <button
                      disabled={pending}
                      onClick={() => startTransition(async () => {
                        await denyChannelJoinAction(m.id);
                        onChange();
                      })}
                      className="text-xs font-medium text-danger"
                    >
                      Deny
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
          <div className="space-y-1">
            <p className="text-xs font-semibold uppercase tracking-wide text-text-muted">Members ({activeMembers.length})</p>
            {activeMembers.map((m) => (
              <div key={m.userId} className="flex items-center justify-between gap-2 text-sm">
                <span className="flex items-center gap-2">
                  <Avatar firstName={m.user.firstName} lastName={m.user.lastName} src={m.user.avatarUrl} size="sm" />
                  {m.user.firstName} {m.user.lastName}
                </span>
                {canManage && (
                  <div className="flex items-center gap-2">
                    {channel.restrictedPosting && (
                      <label className="flex items-center gap-1 text-xs text-text-muted">
                        <input
                          type="checkbox"
                          checked={m.canPost}
                          onChange={(e) =>
                            startTransition(async () => {
                              await toggleCanPostAction(channel.id, m.userId, e.target.checked);
                              onChange();
                            })
                          }
                          className="h-3.5 w-3.5 accent-accent"
                        />
                        Can post
                      </label>
                    )}
                    <button
                      disabled={pending}
                      onClick={() => startTransition(async () => {
                        await removeChannelMemberAction(channel.id, m.userId);
                        onChange();
                      })}
                      className="text-xs font-medium text-danger"
                    >
                      Remove
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
          {canManage && channel.visibility === "INVITE" && addableMembers.length > 0 && (
            <div className="flex items-center gap-2">
              <Select value={addingUserId} onChange={(e) => setAddingUserId(e.target.value)} className="flex-1 text-xs">
                <option value="">Add member…</option>
                {addableMembers.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name}
                  </option>
                ))}
              </Select>
              <Button
                type="button"
                size="sm"
                disabled={pending || !addingUserId}
                onClick={() =>
                  startTransition(async () => {
                    await addMemberToInviteChannelAction(channel.id, addingUserId);
                    setAddingUserId("");
                    onChange();
                  })
                }
              >
                Add
              </Button>
            </div>
          )}
          {canManage && (
            <button
              disabled={pending}
              onClick={() => startTransition(async () => {
                if (confirm("Delete this channel?")) {
                  await deleteChannelAction(channel.id);
                  onChange();
                }
              })}
              className="text-xs font-medium text-danger"
            >
              Delete channel
            </button>
          )}
        </div>
      )}
    </div>
  );
}

const MY_BUBBLE = "bg-[#4f5bf0] text-white";

// Your messages sit on the right in blue; everyone else's on the left with
// their avatar and name — the layout every messaging app uses, so it's clear
// at a glance who said what.
function MessageRow({
  message,
  userId,
  isOversight,
  onReactionChange,
}: {
  message: ChatMessageData;
  userId: string;
  isOversight: boolean;
  onReactionChange: (messageId: string, emoji: string, add: boolean) => void;
}) {
  const [pending, startTransition] = useTransition();
  // Tap a message (or hover on desktop) to reveal the emoji picker; reactions
  // that already exist are always shown, the empty ones aren't cluttering
  // every single message.
  const [pickerOpen, setPickerOpen] = useState(false);
  const mine = message.sender.id === userId;
  const canReact = !isOversight && !message.pending;
  const reactionCounts = REACTION_EMOJI.map((emoji) => ({
    emoji,
    count: message.reactions.filter((r) => r.emoji === emoji).length,
    mine: message.reactions.some((r) => r.userId === userId && r.emoji === emoji),
  })).filter((r) => r.count > 0 || canReact);

  return (
    <div className={cn("group flex items-end gap-2", mine ? "flex-row-reverse" : "flex-row", message.pending && "opacity-60")}>
      {!mine && <Avatar firstName={message.sender.firstName} lastName={message.sender.lastName} src={message.sender.avatarUrl} size="sm" />}
      <div className={cn("flex min-w-0 max-w-[80%] flex-col", mine ? "items-end" : "items-start")}>
        {!mine && (
          <span className="mb-0.5 px-1 text-xs font-medium text-text-secondary">
            {message.sender.firstName} {message.sender.lastName}
          </span>
        )}
        <div
          onClick={canReact ? () => setPickerOpen((v) => !v) : undefined}
          className={cn(
            "rounded-2xl px-3.5 py-2 text-sm",
            canReact && "cursor-pointer",
            mine ? `rounded-br-md ${MY_BUBBLE}` : "rounded-bl-md bg-surface-2 text-text-primary"
          )}
        >
          {message.body && <p className="whitespace-pre-wrap break-words">{message.body}</p>}
          {message.attachmentUrl && (
            <a
              href={message.attachmentUrl}
              target="_blank"
              rel="noopener noreferrer"
              className={cn("inline-block text-xs font-medium underline", message.body && "mt-1", mine ? "text-white" : "text-accent")}
            >
              📎 Attachment
            </a>
          )}
        </div>
        <span className="mt-0.5 px-1 text-[10px] text-text-muted">
          {message.pending ?? new Date(message.createdAt).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}
        </span>
        {reactionCounts.length > 0 && (
          <div className={cn("mt-1 flex flex-wrap gap-1", mine && "justify-end")}>
            {reactionCounts.map((r) => (
              <button
                key={r.emoji}
                disabled={pending || isOversight}
                onClick={() =>
                  startTransition(async () => {
                    onReactionChange(message.id, r.emoji, !r.mine);
                    if (r.mine) await removeReactionAction(message.id, r.emoji);
                    else await addReactionAction(message.id, r.emoji);
                  })
                }
                className={cn(
                  "rounded-full border px-1.5 py-0.5 text-xs",
                  r.mine ? "border-accent bg-accent-soft" : "border-border text-text-secondary",
                  r.count === 0 && !pickerOpen && "hidden group-hover:inline-flex"
                )}
              >
                {r.emoji} {r.count > 0 && r.count}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function Composer({
  channelId,
  onSending,
  onSettled,
}: {
  channelId: string;
  onSending: (body: string, hasFile: boolean) => string;
  onSettled: (id: string, ok: boolean) => Promise<void>;
}) {
  const [body, setBody] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  function clearFile() {
    setFileName(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  // A plain submit handler, deliberately NOT <form action={...}>: a form
  // action runs inside a React transition, and React holds back every state
  // update made inside one (clearing the box, showing your message) until the
  // whole server round trip finishes — which is exactly what made sending
  // feel slow.
  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const text = body.trim();
    const hasFile = !!fileInputRef.current?.files?.[0];
    if (!text && !hasFile) {
      setError("Write a message or attach a file.");
      return;
    }
    setError(null);
    formData.set("body", body);
    // The message appears (dimmed) and the box clears right away; the server
    // round trip happens behind it. On failure the text comes back.
    const tmpId = onSending(text, hasFile);
    const sentBody = body;
    setBody("");
    clearFile();
    try {
      const res = await sendChatMessageAction(channelId, formData);
      if (res.error) {
        setError(res.error);
        setBody((current) => current || sentBody);
        await onSettled(tmpId, false);
      } else {
        await onSettled(tmpId, true);
      }
    } catch {
      setError("Couldn't send — check your connection and try again.");
      setBody((current) => current || sentBody);
      await onSettled(tmpId, false);
    }
  }

  return (
    <form onSubmit={submit} className="border-t border-border p-3">
      {error && <p className="mb-2 text-xs text-danger">{error}</p>}
      {fileName && (
        <div className="mb-2 flex items-center gap-1.5 rounded-lg bg-surface-2 px-2.5 py-1.5 text-xs text-text-secondary">
          <Paperclip className="h-3.5 w-3.5 shrink-0" strokeWidth={2} />
          <span className="min-w-0 flex-1 truncate">{fileName}</span>
          <button type="button" onClick={clearFile} aria-label="Remove attachment" className="shrink-0 text-text-muted hover:text-danger">
            <X className="h-3.5 w-3.5" strokeWidth={2} />
          </button>
        </div>
      )}
      <div className="flex items-center gap-2">
        <input
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="Write a message…"
          className="flex-1 rounded-xl border border-border bg-surface-0 px-3 py-2 text-sm outline-none focus:border-accent"
        />
        <input
          ref={fileInputRef}
          type="file"
          name="attachment"
          accept="image/*,.pdf"
          className="hidden"
          onChange={(e) => setFileName(e.target.files?.[0]?.name ?? null)}
        />
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          aria-label="Attach a file"
          title="Attach a file"
          className={cn(
            "flex h-9 w-9 shrink-0 items-center justify-center rounded-full border transition-colors",
            fileName ? "border-accent bg-accent-soft text-accent" : "border-border text-text-secondary hover:bg-surface-2"
          )}
        >
          <Paperclip className="h-4 w-4" strokeWidth={2} />
        </button>
        <Button type="submit" size="sm">
          Send
        </Button>
      </div>
      <p className="mt-1.5 text-[11px] text-text-muted">
        Only attach photos of students with their parent or guardian&rsquo;s permission. Messages are permanently logged and visible to your Sponsor Teacher.
      </p>
    </form>
  );
}

function NewChannelForm({ clubId, onDone }: { clubId: string; onDone: () => void }) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function submit(formData: FormData) {
    setError(null);
    startTransition(async () => {
      const res = await createChannelAction(clubId, { error: null }, formData);
      if (res.error) setError(res.error);
      else onDone();
    });
  }

  return (
    <form action={submit} className="space-y-2 rounded-xl border border-dashed border-border-strong p-2">
      <Input name="name" placeholder="Channel name" required />
      <Select name="visibility" defaultValue="OPEN">
        <option value="OPEN">Open — anyone can join</option>
        <option value="REQUEST">Request to join</option>
        <option value="INVITE">Invite only</option>
      </Select>
      <label className="flex items-center gap-1.5 text-xs text-text-secondary">
        <input type="checkbox" name="restrictedPosting" className="h-3.5 w-3.5 accent-accent" />
        Restrict posting to approved members
      </label>
      {error && <p className="text-xs text-danger">{error}</p>}
      <Button type="submit" size="sm" className="w-full" disabled={pending}>
        Create
      </Button>
    </form>
  );
}

function NewDMForm({ clubId, members, onCreated }: { clubId: string; members: MemberOption[]; onCreated: (channelId: string) => void }) {
  const [picked, setPicked] = useState<string[]>([]);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function toggle(id: string) {
    setPicked((prev) => (prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id]));
  }

  return (
    <div className="space-y-2 rounded-xl border border-dashed border-border-strong p-2">
      <div className="max-h-40 space-y-0.5 overflow-y-auto">
        {members.map((m) => (
          <label key={m.id} className="flex items-center gap-2 rounded-lg px-1.5 py-1 text-xs hover:bg-surface-2">
            <input type="checkbox" checked={picked.includes(m.id)} onChange={() => toggle(m.id)} className="h-3.5 w-3.5 accent-accent" />
            {m.name}
          </label>
        ))}
      </div>
      {error && <p className="text-xs text-danger">{error}</p>}
      <Button
        size="sm"
        className="w-full"
        disabled={pending || picked.length === 0}
        onClick={() =>
          startTransition(async () => {
            setError(null);
            const res = await startDirectChannelAction(clubId, picked);
            if (res.error) setError(res.error);
            else if (res.channelId) onCreated(res.channelId);
          })
        }
      >
        Start
      </Button>
    </div>
  );
}

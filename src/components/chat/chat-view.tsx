"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
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
  getChannelMessagesSinceAction,
  addReactionAction,
  removeReactionAction,
} from "@/app/actions/chat";
import { Button } from "@/components/ui/button";
import { Input, Select } from "@/components/ui/input";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/cn";

export type ChatRole = "SPONSOR_TEACHER" | "SUPER_ADMIN" | "ADMIN" | "MEMBER" | "OVERSIGHT";

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
};

const REACTION_EMOJI = ["👍", "❤️", "😂", "🎉"];
const POLL_MS = 4000;

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
}: {
  clubId: string;
  userId: string;
  chatRole: ChatRole;
  channels: ChannelData[];
  members: MemberOption[];
}) {
  const router = useRouter();
  const channels = initialChannels;
  const [selectedId, setSelectedId] = useState<string | null>(initialChannels[0]?.id ?? null);
  const [showNewChannel, setShowNewChannel] = useState(false);
  const [showNewDM, setShowNewDM] = useState(false);
  const [pending, startTransition] = useTransition();
  const canManage = chatRole === "ADMIN" || chatRole === "SUPER_ADMIN" || chatRole === "SPONSOR_TEACHER";
  const isOversight = chatRole === "OVERSIGHT";

  const selected = useMemo(() => channels.find((c) => c.id === selectedId) ?? null, [channels, selectedId]);
  const myMembership = selected?.memberships.find((m) => m.userId === userId);

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

      <div className="flex min-h-[400px] flex-col rounded-2xl border border-border bg-surface-1">
        {!selected ? (
          <div className="flex flex-1 items-center justify-center p-8 text-sm text-text-muted">Pick a channel to view messages.</div>
        ) : (
          <>
            <ChannelHeader channel={selected} canManage={canManage} isOversight={isOversight} userId={userId} members={members} onChange={reload} />
            {(() => {
              const canPost = !isOversight && myMembership?.status === "ACTIVE" && (!selected.restrictedPosting || myMembership.canPost);
              return (
                <>
                  {/* Keyed by membership status too, not just channelId: joining a
                      channel (PENDING/absent -> ACTIVE) needs a fresh mount so its
                      cursor restarts at epoch and picks up the channel's full prior
                      history, instead of inheriting a cursor a pre-membership poll
                      (correctly returning nothing while unauthorized) already
                      advanced past every message sent before joining. */}
                  <ChannelThread
                    key={`${selected.id}-${myMembership?.status ?? "none"}`}
                    channelId={selected.id}
                    userId={userId}
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
                              await joinChannelAction(selected.id);
                              reload();
                            })
                          }
                        >
                          {selected.visibility === "REQUEST" ? "Request to join" : "Join channel"}
                        </Button>
                      </div>
                    ) : !isOversight && selected.restrictedPosting && !myMembership?.canPost ? (
                      <p className="border-t border-border p-3 text-center text-xs text-text-muted">Only approved posters can send messages here.</p>
                    ) : (
                      <p className="border-t border-border p-3 text-center text-xs text-text-muted">Read-only oversight view.</p>
                    ))}
                </>
              );
            })()}
          </>
        )}
      </div>
    </div>
  );
}

// Keyed by channelId from the parent, so switching channels remounts this
// fresh (a new `messages`/`lastCheckedRef`) instead of needing an effect to
// reset state on prop change.
function ChannelThread({ channelId, userId, isOversight, canPost }: { channelId: string; userId: string; isOversight: boolean; canPost: boolean }) {
  const [messages, setMessages] = useState<ChatMessageData[]>([]);
  const lastCheckedRef = useRef(new Date(0));

  useEffect(() => {
    let cancelled = false;
    async function poll() {
      const requestStartedAt = new Date();
      const since = lastCheckedRef.current.toISOString();
      const fresh = await getChannelMessagesSinceAction(channelId, since);
      if (cancelled) return;
      // Only advance the cursor once the request actually resolves for this
      // still-live effect instance — advancing it eagerly (before the await)
      // let a cancelled invocation (e.g. React Strict Mode's dev-only double
      // effect-invoke) "poison" the cursor for the real one, silently
      // skipping every message that existed before mount.
      lastCheckedRef.current = requestStartedAt;
      if (fresh.length === 0) return;
      setMessages((prev) => {
        const seen = new Set(prev.map((m) => m.id));
        return [...prev, ...fresh.filter((m) => !seen.has(m.id))].map((m) => ({
          ...m,
          createdAt: typeof m.createdAt === "string" ? m.createdAt : (m.createdAt as Date).toISOString(),
        }));
      });
    }
    poll();
    const interval = setInterval(() => {
      if (document.visibilityState === "visible") poll();
    }, POLL_MS);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [channelId]);

  function refreshNow() {
    lastCheckedRef.current = new Date(0);
  }

  // Reactions don't create a new ChatMessage row, so the createdAt-cursor
  // poll above never surfaces one on a message it already fetched — update
  // that message's reactions in local state directly instead of waiting on
  // a poll that will never pick this up.
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
      <div className="flex-1 space-y-3 overflow-y-auto p-4">
        {messages.length === 0 && <p className="text-sm text-text-muted">No messages yet.</p>}
        {messages.map((m) => (
          <MessageRow key={m.id} message={m} userId={userId} isOversight={isOversight} onReactionChange={applyReaction} />
        ))}
      </div>
      {canPost && <Composer channelId={channelId} onSent={refreshNow} />}
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
}: {
  channel: ChannelData;
  canManage: boolean;
  isOversight: boolean;
  userId: string;
  members: MemberOption[];
  onChange: () => void;
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
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-text-primary">{channelDisplayName(channel, userId)}</span>
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
  const reactionCounts = REACTION_EMOJI.map((emoji) => ({
    emoji,
    count: message.reactions.filter((r) => r.emoji === emoji).length,
    mine: message.reactions.some((r) => r.userId === userId && r.emoji === emoji),
  })).filter((r) => r.count > 0 || !isOversight);

  return (
    <div className="flex items-start gap-2.5">
      <Avatar firstName={message.sender.firstName} lastName={message.sender.lastName} src={message.sender.avatarUrl} size="sm" />
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline gap-2">
          <span className="text-sm font-medium text-text-primary">{message.sender.firstName} {message.sender.lastName}</span>
          <span className="text-[11px] text-text-muted">{new Date(message.createdAt).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}</span>
        </div>
        {message.body && <p className="whitespace-pre-wrap text-sm text-text-primary">{message.body}</p>}
        {message.attachmentUrl && (
          <a href={message.attachmentUrl} target="_blank" rel="noopener noreferrer" className="mt-1 inline-block text-xs font-medium text-accent underline">
            📎 Attachment
          </a>
        )}
        <div className="mt-1 flex flex-wrap gap-1">
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
                r.mine ? "border-accent bg-accent-soft" : "border-border text-text-secondary"
              )}
            >
              {r.emoji} {r.count > 0 && r.count}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

function Composer({ channelId, onSent }: { channelId: string; onSent: () => void }) {
  const [body, setBody] = useState("");
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function submit(formData: FormData) {
    setError(null);
    formData.set("body", body);
    startTransition(async () => {
      const res = await sendChatMessageAction(channelId, formData);
      if (res.error) setError(res.error);
      else {
        setBody("");
        onSent();
      }
    });
  }

  return (
    <form action={submit} className="border-t border-border p-3">
      {error && <p className="mb-2 text-xs text-danger">{error}</p>}
      <div className="flex items-center gap-2">
        <input
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="Write a message…"
          className="flex-1 rounded-xl border border-border bg-surface-0 px-3 py-2 text-sm outline-none focus:border-accent"
        />
        <input type="file" name="attachment" accept="image/*,.pdf" className="w-28 text-xs" />
        <Button type="submit" size="sm" disabled={pending}>
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

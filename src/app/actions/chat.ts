"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { getChatContext, canCreateDirectChannel, canManageChannels, type ChatRole } from "@/lib/chat";
import { saveUploadedFile } from "@/lib/storage";
import { filterProfanity } from "@/lib/profanity-filter";

export type ActionState = { error: string | null; success?: boolean };

function revalidateChatPaths(clubId: string) {
  revalidatePath(`/director/${clubId}/chat`);
  revalidatePath(`/clubs`);
}

export async function createChannelAction(clubId: string, _prev: ActionState, formData: FormData): Promise<ActionState> {
  const ctx = await getChatContext(clubId);
  if (!ctx.authorized || !canManageChannels(ctx.chatRole)) return { error: "Only an Admin or above can create channels." };

  const name = String(formData.get("name") ?? "").trim();
  const visibility = String(formData.get("visibility") ?? "OPEN");
  const restrictedPosting = formData.get("restrictedPosting") === "on";
  if (!name) return { error: "Give the channel a name." };
  if (!["OPEN", "REQUEST", "INVITE"].includes(visibility)) return { error: "Invalid visibility." };

  const existing = await db.channel.findUnique({ where: { clubId_name: { clubId, name } } });
  if (existing) return { error: "A channel with that name already exists." };

  await db.channel.create({
    data: {
      clubId,
      name,
      visibility,
      restrictedPosting,
      createdById: ctx.userId,
      memberships: { create: { userId: ctx.userId, status: "ACTIVE", canPost: true } },
    },
  });

  revalidatePath(`/director/${clubId}/chat`);
  return { error: null, success: true };
}

export async function deleteChannelAction(channelId: string) {
  const channel = await db.channel.findUniqueOrThrow({ where: { id: channelId } });
  const ctx = await getChatContext(channel.clubId);
  if (!ctx.authorized || !canManageChannels(ctx.chatRole)) return;
  await db.channel.delete({ where: { id: channelId } });
  revalidateChatPaths(channel.clubId);
}

// OPEN channels join instantly; REQUEST channels need Admin+ approval.
export async function joinChannelAction(channelId: string): Promise<{ error: string | null }> {
  const channel = await db.channel.findUniqueOrThrow({ where: { id: channelId } });
  const ctx = await getChatContext(channel.clubId);
  if (!ctx.authorized || ctx.chatRole === "OVERSIGHT") return { error: "You can't join this channel." };
  if (channel.visibility !== "OPEN" && channel.visibility !== "REQUEST") return { error: "This channel can't be joined directly." };

  await db.channelMembership.upsert({
    where: { channelId_userId: { channelId, userId: ctx.userId } },
    update: {},
    create: { channelId, userId: ctx.userId, status: channel.visibility === "REQUEST" ? "PENDING" : "ACTIVE", canPost: !channel.restrictedPosting },
  });

  revalidateChatPaths(channel.clubId);
  return { error: null };
}

export async function approveChannelJoinAction(membershipId: string) {
  const membership = await db.channelMembership.findUniqueOrThrow({ where: { id: membershipId }, include: { channel: true } });
  const ctx = await getChatContext(membership.channel.clubId);
  if (!ctx.authorized || !canManageChannels(ctx.chatRole)) return;
  await db.channelMembership.update({ where: { id: membershipId }, data: { status: "ACTIVE" } });
  revalidateChatPaths(membership.channel.clubId);
}

export async function denyChannelJoinAction(membershipId: string) {
  const membership = await db.channelMembership.findUniqueOrThrow({ where: { id: membershipId }, include: { channel: true } });
  const ctx = await getChatContext(membership.channel.clubId);
  if (!ctx.authorized || !canManageChannels(ctx.chatRole)) return;
  await db.channelMembership.delete({ where: { id: membershipId } });
  revalidateChatPaths(membership.channel.clubId);
}

export async function addMemberToInviteChannelAction(channelId: string, userId: string) {
  const channel = await db.channel.findUniqueOrThrow({ where: { id: channelId } });
  const ctx = await getChatContext(channel.clubId);
  if (!ctx.authorized || !canManageChannels(ctx.chatRole)) return;
  await db.channelMembership.upsert({
    where: { channelId_userId: { channelId, userId } },
    update: { status: "ACTIVE" },
    create: { channelId, userId, status: "ACTIVE", canPost: !channel.restrictedPosting },
  });
  revalidateChatPaths(channel.clubId);
}

export async function removeChannelMemberAction(channelId: string, userId: string) {
  const channel = await db.channel.findUniqueOrThrow({ where: { id: channelId } });
  const ctx = await getChatContext(channel.clubId);
  // A member can always remove themselves (leave); removing someone else needs Admin+.
  if (!ctx.authorized || (ctx.userId !== userId && !canManageChannels(ctx.chatRole))) return;
  await db.channelMembership.deleteMany({ where: { channelId, userId } });
  revalidateChatPaths(channel.clubId);
}

export async function toggleCanPostAction(channelId: string, userId: string, canPost: boolean) {
  const channel = await db.channel.findUniqueOrThrow({ where: { id: channelId } });
  const ctx = await getChatContext(channel.clubId);
  if (!ctx.authorized || !canManageChannels(ctx.chatRole)) return;
  await db.channelMembership.updateMany({ where: { channelId, userId }, data: { canPost } });
  revalidateChatPaths(channel.clubId);
}

// A 1:1 or Super-Admin group chat — just a Channel with visibility DIRECT
// and a fixed participant list. Dedupes an existing DIRECT channel with the
// exact same participant set instead of creating a duplicate.
export async function startDirectChannelAction(clubId: string, participantUserIds: string[]): Promise<{ error: string | null; channelId?: string }> {
  const ctx = await getChatContext(clubId);
  if (!ctx.authorized || ctx.chatRole === "OVERSIGHT") return { error: "You can't start a conversation here." };

  const allIds = Array.from(new Set([ctx.userId, ...participantUserIds]));
  if (allIds.length < 2) return { error: "Pick at least one other person." };

  const memberships = await db.clubMembership.findMany({ where: { clubId, userId: { in: allIds }, status: "ACTIVE" } });
  if (memberships.length !== allIds.length) return { error: "Everyone in this conversation needs to be an active club member." };

  const roleByUserId = new Map(
    memberships.map((m) => [
      m.userId,
      (m.role === "DIRECTOR" ? "SPONSOR_TEACHER" : m.role === "SUPER_ADMIN" ? "SUPER_ADMIN" : m.role === "OFFICER" ? "ADMIN" : "MEMBER") as ChatRole,
    ])
  );
  const check = canCreateDirectChannel(allIds.map((id) => roleByUserId.get(id)!));
  if (!check.ok) return { error: check.error! };

  const existingChannels = await db.channel.findMany({
    where: { clubId, visibility: "DIRECT" },
    include: { memberships: { select: { userId: true } } },
  });
  const existing = existingChannels.find((c) => {
    const ids = c.memberships.map((m) => m.userId).sort();
    return ids.length === allIds.length && ids.every((id, i) => id === [...allIds].sort()[i]);
  });
  if (existing) return { error: null, channelId: existing.id };

  const channel = await db.channel.create({
    data: {
      clubId,
      visibility: "DIRECT",
      createdById: ctx.userId,
      memberships: { create: allIds.map((userId) => ({ userId, status: "ACTIVE" as const, canPost: true })) },
    },
  });

  revalidateChatPaths(clubId);
  return { error: null, channelId: channel.id };
}

export async function sendChatMessageAction(channelId: string, formData: FormData): Promise<{ error: string | null }> {
  const channel = await db.channel.findUniqueOrThrow({ where: { id: channelId } });
  const ctx = await getChatContext(channel.clubId);
  if (!ctx.authorized || ctx.chatRole === "OVERSIGHT") return { error: "You can't post here." };

  const membership = await db.channelMembership.findUnique({ where: { channelId_userId: { channelId, userId: ctx.userId } } });
  if (!membership || membership.status !== "ACTIVE") return { error: "You need to join this channel first." };
  if (channel.restrictedPosting && !membership.canPost) return { error: "Only approved posters can send messages in this channel." };

  const rawBody = String(formData.get("body") ?? "").trim();
  const file = formData.get("attachment");
  if (!rawBody && !(file instanceof File && file.size > 0)) return { error: "Write a message or attach a file." };

  let attachmentUrl: string | undefined;
  if (file instanceof File && file.size > 0) {
    try {
      attachmentUrl = (await saveUploadedFile(file, "chat-attachments")).url;
    } catch (e) {
      return { error: e instanceof Error ? e.message : "Attachment failed to upload." };
    }
  }

  // body keeps the real, original text (the permanent record the Sponsor
  // Teacher can always see); filteredBody is only set when the profanity
  // filter actually changed something, and is what everyone else is shown.
  const { filtered, wasFiltered } = filterProfanity(rawBody);
  await db.chatMessage.create({
    data: { channelId, senderId: ctx.userId, body: rawBody, filteredBody: wasFiltered ? filtered : null, attachmentUrl },
  });

  // Notify other ACTIVE participants only — never the OVERSIGHT tier, whose
  // access is a pull (they can go look), not a push (they don't get pinged
  // for every message in every club's chat at their school). Recipients get
  // the filtered preview text, same as they'd see in the channel itself.
  const recipients = await db.channelMembership.findMany({
    where: { channelId, status: "ACTIVE", userId: { not: ctx.userId } },
    select: { userId: true },
  });
  if (recipients.length > 0) {
    await db.notification.createMany({
      data: recipients.map((r) => ({
        userId: r.userId,
        type: "CHAT_MESSAGE",
        title: channel.name ? `New message in ${channel.name}` : "New message",
        body: (wasFiltered ? filtered : rawBody) || "Sent an attachment",
        linkUrl: `/director/${channel.clubId}/chat?channel=${channelId}`,
      })),
    });
  }

  revalidatePath(`/director/${channel.clubId}/chat`);
  return { error: null };
}

export async function getChannelMessagesSinceAction(channelId: string, since: string) {
  const channel = await db.channel.findUniqueOrThrow({ where: { id: channelId } });
  const ctx = await getChatContext(channel.clubId);
  if (!ctx.authorized) return [];
  if (ctx.chatRole !== "OVERSIGHT") {
    const membership = await db.channelMembership.findUnique({ where: { channelId_userId: { channelId, userId: ctx.userId } } });
    if (!membership || membership.status !== "ACTIVE") return [];
  }

  const sinceDate = new Date(since);
  if (isNaN(sinceDate.getTime())) return [];
  const messages = await db.chatMessage.findMany({
    where: { channelId, createdAt: { gt: sinceDate } },
    select: {
      id: true,
      channelId: true,
      body: true,
      filteredBody: true,
      attachmentUrl: true,
      createdAt: true,
      sender: { select: { id: true, firstName: true, lastName: true, avatarUrl: true } },
      reactions: { select: { userId: true, emoji: true } },
    },
    orderBy: { createdAt: "asc" },
    take: 50,
  });

  // The real, unfiltered text is resolved here, server-side, and only for
  // the Sponsor Teacher / oversight tier — a filtered message shouldn't hide
  // a real behavior problem from the one adult responsible for the club.
  // Everyone else gets the cleaned-up version; `filteredBody` itself never
  // crosses into the response for them, so there's nothing to reconstruct
  // the original from client-side.
  const showRealText = ctx.chatRole === "SPONSOR_TEACHER" || ctx.chatRole === "OVERSIGHT";
  return messages.map(({ filteredBody, ...m }) => ({
    ...m,
    body: showRealText ? m.body : (filteredBody ?? m.body),
  }));
}

export async function addReactionAction(messageId: string, emoji: string) {
  const message = await db.chatMessage.findUniqueOrThrow({ where: { id: messageId }, include: { channel: true } });
  const ctx = await getChatContext(message.channel.clubId);
  if (!ctx.authorized || ctx.chatRole === "OVERSIGHT") return;
  await db.chatMessageReaction.upsert({
    where: { messageId_userId_emoji: { messageId, userId: ctx.userId, emoji } },
    update: {},
    create: { messageId, userId: ctx.userId, emoji },
  });
  revalidatePath(`/director/${message.channel.clubId}/chat`);
}

export async function removeReactionAction(messageId: string, emoji: string) {
  const message = await db.chatMessage.findUniqueOrThrow({ where: { id: messageId }, include: { channel: true } });
  const ctx = await getChatContext(message.channel.clubId);
  if (!ctx.authorized) return;
  await db.chatMessageReaction.deleteMany({ where: { messageId, userId: ctx.userId, emoji } });
  revalidatePath(`/director/${message.channel.clubId}/chat`);
}

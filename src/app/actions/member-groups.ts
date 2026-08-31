"use server";

import { revalidatePath } from "next/cache";
import { getDirectorContext } from "@/lib/director";
import { db } from "@/lib/db";

export type MemberGroupState = { error: string | null };

export async function createMemberGroupAction(clubId: string, _prev: MemberGroupState, formData: FormData): Promise<MemberGroupState> {
  await getDirectorContext(clubId);
  const name = String(formData.get("name") ?? "").trim();
  const color = String(formData.get("color") ?? "").trim();
  if (!name) return { error: "Group name is required." };
  if (!color) return { error: "Pick a color for the group." };

  const existing = await db.memberGroup.findUnique({ where: { clubId_name: { clubId, name } } });
  if (existing) return { error: "A group with that name already exists." };

  await db.memberGroup.create({ data: { clubId, name, color } });
  revalidatePath(`/director/${clubId}/members`);
  return { error: null };
}

export async function deleteMemberGroupAction(groupId: string) {
  const group = await db.memberGroup.findUniqueOrThrow({ where: { id: groupId } });
  await getDirectorContext(group.clubId);
  await db.memberGroup.delete({ where: { id: groupId } });
  revalidatePath(`/director/${group.clubId}/members`);
}

export async function toggleGroupMembershipAction(groupId: string, userId: string) {
  const group = await db.memberGroup.findUniqueOrThrow({ where: { id: groupId } });
  await getDirectorContext(group.clubId);

  const existing = await db.memberGroupMembership.findUnique({ where: { groupId_userId: { groupId, userId } } });
  if (existing) {
    await db.memberGroupMembership.delete({ where: { id: existing.id } });
  } else {
    await db.memberGroupMembership.create({ data: { groupId, userId } });
  }
  revalidatePath(`/director/${group.clubId}/members`);
  revalidatePath(`/director/${group.clubId}/events/new`);
}

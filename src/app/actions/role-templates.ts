"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { getDirectorContext } from "@/lib/director";

export type SavedRole = {
  id: string;
  name: string;
  capacity: number;
  allowedGrades: string | null;
  waitlistCapacity: number | null;
  payCents: number | null;
  payNote: string | null;
};

export type SaveRoleInput = Omit<SavedRole, "id">;

const SAVED_ROLE_SELECT = { id: true, name: true, capacity: true, allowedGrades: true, waitlistCapacity: true, payCents: true, payNote: true } as const;

// Saving a role under a name that's already saved updates that saved role
// instead of making a duplicate — so "save" doubles as "update my Referee
// template with the new pay".
export async function saveRoleTemplateAction(clubId: string, input: SaveRoleInput): Promise<{ error: string | null; role?: SavedRole }> {
  await getDirectorContext(clubId);
  const name = input.name.trim();
  if (!name) return { error: "Give the role a name first." };
  const data = {
    capacity: Math.max(1, Math.round(input.capacity) || 1),
    allowedGrades: input.allowedGrades?.trim() || null,
    waitlistCapacity: input.waitlistCapacity && input.waitlistCapacity > 0 ? Math.round(input.waitlistCapacity) : null,
    payCents: input.payCents != null && input.payCents >= 0 ? Math.round(input.payCents) : null,
    payNote: input.payNote?.trim() || null,
  };
  const role = await db.clubRoleTemplate.upsert({
    where: { clubId_name: { clubId, name } },
    create: { clubId, name, ...data },
    update: data,
    select: SAVED_ROLE_SELECT,
  });
  revalidatePath(`/director/${clubId}/events`);
  return { error: null, role };
}

export async function deleteRoleTemplateAction(clubId: string, templateId: string): Promise<{ error: string | null }> {
  await getDirectorContext(clubId);
  await db.clubRoleTemplate.deleteMany({ where: { id: templateId, clubId } });
  return { error: null };
}

"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth/session";
import { getDirectorContext } from "@/lib/director";
import { db } from "@/lib/db";

export type ActionState = { error: string | null; success?: boolean };

// Full contact list including phone numbers — Director-only (isDirector),
// used by the "Manage Contacts" panel. Never call this for the event
// proposal form's picker; see getClubContactNamesAction below.
export async function createClubContactAction(clubId: string, _prev: ActionState, formData: FormData): Promise<ActionState> {
  const { isDirector } = await getDirectorContext(clubId);
  if (!isDirector) return { error: "Only the club's Director can manage contacts." };

  const name = String(formData.get("name") ?? "").trim();
  const phone = String(formData.get("phone") ?? "").trim();
  if (!name || !phone) return { error: "Name and phone number are required." };

  await db.clubContact.create({ data: { clubId, name, phone } });
  revalidatePath(`/director/${clubId}/contacts`);
  return { error: null, success: true };
}

export async function updateClubContactAction(contactId: string, _prev: ActionState, formData: FormData): Promise<ActionState> {
  const contact = await db.clubContact.findUniqueOrThrow({ where: { id: contactId } });
  const { isDirector } = await getDirectorContext(contact.clubId);
  if (!isDirector) return { error: "Only the club's Director can manage contacts." };

  const name = String(formData.get("name") ?? "").trim();
  const phone = String(formData.get("phone") ?? "").trim();
  if (!name || !phone) return { error: "Name and phone number are required." };

  await db.clubContact.update({ where: { id: contactId }, data: { name, phone } });
  revalidatePath(`/director/${contact.clubId}/contacts`);
  return { error: null, success: true };
}

export async function deleteClubContactAction(contactId: string) {
  const contact = await db.clubContact.findUniqueOrThrow({ where: { id: contactId } });
  const { isDirector } = await getDirectorContext(contact.clubId);
  if (!isDirector) return;
  await db.clubContact.delete({ where: { id: contactId } });
  revalidatePath(`/director/${contact.clubId}/contacts`);
}

// Reveals ONE contact's phone number on demand — scoped to "is this person
// an active member of the contact's club" (not director-only), and never
// returns more than the one contact asked for. The event-proposal form's
// picker itself only ever queries { id, name }, so a phone number never
// ships into that page's props/bundle in the first place; this is the only
// path a phone number can reach the client through.
export async function revealClubContactPhoneAction(contactId: string): Promise<{ error: string | null; phone?: string }> {
  const authUser = await requireUser();
  const contact = await db.clubContact.findUnique({ where: { id: contactId }, select: { phone: true, clubId: true } });
  if (!contact) return { error: "Contact not found." };

  const membership = await db.clubMembership.findUnique({
    where: { userId_clubId: { userId: authUser.id, clubId: contact.clubId } },
    select: { status: true },
  });
  if (!membership || membership.status !== "ACTIVE") {
    return { error: "You need to be an active member of this club to view this contact." };
  }
  return { error: null, phone: contact.phone };
}

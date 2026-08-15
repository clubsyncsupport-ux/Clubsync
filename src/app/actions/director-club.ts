"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { getDirectorContext } from "@/lib/director";
import { saveUploadedFile } from "@/lib/storage";

export type ActionState = { error: string | null; success?: boolean };

export async function approveMembershipAction(membershipId: string, clubId: string) {
  await getDirectorContext(clubId);
  await db.clubMembership.update({ where: { id: membershipId }, data: { status: "ACTIVE" } });
  revalidatePath(`/director/${clubId}/members`);
}

export async function removeMemberAction(membershipId: string, clubId: string) {
  const { isDirector } = await getDirectorContext(clubId);
  // Only the Director can remove an existing member or the director role
  // itself — Admins (promoted members) get every other director capability
  // but not this one. (Denying a still-pending join request is separate —
  // see denyMembershipAction — and isn't restricted this way.)
  if (!isDirector) return;
  const target = await db.clubMembership.findUnique({ where: { id: membershipId } });
  if (!target || target.role === "DIRECTOR") return;
  await db.clubMembership.delete({ where: { id: membershipId } });
  revalidatePath(`/director/${clubId}/members`);
}

export async function denyMembershipAction(membershipId: string, clubId: string) {
  await getDirectorContext(clubId);
  await db.clubMembership.deleteMany({ where: { id: membershipId, status: "PENDING" } });
  revalidatePath(`/director/${clubId}/members`);
}

// Adds a student straight onto the roster as an ACTIVE member — skips the
// join-request/invite round-trip entirely (works the same for public and
// private clubs), for directors picking specific students in person.
export async function addStudentToClubAction(clubId: string, userId: string) {
  const { club } = await getDirectorContext(clubId);
  await db.clubMembership.upsert({
    where: { userId_clubId: { userId, clubId } },
    update: { status: "ACTIVE" },
    create: { userId, clubId, role: "MEMBER", status: "ACTIVE" },
  });
  await db.notification.create({
    data: {
      userId,
      type: "PLATFORM",
      title: "You've been added to a club",
      body: `A director added you to ${club.name}.`,
      linkUrl: `/clubs/${club.slug}`,
    },
  });
  revalidatePath(`/director/${clubId}/members`);
  revalidatePath(`/director/${clubId}/members/add`);
}

export async function promoteMemberAction(membershipId: string, clubId: string, role: "MEMBER" | "OFFICER") {
  const { isDirector } = await getDirectorContext(clubId);
  // Only the Director can promote members to Admin or demote them — Admins
  // can't create or remove other Admins.
  if (!isDirector) return;
  await db.clubMembership.update({ where: { id: membershipId }, data: { role } });
  revalidatePath(`/director/${clubId}/members`);
}

export async function createAnnouncementAction(clubId: string, formData: FormData): Promise<ActionState> {
  const { user } = await getDirectorContext(clubId);
  const title = String(formData.get("title") ?? "").trim();
  const body = String(formData.get("body") ?? "").trim();
  if (!title || !body) return { error: "Title and message are required." };

  const announcement = await db.announcement.create({ data: { clubId, title, body, createdById: user.id } });

  const members = await db.clubMembership.findMany({ where: { clubId, status: "ACTIVE" } });
  await db.notification.createMany({
    data: members.map((m) => ({
      userId: m.userId,
      type: "ANNOUNCEMENT" as const,
      title: `New announcement`,
      body: title,
      linkUrl: `/notifications`,
    })),
  });

  revalidatePath(`/director/${clubId}/announcements`);
  revalidatePath(`/director/${clubId}`);
  return { error: null, success: true };
}

export async function deleteAnnouncementAction(announcementId: string, clubId: string) {
  await getDirectorContext(clubId);
  await db.announcement.delete({ where: { id: announcementId } });
  revalidatePath(`/director/${clubId}/announcements`);
}

export async function updateClubSettingsAction(clubId: string, formData: FormData): Promise<ActionState> {
  await getDirectorContext(clubId);

  const name = String(formData.get("name") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const missionStatement = String(formData.get("missionStatement") ?? "").trim();
  const category = String(formData.get("category") ?? "").trim();
  const color = String(formData.get("color") ?? "").trim();
  const meetingSchedule = String(formData.get("meetingSchedule") ?? "").trim();
  const meetingLocation = String(formData.get("meetingLocation") ?? "").trim();
  const contactEmail = String(formData.get("contactEmail") ?? "").trim();
  const instagramUrl = String(formData.get("instagramUrl") ?? "").trim();
  const websiteUrl = String(formData.get("websiteUrl") ?? "").trim();
  const requiresApproval = formData.get("requiresApproval") === "on";

  if (!name || !description) return { error: "Club name and description are required." };

  let logoUrl: string | undefined;
  let bannerUrl: string | undefined;
  const logoFile = formData.get("logo");
  const bannerFile = formData.get("banner");
  try {
    if (logoFile instanceof File && logoFile.size > 0) logoUrl = (await saveUploadedFile(logoFile, "club-logos")).url;
    if (bannerFile instanceof File && bannerFile.size > 0) bannerUrl = (await saveUploadedFile(bannerFile, "club-banners")).url;
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Upload failed." };
  }

  await db.club.update({
    where: { id: clubId },
    data: {
      name,
      description,
      missionStatement: missionStatement || null,
      category,
      color,
      meetingSchedule: meetingSchedule || null,
      meetingLocation: meetingLocation || null,
      contactEmail: contactEmail || null,
      instagramUrl: instagramUrl || null,
      websiteUrl: websiteUrl || null,
      requiresApproval,
      ...(logoUrl ? { logoUrl } : {}),
      ...(bannerUrl ? { bannerUrl } : {}),
    },
  });

  revalidatePath(`/director/${clubId}/settings`);
  revalidatePath(`/clubs`);
  return { error: null, success: true };
}

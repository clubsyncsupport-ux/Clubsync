"use server";

import { revalidatePath } from "next/cache";
import { after } from "next/server";
import { requireUser } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { saveUploadedFile } from "@/lib/storage";
import { canPostSchoolFeed, canDeleteSchoolFeedPost } from "@/lib/school-feed";
import { isSchoolAdminTier } from "@/lib/constants";

export type ActionState = { error: string | null; success?: boolean };

const POSTER_SELECT = {
  id: true,
  firstName: true,
  accountKind: true,
  platformRole: true,
  schoolId: true,
  schoolAdminOfId: true,
  staffApprovalStatus: true,
} as const;

export async function postSchoolAnnouncementAction(schoolId: string, _prev: ActionState, formData: FormData): Promise<ActionState> {
  const authUser = await requireUser();
  const me = await db.user.findUniqueOrThrow({ where: { id: authUser.id }, select: POSTER_SELECT });
  if (!canPostSchoolFeed(me, schoolId)) return { error: "Only teachers and school admins can post here." };

  const body = String(formData.get("body") ?? "").trim();
  const eventId = String(formData.get("eventId") ?? "").trim() || null;
  const file = formData.get("image");
  if (!body) return { error: "Write something to post." };
  if (body.length > 2000) return { error: "Keep it under 2,000 characters." };

  if (eventId) {
    const ev = await db.event.findFirst({ where: { id: eventId, club: { schoolId } }, select: { id: true } });
    if (!ev) return { error: "That event isn't available to promote." };
  }

  let imageUrl: string | null = null;
  if (file instanceof File && file.size > 0) {
    if (!file.type.startsWith("image/")) return { error: "Only images can be attached to an announcement." };
    try {
      imageUrl = (await saveUploadedFile(file, "school-announcements")).url;
    } catch (e) {
      return { error: e instanceof Error ? e.message : "The image failed to upload." };
    }
  }

  await db.schoolAnnouncement.create({ data: { schoolId, authorId: me.id, body, imageUrl, eventId } });

  // Pinging every student and teacher at the school is the slow part — do it
  // after the poster already has their confirmation instead of making them
  // wait on it.
  const preview = body.length > 140 ? `${body.slice(0, 137)}...` : body;
  after(async () => {
    const recipients = await db.user.findMany({
      where: { id: { not: me.id }, accountStatus: "ACTIVE", OR: [{ schoolId }, { schoolAdminOfId: schoolId }] },
      select: { id: true, accountKind: true, platformRole: true },
    });
    if (recipients.length === 0) return;
    await db.notification.createMany({
      data: recipients.map((r) => ({
        userId: r.id,
        type: "SCHOOL_ANNOUNCEMENT",
        title: "School announcement",
        body: preview,
        // Each role lives in its own shell, so each gets the feed page that
        // sits inside it.
        linkUrl: isSchoolAdminTier(r.platformRole) ? `/school-admin/${schoolId}/school-feed` : r.accountKind === "STAFF" ? "/teacher/school-feed" : "/school-feed",
      })),
    });
  });

  revalidatePath("/school-feed");
  revalidatePath("/teacher/school-feed");
  revalidatePath(`/school-admin/${schoolId}/school-feed`);
  revalidatePath("/home");
  revalidatePath("/chats");
  return { error: null, success: true };
}

export async function deleteSchoolAnnouncementAction(id: string) {
  const authUser = await requireUser();
  const [me, post] = await Promise.all([
    db.user.findUniqueOrThrow({ where: { id: authUser.id }, select: POSTER_SELECT }),
    db.schoolAnnouncement.findUnique({ where: { id }, select: { authorId: true, schoolId: true } }),
  ]);
  if (!post || !canDeleteSchoolFeedPost(me, post)) return;
  await db.schoolAnnouncement.delete({ where: { id } });
  revalidatePath("/school-feed");
  revalidatePath("/teacher/school-feed");
  revalidatePath(`/school-admin/${post.schoolId}/school-feed`);
  revalidatePath("/home");
  revalidatePath("/chats");
}

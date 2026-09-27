"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { getDirectorContext } from "@/lib/director";
import { initialApprovalStatus, notifySchoolAdmins } from "@/lib/approvals";
import { schoolYearFor } from "@/lib/school-year";
import { schoolNow } from "@/lib/school-time";

export type ActionState = { error: string | null; success?: boolean };

export async function submitClubRegistrationAction(clubId: string, _prev: ActionState, formData: FormData): Promise<ActionState> {
  const { club, user } = await getDirectorContext(clubId);

  const description = String(formData.get("description") ?? "").trim();
  const meetingSchedule = String(formData.get("meetingSchedule") ?? "").trim() || null;
  const meetingLocation = String(formData.get("meetingLocation") ?? "").trim() || null;
  const fundraisingGuidelines = String(formData.get("fundraisingGuidelines") ?? "").trim() || null;
  if (!description) return { error: "Description is required." };

  const schoolYear = schoolYearFor(schoolNow());
  const existing = await db.clubRegistration.findUnique({ where: { clubId_schoolYear: { clubId, schoolYear } } });
  if (existing) return { error: `A registration for ${schoolYear} already exists.` };

  const { status, autoSponsor } = await initialApprovalStatus(clubId, user.id);
  const now = new Date();

  await db.clubRegistration.create({
    data: {
      clubId,
      schoolYear,
      description,
      meetingSchedule,
      meetingLocation,
      fundraisingGuidelines,
      status,
      submittedById: user.id,
      sponsorApprovedById: autoSponsor ? user.id : null,
      sponsorApprovedAt: autoSponsor ? now : null,
    },
  });

  if (status === "PENDING_SPONSOR") {
    const director = await db.clubMembership.findFirst({ where: { clubId, role: "DIRECTOR", status: "ACTIVE" } });
    if (director) {
      await db.notification.create({
        data: {
          userId: director.userId,
          type: "CLUB_REGISTRATION",
          title: "Club registration needs your sign-off",
          body: `${club.name}'s ${schoolYear} registration needs your approval as Sponsor Teacher.`,
          linkUrl: `/director/${clubId}/registration`,
        },
      });
    }
  } else {
    await notifySchoolAdmins(club.schoolId, {
      type: "CLUB_REGISTRATION",
      title: "Club registration needs your approval",
      body: `${club.name}'s ${schoolYear} registration has been sponsor-approved and is ready for administrator review.`,
      linkUrl: `/school-admin/${club.schoolId}/approvals`,
    });
  }

  revalidatePath(`/director/${clubId}/registration`);
  revalidatePath(`/director/${clubId}`);
  return { error: null, success: true };
}

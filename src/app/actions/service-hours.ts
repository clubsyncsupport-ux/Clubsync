"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { checkAndUnlockAchievements } from "@/lib/achievements";

export type ActionState = { error: string | null; success?: boolean };

// Self-reported hours count toward the student's total immediately — the
// platform doesn't have the staff to individually verify outside
// volunteering, so "self-reported" is an honesty-based label, not a
// pending-review queue. Admins can still edit/remove a record after the
// fact from the admin Service Hours page if something looks off.
export async function reportSelfServiceHoursAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const user = await requireUser();

  const taskDescription = String(formData.get("taskDescription") ?? "").trim();
  const organizationName = String(formData.get("organizationName") ?? "").trim();
  const supervisorName = String(formData.get("supervisorName") ?? "").trim();
  const dateStr = String(formData.get("performedAt") ?? "");
  const hours = Number(formData.get("hours") ?? 0);
  const reflection = String(formData.get("reflection") ?? "").trim() || null;

  if (!taskDescription) return { error: "Enter what you did." };
  if (!organizationName) return { error: "Enter the organization." };
  if (!dateStr) return { error: "Enter the date." };
  if (!hours || hours <= 0) return { error: "Enter hours greater than 0." };

  const performedAt = new Date(dateStr);
  if (isNaN(performedAt.getTime())) return { error: "Invalid date." };

  await db.serviceHourRecord.create({
    data: {
      userId: user.id,
      clubId: null,
      hours,
      taskDescription,
      organizationName,
      supervisorName: supervisorName || null,
      performedAt,
      reflection,
      selfReported: true,
      status: "VERIFIED",
    },
  });

  await checkAndUnlockAchievements(user.id);

  revalidatePath("/service-hours");
  return { error: null, success: true };
}

"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireTeacher } from "@/lib/teacher";
import { db } from "@/lib/db";

async function requirePendingRequest(clubId: string) {
  const teacher = await requireTeacher();
  const club = await db.club.findUniqueOrThrow({ where: { id: clubId }, include: { createdBy: true } });
  if (club.pendingSupervisorId !== teacher.id || club.approvalStatus !== "PENDING_SUPERVISOR") redirect("/teacher/supervising-requests");
  return { teacher, club };
}

export async function approveSupervisorRequestAction(clubId: string) {
  const { teacher, club } = await requirePendingRequest(clubId);

  await db.$transaction([
    db.club.update({ where: { id: clubId }, data: { approvalStatus: "APPROVED" } }),
    db.clubMembership.upsert({
      where: { userId_clubId: { userId: teacher.id, clubId } },
      update: { role: "DIRECTOR", status: "ACTIVE" },
      create: { userId: teacher.id, clubId, role: "DIRECTOR", status: "ACTIVE" },
    }),
    db.notification.create({
      data: {
        userId: club.createdById,
        type: "CLUB_SUPERVISOR_REQUEST",
        title: `${club.name} is live!`,
        body: `${teacher.firstName} ${teacher.lastName} approved your club — it's now public.`,
        linkUrl: `/director/${clubId}`,
      },
    }),
  ]);

  revalidatePath("/teacher");
  revalidatePath("/teacher/supervising-requests");
  redirect(`/director/${clubId}`);
}

export async function rejectSupervisorRequestAction(clubId: string) {
  const { teacher, club } = await requirePendingRequest(clubId);

  await db.notification.create({
    data: {
      userId: club.createdById,
      type: "CLUB_SUPERVISOR_REQUEST",
      title: "Club request declined",
      body: `${teacher.firstName} ${teacher.lastName} didn't approve "${club.name}."`,
    },
  });
  // Cascades to the creator's membership and any other club data via the
  // existing onDelete: Cascade relations — nothing was ever made public.
  await db.club.delete({ where: { id: clubId } });

  revalidatePath("/teacher/supervising-requests");
  redirect("/teacher/supervising-requests");
}

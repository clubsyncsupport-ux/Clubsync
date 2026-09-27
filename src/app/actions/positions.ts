"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth/session";
import { getDirectorContext } from "@/lib/director";
import { saveUploadedFile } from "@/lib/storage";

export type ActionState = { error: string | null; success?: boolean };

// ---- Director side: define a position and its questions ----

export async function createPositionAction(clubId: string, _prev: ActionState, formData: FormData): Promise<ActionState> {
  const { user } = await getDirectorContext(clubId);

  const title = String(formData.get("title") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim() || null;
  const allowFileUpload = formData.get("allowFileUpload") === "on";
  const prompts = formData.getAll("questionPrompt").map(String);
  const wordLimits = formData.getAll("questionWordLimit").map((v) => Number(v));
  if (!title) return { error: "Give the position a title." };

  const existing = await db.clubPosition.findUnique({ where: { clubId_title: { clubId, title } } });
  if (existing) return { error: "A position with that title already exists." };

  const questions = prompts
    .map((prompt, i) => ({ prompt: prompt.trim(), wordLimit: Number.isFinite(wordLimits[i]) && wordLimits[i] > 0 ? wordLimits[i] : 200, order: i }))
    .filter((q) => q.prompt);
  if (questions.length === 0) return { error: "Add at least one application question." };

  await db.clubPosition.create({
    data: { clubId, title, description, allowFileUpload, createdById: user.id, questions: { create: questions } },
  });

  revalidatePath(`/director/${clubId}/positions`);
  return { error: null, success: true };
}

export async function closePositionAction(positionId: string) {
  const position = await db.clubPosition.findUniqueOrThrow({ where: { id: positionId } });
  await getDirectorContext(position.clubId);
  await db.clubPosition.update({ where: { id: positionId }, data: { status: "CLOSED" } });
  revalidatePath(`/director/${position.clubId}/positions`);
}

export async function reopenPositionAction(positionId: string) {
  const position = await db.clubPosition.findUniqueOrThrow({ where: { id: positionId } });
  await getDirectorContext(position.clubId);
  await db.clubPosition.update({ where: { id: positionId }, data: { status: "OPEN" } });
  revalidatePath(`/director/${position.clubId}/positions`);
}

export async function deletePositionAction(positionId: string) {
  const position = await db.clubPosition.findUniqueOrThrow({ where: { id: positionId } });
  await getDirectorContext(position.clubId);
  await db.clubPosition.delete({ where: { id: positionId } });
  revalidatePath(`/director/${position.clubId}/positions`);
}

export async function reviewApplicationAction(applicationId: string, status: "ACCEPTED" | "REJECTED") {
  const application = await db.positionApplication.findUniqueOrThrow({ where: { id: applicationId }, include: { position: true } });
  await getDirectorContext(application.position.clubId);

  await db.positionApplication.update({ where: { id: applicationId }, data: { status, reviewedAt: new Date() } });
  await db.notification.create({
    data: {
      userId: application.userId,
      type: "POSITION_APPLICATION",
      title: status === "ACCEPTED" ? "Application accepted" : "Application update",
      body: `Your application for "${application.position.title}" was ${status === "ACCEPTED" ? "accepted" : "not accepted this time"}.`,
      linkUrl: `/positions/${application.positionId}`,
    },
  });

  revalidatePath(`/director/${application.position.clubId}/positions`);
  revalidatePath(`/director/${application.position.clubId}/positions/${application.positionId}`);
}

// ---- Student side: apply ----

export async function submitApplicationAction(positionId: string, formData: FormData): Promise<ActionState> {
  const authUser = await requireUser();
  const pos = await db.clubPosition.findUniqueOrThrow({ where: { id: positionId }, include: { questions: true, club: true } });

  if (pos.status !== "OPEN") return { error: "This position is no longer accepting applications." };

  const membership = await db.clubMembership.findUnique({ where: { userId_clubId: { userId: authUser.id, clubId: pos.clubId } } });
  if (!membership || membership.status !== "ACTIVE") return { error: "You need to be a member of this club to apply." };

  const existing = await db.positionApplication.findUnique({ where: { positionId_userId: { positionId, userId: authUser.id } } });
  if (existing) return { error: "You've already applied for this position." };

  const answers: { questionId: string; body: string }[] = [];
  for (const q of pos.questions) {
    const body = String(formData.get(`answer-${q.id}`) ?? "").trim();
    if (!body) return { error: "Answer every question before submitting." };
    const wordCount = body.split(/\s+/).filter(Boolean).length;
    if (wordCount > q.wordLimit) return { error: `Your answer to "${q.prompt}" is over the ${q.wordLimit}-word limit (${wordCount} words).` };
    answers.push({ questionId: q.id, body });
  }

  let fileUrl: string | undefined;
  const file = formData.get("file");
  if (pos.allowFileUpload && file instanceof File && file.size > 0) {
    try {
      fileUrl = (await saveUploadedFile(file, "position-applications")).url;
    } catch (e) {
      return { error: e instanceof Error ? e.message : "File upload failed." };
    }
  }

  await db.positionApplication.create({
    data: { positionId, userId: authUser.id, fileUrl, answers: { create: answers } },
  });

  await db.notification.create({
    data: {
      userId: pos.createdById,
      type: "POSITION_APPLICATION",
      title: "New application received",
      body: `Someone applied for "${pos.title}" in ${pos.club.name}.`,
      linkUrl: `/director/${pos.clubId}/positions/${positionId}`,
    },
  });

  revalidatePath(`/clubs/${pos.club.slug}`);
  return { error: null, success: true };
}

"use server";

import { revalidatePath } from "next/cache";
import { addDays, addWeeks, addMonths } from "date-fns";
import { requireUser } from "@/lib/auth/session";
import { db } from "@/lib/db";
import type { PersonalEvent } from "@prisma/client";

export type ActionState = { error: string | null; success?: boolean };

function combineDateTime(date: string, time: string): Date {
  return new Date(`${date}T${time}`);
}

export async function createPersonalEventAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const user = await requireUser();

  const title = String(formData.get("title") ?? "").trim();
  const date = String(formData.get("date") ?? "");
  const startTime = String(formData.get("startTime") ?? "09:00");
  const endTime = String(formData.get("endTime") ?? "10:00");
  const location = String(formData.get("location") ?? "").trim() || null;
  const description = String(formData.get("description") ?? "").trim() || null;
  const categoryId = String(formData.get("categoryId") ?? "").trim() || null;
  const recurrence = String(formData.get("recurrence") ?? "NONE") as "NONE" | "DAILY" | "WEEKLY" | "MONTHLY";
  const recurrenceUntilRaw = String(formData.get("recurrenceUntil") ?? "").trim();

  if (!title || !date) return { error: "Title and date are required." };

  const startAt = combineDateTime(date, startTime);
  const endAt = combineDateTime(date, endTime);
  if (isNaN(startAt.getTime()) || isNaN(endAt.getTime())) return { error: "Invalid date or time." };
  if (recurrence !== "NONE" && !recurrenceUntilRaw) return { error: "Pick an end date for the repeat." };

  const occurrences: Date[] = [startAt];
  if (recurrence !== "NONE" && recurrenceUntilRaw) {
    const until = new Date(`${recurrenceUntilRaw}T23:59:59`);
    const step = recurrence === "DAILY" ? addDays : recurrence === "WEEKLY" ? addWeeks : addMonths;
    let cursor = startAt;
    while (occurrences.length < 52) {
      cursor = step(cursor, 1);
      if (cursor > until) break;
      occurrences.push(cursor);
    }
  }
  const duration = endAt.getTime() - startAt.getTime();
  const recurrenceUntil = recurrenceUntilRaw ? new Date(recurrenceUntilRaw) : null;

  let parentId: string | null = null;
  for (const occStart of occurrences) {
    const occEnd = new Date(occStart.getTime() + duration);
    const created: PersonalEvent = await db.personalEvent.create({
      data: {
        userId: user.id,
        title,
        startAt: occStart,
        endAt: occEnd,
        location,
        description,
        categoryId,
        recurrence,
        recurrenceParentId: parentId,
        recurrenceUntil,
      },
    });
    if (!parentId) parentId = created.id;
  }

  revalidatePath("/calendar");
  return { error: null, success: true };
}

export async function deletePersonalEventAction(id: string) {
  const user = await requireUser();
  await db.personalEvent.deleteMany({ where: { id, userId: user.id } });
  revalidatePath("/calendar");
}

export async function createPersonalCategoryAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const user = await requireUser();

  const name = String(formData.get("name") ?? "").trim();
  const color = String(formData.get("color") ?? "").trim();

  if (!name) return { error: "Give this category a name." };
  if (!color) return { error: "Pick a color." };

  const taken = await db.personalEventCategory.findUnique({ where: { userId_color: { userId: user.id, color } } });
  if (taken) return { error: "You're already using that color for another category." };

  await db.personalEventCategory.create({ data: { userId: user.id, name, color } });

  revalidatePath("/calendar");
  return { error: null, success: true };
}

export async function deletePersonalCategoryAction(id: string) {
  const user = await requireUser();
  await db.personalEventCategory.deleteMany({ where: { id, userId: user.id } });
  revalidatePath("/calendar");
}

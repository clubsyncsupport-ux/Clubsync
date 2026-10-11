"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { schoolWallClockToInstant, addToSchoolDate } from "@/lib/school-time";
import type { PersonalEvent } from "@prisma/client";

export type ActionState = { error: string | null; success?: boolean };

function combineDateTime(date: string, time: string): Date {
  return schoolWallClockToInstant(date, time);
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

  // Repeats are computed from the school's calendar date + clock time, not by
  // adding 24h*N, so a weekly 9:00 AM event stays 9:00 AM after the November
  // clock change.
  const occurrences: { start: Date; end: Date }[] = [{ start: startAt, end: endAt }];
  if (recurrence !== "NONE" && recurrenceUntilRaw) {
    const until = schoolWallClockToInstant(recurrenceUntilRaw, "23:59:59");
    const unit = recurrence === "DAILY" ? "day" : recurrence === "WEEKLY" ? "week" : "month";
    for (let i = 1; occurrences.length < 52; i++) {
      const ymd = addToSchoolDate(date, unit, i);
      const start = schoolWallClockToInstant(ymd, startTime);
      if (start > until) break;
      occurrences.push({ start, end: schoolWallClockToInstant(ymd, endTime) });
    }
  }
  const recurrenceUntil = recurrenceUntilRaw ? schoolWallClockToInstant(recurrenceUntilRaw, "12:00") : null;

  // The first occurrence has to exist before the rest can reference it as
  // recurrenceParentId, but everything after that shares the exact same
  // parentId — so only the first insert needs its own round trip; the
  // remaining (up to 51) occurrences batch into one createMany.
  const [first, ...rest] = occurrences;
  const created: PersonalEvent = await db.personalEvent.create({
    data: {
      userId: user.id,
      title,
      startAt: first.start,
      endAt: first.end,
      location,
      description,
      categoryId,
      recurrence,
      recurrenceParentId: null,
      recurrenceUntil,
    },
  });
  if (rest.length > 0) {
    await db.personalEvent.createMany({
      data: rest.map((occ) => ({
        userId: user.id,
        title,
        startAt: occ.start,
        endAt: occ.end,
        location,
        description,
        categoryId,
        recurrence,
        recurrenceParentId: created.id,
        recurrenceUntil,
      })),
    });
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

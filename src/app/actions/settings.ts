"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { authProvider } from "@/lib/auth";
import { saveUploadedFile } from "@/lib/storage";

export type SettingsState = { error: string | null; success?: boolean };

export async function updateProfileAction(_prev: SettingsState, formData: FormData): Promise<SettingsState> {
  const user = await requireUser();
  const firstName = String(formData.get("firstName") ?? "").trim();
  const lastName = String(formData.get("lastName") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const bio = String(formData.get("bio") ?? "").trim();

  if (!firstName || !lastName) return { error: "First and last name are required." };
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { error: "Enter a valid email address." };

  const existing = await db.user.findFirst({ where: { email, NOT: { id: user.id } } });
  if (existing) return { error: "That email is already in use." };

  let avatarUrl: string | undefined;
  const avatarFile = formData.get("avatar");
  if (avatarFile instanceof File && avatarFile.size > 0) {
    try {
      const saved = await saveUploadedFile(avatarFile, "avatars");
      avatarUrl = saved.url;
    } catch (e) {
      return { error: e instanceof Error ? e.message : "Failed to upload image." };
    }
  }

  await db.user.update({
    where: { id: user.id },
    data: { firstName, lastName, email, bio: bio || null, ...(avatarUrl ? { avatarUrl } : {}) },
  });

  revalidatePath("/settings");
  revalidatePath("/home");
  return { error: null, success: true };
}

export async function updateThemeAction(theme: "light" | "dark" | "system") {
  const user = await requireUser();
  await db.user.update({ where: { id: user.id }, data: { theme } });
}

export async function updateCalendarPrefsAction(_prev: SettingsState, formData: FormData): Promise<SettingsState> {
  const user = await requireUser();
  const reminderOffsets = formData.getAll("reminderOffsets").map(String).join(",") || "1440";
  await db.user.update({
    where: { id: user.id },
    data: {
      calendarView: String(formData.get("calendarView") ?? "month"),
      weekStartsOn: String(formData.get("weekStartsOn") ?? "sunday"),
      timeFormat: String(formData.get("timeFormat") ?? "12h"),
      reminderOffsets,
    },
  });
  revalidatePath("/settings");
  return { error: null, success: true };
}

export async function updateServiceHourGoalAction(_prev: SettingsState, formData: FormData): Promise<SettingsState> {
  const user = await requireUser();
  const goal = Number(formData.get("serviceHourGoal") ?? 50);
  if (!Number.isFinite(goal) || goal <= 0) return { error: "Enter a valid goal." };
  await db.user.update({ where: { id: user.id }, data: { serviceHourGoal: goal } });
  revalidatePath("/settings");
  revalidatePath("/service-hours");
  return { error: null, success: true };
}

export async function changePasswordAction(_prev: SettingsState, formData: FormData): Promise<SettingsState> {
  const user = await requireUser();
  const currentPassword = String(formData.get("currentPassword") ?? "");
  const newPassword = String(formData.get("newPassword") ?? "");
  const confirmPassword = String(formData.get("confirmPassword") ?? "");

  if (newPassword !== confirmPassword) return { error: "New passwords don't match." };

  const result = await authProvider.changePassword(user.id, currentPassword, newPassword);
  if (!result.ok) return { error: result.error };
  return { error: null, success: true };
}

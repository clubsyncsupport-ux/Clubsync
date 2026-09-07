"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireUser, getSessionToken, clearSessionCookie } from "@/lib/auth/session";
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

  let avatarUrl: string | null | undefined;
  const avatarFile = formData.get("avatar");
  if (avatarFile instanceof File && avatarFile.size > 0) {
    try {
      const saved = await saveUploadedFile(avatarFile, "avatars");
      avatarUrl = saved.url;
    } catch (e) {
      return { error: e instanceof Error ? e.message : "Failed to upload image." };
    }
  } else if (formData.get("removeAvatar") === "true") {
    avatarUrl = null;
  }

  await db.user.update({
    where: { id: user.id },
    data: { firstName, lastName, email, bio: bio || null, ...(avatarUrl !== undefined ? { avatarUrl } : {}) },
  });

  revalidatePath("/settings");
  revalidatePath("/home");
  return { error: null, success: true };
}

export async function updateThemeAction(theme: "light" | "dark" | "system") {
  const user = await requireUser();
  await db.user.update({ where: { id: user.id }, data: { theme } });
}

export async function disconnectGoogleCalendarAction() {
  const user = await requireUser();
  await db.user.update({
    where: { id: user.id },
    data: { googleCalendarRefreshToken: null, googleCalendarConnectedAt: null },
  });
  revalidatePath("/settings");
  revalidatePath("/calendar");
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

export async function deleteMyAccountAction(_prev: SettingsState, formData: FormData): Promise<SettingsState> {
  const user = await requireUser();
  const password = String(formData.get("password") ?? "");

  const me = await db.user.findUniqueOrThrow({ where: { id: user.id } });
  const verified = await authProvider.signIn({ email: me.email, password });
  if (!verified.ok) return { error: "Incorrect password." };

  // Club.createdById has no cascade — deleting a user who still owns a club
  // would fail with a database constraint error. Catch it up front with a
  // clear, actionable message instead of a raw crash.
  const ownedClubs = await db.club.findMany({ where: { createdById: user.id }, select: { name: true } });
  if (ownedClubs.length > 0) {
    return {
      error: `You still run ${ownedClubs.map((c) => c.name).join(", ")}. Delete or transfer ownership of ${
        ownedClubs.length === 1 ? "it" : "them"
      } first, from that club's Settings page.`,
    };
  }

  const hasVerifiedHours = (await db.serviceHourRecord.count({ where: { userId: user.id, status: "VERIFIED" } })) > 0;

  try {
    if (!hasVerifiedHours) {
      // The common case: nothing the school would need to keep, so a full,
      // ordinary delete — everything tied to this account is gone.
      await db.user.delete({ where: { id: user.id } });
    } else {
      // A school may need this person's verified service-hour record even
      // after they delete their account (see Privacy Policy §8) — but "we
      // kept the record" shouldn't mean "we kept the account." This closes
      // every way back in (password, Google link, sessions, email) and
      // removes everything else that isn't an official record, while
      // leaving the verified hours — and the name that makes them
      // meaningful to the school — attached to a account that can never be
      // signed into again. Mirrors the existing MERGED accountStatus
      // pattern: a User row can already outlive someone's ability to use it.
      await db.$transaction([
        db.session.deleteMany({ where: { userId: user.id } }),
        db.clubMembership.deleteMany({ where: { userId: user.id } }),
        db.memberGroupMembership.deleteMany({ where: { userId: user.id } }),
        db.eventRegistration.deleteMany({ where: { userId: user.id } }),
        db.eventInvite.deleteMany({ where: { userId: user.id } }),
        db.notification.deleteMany({ where: { userId: user.id } }),
        db.personalEvent.deleteMany({ where: { userId: user.id } }),
        db.personalEventCategory.deleteMany({ where: { userId: user.id } }),
        db.userAchievement.deleteMany({ where: { userId: user.id } }),
        // Only VERIFIED records are the school's business — self-reported/
        // pending/rejected ones carry no such retention reason and go with
        // everything else.
        db.serviceHourRecord.deleteMany({ where: { userId: user.id, status: { not: "VERIFIED" } } }),
        db.user.update({
          where: { id: user.id },
          data: {
            email: `deleted-${user.id}@clubsync.local`,
            passwordHash: null,
            googleId: null,
            googleCalendarRefreshToken: null,
            googleCalendarConnectedAt: null,
            avatarUrl: null,
            bio: null,
            grade: null,
            schoolId: null,
            accountStatus: "DELETED",
          },
        }),
      ]);
    }
  } catch {
    return { error: "Something prevented deleting your account. Please contact support." };
  }

  const token = await getSessionToken();
  if (token) await authProvider.signOut(token).catch(() => {});
  await clearSessionCookie();
  redirect("/welcome");
}

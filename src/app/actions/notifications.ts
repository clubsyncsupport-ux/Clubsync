"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth/session";
import { db } from "@/lib/db";

// The unread count badge is rendered by (app)/layout.tsx, a layout shared by
// every page — revalidating just "/notifications" left it stale on other
// pages, since Next's router cache doesn't know the shared layout's data
// changed. Revalidating "/", "layout" busts that cache everywhere so the
// badge is correct the moment you navigate away, not just on this page.
export async function markNotificationReadAction(id: string) {
  const user = await requireUser();
  await db.notification.updateMany({ where: { id, userId: user.id }, data: { read: true } });
  revalidatePath("/", "layout");
}

// Marks a notification read and takes the viewer to wherever it points —
// used when the user clicks the notification itself, so the unread count
// drops immediately without a separate "mark as read" click.
export async function openNotificationAction(id: string, linkUrl: string | null) {
  const user = await requireUser();
  await db.notification.updateMany({ where: { id, userId: user.id }, data: { read: true } });
  revalidatePath("/", "layout");
  redirect(linkUrl || "/notifications");
}

// Called by a client component on mount as soon as the notifications page is
// viewed, so simply opening the page clears the badge (no per-item click
// needed) — see MarkAllReadOnView in notifications/page.tsx.
export async function markAllNotificationsReadAction() {
  const user = await requireUser();
  await db.notification.updateMany({ where: { userId: user.id, read: false }, data: { read: true } });
  revalidatePath("/", "layout");
}

export async function deleteNotificationAction(id: string) {
  const user = await requireUser();
  await db.notification.deleteMany({ where: { id, userId: user.id } });
  revalidatePath("/", "layout");
}

import "server-only";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth/session";
import { db } from "@/lib/db";

// Platform Administrator accounts are never created through public signup —
// only an existing admin (or the seed script) can grant the role. The
// /admin layout calls this first, so every /admin/* page is protected by
// the time its own body runs.
export async function requireAdmin() {
  const authUser = await requireUser();
  const user = await db.user.findUniqueOrThrow({ where: { id: authUser.id } });
  if (user.platformRole !== "PLATFORM_ADMIN") redirect("/access-denied");
  return user;
}

export async function logAudit(actorUserId: string, action: string, targetType: string, targetId: string, previousValue?: unknown, newValue?: unknown, reason?: string) {
  await db.auditLog.create({
    data: {
      actorUserId,
      action,
      targetType,
      targetId,
      previousValue: previousValue !== undefined ? JSON.stringify(previousValue) : null,
      newValue: newValue !== undefined ? JSON.stringify(newValue) : null,
      reason,
    },
  });
}

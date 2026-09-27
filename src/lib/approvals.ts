import "server-only";
import { db } from "@/lib/db";

export type ApprovalStatus = "PENDING_SPONSOR" | "PENDING_ADMIN" | "APPROVED" | "REJECTED";

// Decides where a new event proposal or club registration starts in the
// 2-stage Sponsor Teacher -> Administrator chain. It's the SUBMITTER's own
// club membership that matters here (not admin-elevated isDirector) — a
// School Admin filling out a form on a club's behalf is not that club's
// Sponsor Teacher, so their submission still needs the real Director's
// sign-off.
export async function initialApprovalStatus(clubId: string, submitterId: string): Promise<{ status: ApprovalStatus; autoSponsor: boolean }> {
  const membership = await db.clubMembership.findUnique({ where: { userId_clubId: { userId: submitterId, clubId } } });
  const isActualDirector = membership?.role === "DIRECTOR";
  return isActualDirector ? { status: "PENDING_ADMIN", autoSponsor: true } : { status: "PENDING_SPONSOR", autoSponsor: false };
}

// Fans out a notification to every Principal/Vice Principal at a school —
// mirrors createAnnouncementAction's findMany-then-createMany pattern. There
// is no precedent elsewhere in this codebase for notifying "everyone with
// role X at school Y" (every existing notification targets one explicit
// userId), so this is genuinely new infrastructure, not a reuse.
export async function notifySchoolAdmins(schoolId: string, data: { type: string; title: string; body: string; linkUrl: string }) {
  const admins = await db.user.findMany({
    where: { schoolAdminOfId: schoolId, platformRole: { in: ["PRINCIPAL", "VICE_PRINCIPAL"] } },
    select: { id: true },
  });
  if (admins.length === 0) return;
  await db.notification.createMany({ data: admins.map((a) => ({ userId: a.id, ...data })) });
}

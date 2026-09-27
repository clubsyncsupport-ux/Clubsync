import type { Metadata } from "next";
import { getSchoolAdminContext } from "@/lib/school-admin";
import { db } from "@/lib/db";
import { canActionApprovals } from "@/lib/constants";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { ApprovalRow } from "./approval-row";

export const metadata: Metadata = { title: "Approvals" };

export default async function ApprovalsPage({ params }: { params: Promise<{ schoolId: string }> }) {
  const { schoolId } = await params;
  const { isPlatformAdmin, platformRole } = await getSchoolAdminContext(schoolId);
  const canAct = isPlatformAdmin || canActionApprovals(platformRole);

  const [pendingEvents, pendingRegistrations] = await Promise.all([
    db.event.findMany({
      where: { club: { schoolId }, approvalStatus: { in: ["PENDING_SPONSOR", "PENDING_ADMIN"] } },
      include: { club: true },
      orderBy: { createdAt: "asc" },
    }),
    db.clubRegistration.findMany({
      where: { club: { schoolId }, status: { in: ["PENDING_SPONSOR", "PENDING_ADMIN"] } },
      include: { club: true },
      orderBy: { createdAt: "asc" },
    }),
  ]);

  const rows = [
    ...pendingEvents.map((e) => ({
      kind: "event" as const,
      id: e.id,
      title: e.title,
      clubName: e.club.name,
      status: e.approvalStatus as "PENDING_SPONSOR" | "PENDING_ADMIN",
      subtitle: e.category,
      href: `/director/${e.clubId}/events/${e.id}`,
    })),
    ...pendingRegistrations.map((r) => ({
      kind: "clubRegistration" as const,
      id: r.id,
      title: `${r.club.name} — ${r.schoolYear} registration`,
      clubName: r.club.name,
      status: r.status as "PENDING_SPONSOR" | "PENDING_ADMIN",
      subtitle: r.schoolYear,
      href: `/director/${r.clubId}/registration`,
    })),
  ];

  return (
    <div className="mx-auto max-w-3xl px-6 py-8">
      <h1 className="text-2xl font-bold tracking-tight text-text-primary">Approvals</h1>
      <p className="mt-1 text-sm text-text-secondary">
        {canAct
          ? "Event proposals and club registrations awaiting sponsor or administrator sign-off."
          : "Event proposals and club registrations at this school — only a Principal or Vice Principal can approve or reject here."}
      </p>

      {rows.length === 0 ? (
        <Card className="mt-5">
          <EmptyState icon="✅" title="Nothing pending" description="New event proposals and club registrations will show up here." />
        </Card>
      ) : (
        <Card className="mt-5">
          <CardContent className="divide-y divide-border p-0">
            {rows.map((r) => (
              <ApprovalRow key={`${r.kind}-${r.id}`} row={r} canAct={canAct} />
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

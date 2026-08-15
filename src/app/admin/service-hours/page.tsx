import type { Metadata } from "next";
import { requireAdmin } from "@/lib/admin";
import { db } from "@/lib/db";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { ServiceHourAdminRow } from "./service-hour-admin-row";

export const metadata: Metadata = { title: "Service Hours" };

export default async function AdminServiceHoursPage() {
  await requireAdmin();

  const records = await db.serviceHourRecord.findMany({
    include: { user: true, club: true, event: true },
    orderBy: { createdAt: "desc" },
    take: 200,
  });

  return (
    <div className="mx-auto max-w-5xl px-6 py-8">
      <h1 className="text-2xl font-bold tracking-tight text-text-primary">Service Hours</h1>
      <p className="mt-1 text-sm text-text-secondary">{records.length} records across the platform.</p>

      {records.length === 0 ? (
        <Card className="mt-5">
          <EmptyState icon="🕒" title="No service hour records yet" description="Hours logged by students across the platform will show up here." />
        </Card>
      ) : (
        <div className="mt-5 overflow-hidden rounded-2xl border border-border">
          <table className="w-full text-left text-sm">
            <thead className="bg-surface-1 text-xs text-text-muted">
              <tr>
                <th className="px-4 py-2 font-medium">Student</th>
                <th className="px-4 py-2 font-medium">Club</th>
                <th className="px-4 py-2 font-medium">Event</th>
                <th className="px-4 py-2 font-medium">Hours</th>
                <th className="px-4 py-2 font-medium">Status</th>
                <th className="px-4 py-2 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {records.map((r) => (
                <ServiceHourAdminRow
                  key={r.id}
                  record={{
                    id: r.id,
                    hours: r.hours,
                    status: r.status,
                    selfReported: r.selfReported,
                    studentName: `${r.user.firstName} ${r.user.lastName}`,
                    clubName: r.club?.name ?? r.organizationName ?? "Self-reported",
                    eventTitle: r.event?.title ?? r.taskDescription ?? "—",
                  }}
                />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

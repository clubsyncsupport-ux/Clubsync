import { db } from "@/lib/db";
import { Card, CardContent } from "@/components/ui/card";
import { ServiceHoursRow } from "./service-hours-row";
import { AddServiceHoursForm } from "./add-service-hours-form";

export async function ServiceHoursManager({ userId }: { userId: string }) {
  const records = await db.serviceHourRecord.findMany({
    where: { userId },
    include: { club: true, event: true },
    orderBy: { createdAt: "desc" },
  });

  return (
    <Card>
      <CardContent className="p-5">
        <p className="text-sm font-semibold text-text-primary">Service Hour Records</p>
        {records.length === 0 ? (
          <p className="mt-2 text-sm text-text-muted">No service hour records yet.</p>
        ) : (
          <div className="mt-2 divide-y divide-border">
            {records.map((r) => (
              <ServiceHoursRow
                key={r.id}
                record={{
                  id: r.id,
                  hours: r.hours,
                  status: r.status,
                  selfReported: r.selfReported,
                  source: r.event?.title ?? r.club?.name ?? r.organizationName ?? r.taskDescription ?? "Manual entry",
                }}
              />
            ))}
          </div>
        )}
        <div className="mt-4 border-t border-border pt-4">
          <AddServiceHoursForm userId={userId} />
        </div>
      </CardContent>
    </Card>
  );
}

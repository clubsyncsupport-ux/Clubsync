import type { Metadata } from "next";
import { requireAdmin } from "@/lib/admin";
import { db } from "@/lib/db";
import { Badge, ColorDot } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { formatEventDate } from "@/lib/format";

export const metadata: Metadata = { title: "Events" };
import { EventAdminActions } from "./event-admin-actions";

const STATUS_TONE: Record<string, "neutral" | "accent" | "success" | "warning" | "danger"> = {
  SCHEDULED: "accent",
  COMPLETED: "warning",
  FINALIZED: "success",
  CANCELLED: "danger",
};

export default async function AdminEventsPage() {
  await requireAdmin();

  const events = await db.event.findMany({
    include: { club: true },
    orderBy: { startAt: "desc" },
    take: 100,
  });

  return (
    <div className="mx-auto max-w-5xl px-6 py-8">
      <h1 className="text-2xl font-bold tracking-tight text-text-primary">Events</h1>

      {events.length === 0 ? (
        <Card className="mt-5">
          <EmptyState icon="🗓️" title="No events yet" description="Events created by clubs across the platform will show up here." />
        </Card>
      ) : (
        <div className="mt-5 space-y-2">
          {events.map((e) => (
            <div key={e.id} className="flex items-center gap-3 rounded-xl border border-border bg-surface-1 p-3">
              <ColorDot color={e.club.color} />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-text-primary">{e.title}</p>
                <p className="text-xs text-text-muted">
                  {e.club.name} · {formatEventDate(e.startAt)}
                </p>
              </div>
              <Badge tone={STATUS_TONE[e.status]}>{e.status}</Badge>
              <EventAdminActions eventId={e.id} status={e.status} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

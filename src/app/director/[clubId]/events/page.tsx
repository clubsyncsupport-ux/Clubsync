import type { Metadata } from "next";
import Link from "next/link";
import { getDirectorContext } from "@/lib/director";
import { db } from "@/lib/db";
import { Card, CardContent } from "@/components/ui/card";
import { Badge, ColorDot } from "@/components/ui/badge";
import { LinkButton } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { formatEventDate } from "@/lib/format";
import { MarkCompletedButton } from "./mark-completed-button";

const STATUS_TONE: Record<string, "neutral" | "accent" | "success" | "warning"> = {
  SCHEDULED: "accent",
  COMPLETED: "warning",
  FINALIZED: "success",
  CANCELLED: "neutral",
};

export const metadata: Metadata = { title: "Events" };

export default async function DirectorEventsPage({ params }: { params: Promise<{ clubId: string }> }) {
  const { clubId } = await params;
  const { club } = await getDirectorContext(clubId);

  const events = await db.event.findMany({
    where: { clubId, recurrenceParentId: null },
    include: {
      _count: { select: { registrations: { where: { status: { in: ["REGISTERED", "ATTENDED"] } } } } },
      roles: { include: { _count: { select: { registrations: { where: { status: "REGISTERED" } } } } } },
    },
    orderBy: { startAt: "desc" },
    take: 100,
  });

  return (
    <div className="mx-auto max-w-2xl px-4 py-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight text-text-primary">Events</h1>
        <LinkButton href={`/director/${clubId}/events/new`} size="sm">
          ➕ Create
        </LinkButton>
      </div>

      {events.length === 0 ? (
        <Card className="mt-6">
          <EmptyState icon="📅" title="No events yet" description="Create your first event to get members involved." />
        </Card>
      ) : (
        <div className="mt-6 space-y-2">
          {events.map((e) => {
            const isFull = e.maxParticipants != null && e._count.registrations >= e.maxParticipants;
            const rolesFull = e.roles.length > 0 && e.roles.every((r) => r._count.registrations >= r.capacity);
            return (
            <Card key={e.id}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <Link href={`/director/${clubId}/events/${e.id}`} className="min-w-0 flex-1">
                    <p className="font-semibold text-text-primary">{e.title}</p>
                    <p className="text-sm text-text-secondary">{formatEventDate(e.startAt)}</p>
                    <div className="mt-1 flex items-center gap-2 text-xs text-text-muted">
                      <ColorDot color={club.color} />
                      {e._count.registrations}
                      {e.maxParticipants != null ? ` / ${e.maxParticipants}` : ""} registered
                      {e.recurrence !== "NONE" && <span>· Recurring</span>}
                    </div>
                  </Link>
                  <div className="flex shrink-0 flex-col items-end gap-1.5">
                    <Badge tone={STATUS_TONE[e.status]}>{e.status}</Badge>
                    {isFull && <Badge tone="success">Full</Badge>}
                    {rolesFull && <Badge tone="success">Roles Filled</Badge>}
                  </div>
                </div>
                {e.status === "SCHEDULED" && e.startAt < new Date() && (
                  <div className="mt-3">
                    <MarkCompletedButton eventId={e.id} />
                  </div>
                )}
                {e.status === "COMPLETED" && (
                  <Link href={`/director/${clubId}/events/${e.id}`} className="mt-3 inline-block text-sm font-medium text-accent">
                    Finalize & approve service hours →
                  </Link>
                )}
              </CardContent>
            </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

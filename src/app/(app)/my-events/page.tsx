import type { Metadata } from "next";
import { getViewer } from "@/lib/viewer";
import { db } from "@/lib/db";
import { EventCard } from "@/components/event-card";
import { EmptyState } from "@/components/ui/empty-state";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { LinkButton } from "@/components/ui/button";
import Link from "next/link";
import { formatDateShort } from "@/lib/format";
import { BackButton } from "@/components/ui/back-button";

export const metadata: Metadata = { title: "My Events" };

export default async function MyEventsPage() {
  const viewer = await getViewer();
  const registrations = await db.eventRegistration.findMany({
    where: { userId: viewer.id, status: { in: ["REGISTERED", "WAITLISTED", "ATTENDED"] } },
    include: { event: { include: { club: true } } },
    orderBy: { event: { startAt: "desc" } },
  });

  const now = new Date();
  const upcoming = registrations.filter((r) => r.event.startAt >= now && r.status !== "ATTENDED");
  const completed = registrations.filter((r) => r.event.startAt < now || r.status === "ATTENDED");

  return (
    <div className="mx-auto max-w-2xl px-4 py-6 animate-fade-in">
      <BackButton fallbackHref="/home" />
      <h1 className="mt-3 text-2xl font-bold tracking-tight text-text-primary">My Events</h1>

      <div className="mt-6">
        <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-text-muted">Upcoming ({upcoming.length})</h2>
        {upcoming.length === 0 ? (
          <Card>
            <EmptyState icon="🎟" title="No upcoming registrations" description="Browse clubs to find events to join." action={<LinkButton href="/discover" size="sm">Browse Clubs</LinkButton>} />
          </Card>
        ) : (
          <div className="space-y-2">
            {upcoming.map((r) => (
              <div key={r.id} className="relative">
                <EventCard event={r.event} />
                {r.status === "WAITLISTED" && (
                  <Badge tone="warning" className="absolute right-3 top-3">
                    Waitlisted
                  </Badge>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="mt-8">
        <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-text-muted">Completed ({completed.length})</h2>
        {completed.length === 0 ? (
          <Card>
            <EmptyState icon="📜" title="No past events yet" />
          </Card>
        ) : (
          <div className="space-y-2">
            {completed.map((r) => (
              <Link
                key={r.id}
                href={`/events/${r.event.id}`}
                className="flex items-center gap-3 rounded-2xl border border-border bg-surface-1 p-4 opacity-80 transition-opacity hover:opacity-100"
              >
                <div className="h-11 w-1.5 shrink-0 rounded-full" style={{ backgroundColor: r.event.club.color }} />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold text-text-primary">{r.event.title}</p>
                  <p className="text-sm text-text-secondary">
                    {r.event.club.name} · {formatDateShort(r.event.startAt)}
                  </p>
                </div>
                {r.event.awardsServiceHours && <Badge tone="success">⏱ {r.event.defaultServiceHours} hrs</Badge>}
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

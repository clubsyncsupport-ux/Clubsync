import type { Metadata } from "next";
import Link from "next/link";
import { getViewer, requireStudentViewer } from "@/lib/viewer";
import { db } from "@/lib/db";
import { greeting } from "@/lib/format";
import { Card, CardContent } from "@/components/ui/card";
import { LinkButton } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { EventCard } from "@/components/event-card";
import { CountdownTimer } from "@/components/countdown-timer";
import { ProgressRing } from "@/components/ui/progress-ring";
import { Compass, Calendar as CalendarIcon, Clock, Ticket, Users, type LucideIcon } from "lucide-react";

export const metadata: Metadata = { title: "Home" };

export default async function HomePage() {
  const viewer = requireStudentViewer(await getViewer());
  const now = new Date();
  const todayEnd = new Date();
  todayEnd.setHours(23, 59, 59, 999);

  const clubIds = viewer.memberships.map((m) => m.clubId);

  const [upcomingEvents, todayCount, registeredCount, hoursAgg, clubCount] = await Promise.all([
    db.event.findMany({
      where: {
        status: "SCHEDULED",
        startAt: { gte: now },
        club: { id: { in: clubIds } },
        OR: [{ visibility: "PUBLIC" }, { visibility: "PRIVATE", invites: { some: { userId: viewer.id } } }],
      },
      include: { club: true },
      orderBy: { startAt: "asc" },
      take: 5,
    }),
    db.event.count({
      where: {
        status: "SCHEDULED",
        startAt: { gte: now, lte: todayEnd },
        club: { id: { in: clubIds } },
      },
    }),
    db.eventRegistration.count({ where: { userId: viewer.id, status: { in: ["REGISTERED", "ATTENDED"] } } }),
    db.serviceHourRecord.aggregate({ where: { userId: viewer.id, status: "VERIFIED" }, _sum: { hours: true } }),
    clubIds.length,
  ]);

  const totalHours = hoursAgg._sum.hours ?? 0;
  const nextEvent = upcomingEvents[0];

  return (
    <div className="mx-auto max-w-2xl px-4 py-6 space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-text-primary">
          {greeting()}, {viewer.firstName} 👋
        </h1>
        <p className="mt-1 text-[15px] text-text-secondary">
          {todayCount > 0 ? `You have ${todayCount} event${todayCount === 1 ? "" : "s"} today.` : "Nothing on your calendar today — enjoy the break."}
        </p>
      </div>

      <Card>
        <CardContent className="flex flex-col items-center p-6">
          <ProgressRing value={Math.round(totalHours * 10) / 10} goal={viewer.serviceHourGoal} />
          <div className="mt-4 grid w-full grid-cols-3 gap-2 text-center">
            <div>
              <p className="text-lg font-bold text-text-primary">{viewer.serviceHourGoal}</p>
              <p className="text-xs text-text-muted">Goal</p>
            </div>
            <div>
              <p className="text-lg font-bold text-text-primary">{Math.round(totalHours * 10) / 10}</p>
              <p className="text-xs text-text-muted">Completed</p>
            </div>
            <div>
              <p className="text-lg font-bold text-text-primary">{Math.max(Math.round((viewer.serviceHourGoal - totalHours) * 10) / 10, 0)}</p>
              <p className="text-xs text-text-muted">Remaining</p>
            </div>
          </div>
          <LinkButton href="/settings#service-hours" size="sm" className="mt-4">
            Change Goal
          </LinkButton>
        </CardContent>
      </Card>

      {nextEvent && (
        <Card className="bg-gradient-to-br from-accent to-accent-hover border-none text-on-accent">
          <CardContent className="flex items-start justify-between gap-3 p-5">
            <div className="min-w-0">
              <p className="text-xs font-medium uppercase tracking-wide opacity-80">Next Event</p>
              <p className="mt-1 truncate text-lg font-bold">{nextEvent.title}</p>
              <p className="mt-0.5 text-sm opacity-90">{nextEvent.club.name}</p>
              <Link href={`/events/${nextEvent.id}`} className="mt-3 inline-block rounded-lg bg-white/20 px-3 py-1.5 text-sm font-medium backdrop-blur-sm hover:bg-white/30">
                View details →
              </Link>
            </div>
            <CountdownTimer targetDate={nextEvent.startAt.toISOString()} className="shrink-0 text-right" />
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-3 gap-3">
        <StatTile label="Joined Clubs" value={clubCount} href="/my-clubs" />
        <StatTile label="Upcoming Events" value={upcomingEvents.length} />
        <StatTile label="Registered Events" value={registeredCount} />
      </div>

      <div>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-text-primary">Upcoming Events</h2>
          <Link href="/calendar" className="text-sm font-medium text-accent">
            View calendar
          </Link>
        </div>
        {upcomingEvents.length === 0 ? (
          <Card>
            <EmptyState
              icon="📅"
              title="You're all caught up!"
              description="Browse clubs to find upcoming opportunities."
              action={<LinkButton href="/discover" size="sm">Browse Clubs</LinkButton>}
            />
          </Card>
        ) : (
          <div className="space-y-2">
            {upcomingEvents.map((e) => (
              <EventCard key={e.id} event={e} />
            ))}
          </div>
        )}
      </div>

      <div>
        <h2 className="mb-3 text-lg font-semibold text-text-primary">Quick Actions</h2>
        <div className="grid grid-cols-2 gap-3">
          <QuickAction href="/my-clubs" icon={Users} label="My Clubs" />
          <QuickAction href="/discover" icon={Compass} label="Browse Clubs" />
          <QuickAction href="/calendar" icon={CalendarIcon} label="View Calendar" />
          <QuickAction href="/service-hours" icon={Clock} label="Service Hours" />
          <QuickAction href="/my-events" icon={Ticket} label="My Events" />
        </div>
      </div>
    </div>
  );
}

function StatTile({ label, value, href }: { label: string; value: number; href?: string }) {
  const content = (
    <>
      <p className="text-2xl font-bold tabular-nums text-text-primary">{value}</p>
      <p className="mt-0.5 text-xs text-text-secondary">{label}</p>
    </>
  );
  if (href) {
    return (
      <Link href={href} className="block">
        <Card className="p-4 transition-colors hover:border-border-strong">{content}</Card>
      </Link>
    );
  }
  return <Card className="p-4">{content}</Card>;
}

function QuickAction({ href, icon: Icon, label }: { href: string; icon: LucideIcon; label: string }) {
  return (
    <Link
      href={href}
      className="flex items-center gap-3 rounded-2xl border border-border bg-surface-1 p-4 font-medium text-text-primary transition-all hover:border-border-strong hover:shadow-[var(--shadow-sm)] active:scale-[0.98]"
    >
      <Icon className="h-5 w-5 text-accent" strokeWidth={2} />
      {label}
    </Link>
  );
}

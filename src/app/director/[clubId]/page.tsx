import type { Metadata } from "next";
import Link from "next/link";
import { getDirectorContext } from "@/lib/director";
import { db } from "@/lib/db";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { formatEventDate, timeAgo } from "@/lib/format";
import { greeting } from "@/lib/format";
import { Plus, Megaphone, Users, Shield, CalendarDays, BarChart3, type LucideIcon } from "lucide-react";

export async function generateMetadata({ params }: { params: Promise<{ clubId: string }> }): Promise<Metadata> {
  const { clubId } = await params;
  const club = await db.club.findUnique({ where: { id: clubId }, select: { name: true } });
  return { title: club ? `${club.name} Dashboard` : "Director Dashboard" };
}

export default async function DirectorDashboardPage({ params }: { params: Promise<{ clubId: string }> }) {
  const { clubId } = await params;
  const { club, user } = await getDirectorContext(clubId);

  const [memberCount, upcomingEvents, pendingApprovals, pendingServiceHours, recentAnnouncements, nextEvent] = await Promise.all([
    db.clubMembership.count({ where: { clubId, status: "ACTIVE" } }),
    db.event.count({ where: { clubId, status: "SCHEDULED", startAt: { gte: new Date() } } }),
    db.clubMembership.count({ where: { clubId, status: "PENDING" } }),
    db.event.count({ where: { clubId, status: "COMPLETED" } }),
    db.announcement.findMany({ where: { clubId }, orderBy: { createdAt: "desc" }, take: 3 }),
    db.event.findFirst({ where: { clubId, status: "SCHEDULED", startAt: { gte: new Date() } }, orderBy: { startAt: "asc" } }),
  ]);

  return (
    <div className="mx-auto max-w-2xl px-4 py-6 space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-text-primary">
          {greeting()}, {user.firstName} 👋
        </h1>
        <p className="mt-1 text-[15px] text-text-secondary">{club.name}</p>
      </div>

      {nextEvent && (
        <Card className="bg-gradient-to-br from-accent to-accent-hover border-none text-on-accent">
          <CardContent className="p-5">
            <p className="text-xs font-medium uppercase tracking-wide opacity-80">Next Meeting / Event</p>
            <p className="mt-1 text-lg font-bold">{nextEvent.title}</p>
            <p className="mt-0.5 text-sm opacity-90">{formatEventDate(nextEvent.startAt)}</p>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatTile href={`/director/${clubId}/members`} label="Members" value={memberCount} />
        <StatTile href={`/director/${clubId}/events`} label="Upcoming Events" value={upcomingEvents} />
        <StatTile href={`/director/${clubId}/members`} label="Pending Requests" value={pendingApprovals} highlight={pendingApprovals > 0} />
        <StatTile href={`/director/${clubId}/events?filter=completed`} label="To Finalize" value={pendingServiceHours} highlight={pendingServiceHours > 0} />
      </div>

      <div>
        <h2 className="mb-3 text-lg font-semibold text-text-primary">Quick Actions</h2>
        <div className="grid grid-cols-2 gap-3">
          <QuickAction href={`/director/${clubId}/events/new`} icon={Plus} label="Create Event" />
          <QuickAction href={`/director/${clubId}/announcements`} icon={Megaphone} label="New Announcement" />
          <QuickAction href={`/director/${clubId}/members`} icon={Users} label="Members" />
          <QuickAction href={`/director/${clubId}/members#admins`} icon={Shield} label="Admins" />
          <QuickAction href={`/director/${clubId}/calendar`} icon={CalendarDays} label="All Clubs Calendar" />
          <QuickAction href={`/director/${clubId}/analytics`} icon={BarChart3} label="Analytics" />
        </div>
      </div>

      <div>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-text-primary">Recent Announcements</h2>
          <Link href={`/director/${clubId}/announcements`} className="text-sm font-medium text-accent">
            View all
          </Link>
        </div>
        {recentAnnouncements.length === 0 ? (
          <Card>
            <EmptyState icon="📢" title="No announcements yet" />
          </Card>
        ) : (
          <div className="space-y-2">
            {recentAnnouncements.map((a) => (
              <Card key={a.id}>
                <CardContent className="p-4">
                  <p className="font-semibold text-text-primary">{a.title}</p>
                  <p className="mt-1 line-clamp-2 text-sm text-text-secondary">{a.body}</p>
                  <p className="mt-2 text-xs text-text-muted">{timeAgo(a.createdAt)}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function StatTile({ href, label, value, highlight }: { href: string; label: string; value: number; highlight?: boolean }) {
  return (
    <Link href={href}>
      <Card className={`p-4 ${highlight ? "border-warning/40 bg-warning-soft" : ""}`}>
        <p className={`text-2xl font-bold tabular-nums ${highlight ? "text-warning" : "text-text-primary"}`}>{value}</p>
        <p className="mt-0.5 text-xs text-text-secondary">{label}</p>
      </Card>
    </Link>
  );
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

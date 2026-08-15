import type { Metadata } from "next";
import { requireAdmin } from "@/lib/admin";
import { db } from "@/lib/db";
import { Card } from "@/components/ui/card";
import { subDays } from "date-fns";

export const metadata: Metadata = { title: "Platform Dashboard" };

export default async function AdminDashboardPage() {
  await requireAdmin();

  const [totalUsers, newUsers, totalClubs, activeClubs, totalEvents, upcomingEvents, hoursAgg, pendingReports] = await Promise.all([
    db.user.count(),
    db.user.count({ where: { createdAt: { gte: subDays(new Date(), 7) } } }),
    db.club.count(),
    db.club.count({ where: { status: "ACTIVE" } }),
    db.event.count(),
    db.event.count({ where: { status: "SCHEDULED", startAt: { gte: new Date() } } }),
    db.serviceHourRecord.aggregate({ where: { status: "VERIFIED" }, _sum: { hours: true } }),
    db.clubMembership.count({ where: { status: "PENDING" } }),
  ]);

  return (
    <div className="mx-auto max-w-5xl px-6 py-8">
      <h1 className="text-2xl font-bold tracking-tight text-text-primary">Platform Dashboard</h1>
      <p className="mt-1 text-sm text-text-secondary">Overview across every school, club, and student on ClubSync.</p>

      <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
        <Stat label="Total Users" value={totalUsers} />
        <Stat label="New This Week" value={newUsers} />
        <Stat label="Active Clubs" value={activeClubs} sub={`${totalClubs} total`} />
        <Stat label="Upcoming Events" value={upcomingEvents} sub={`${totalEvents} total`} />
        <Stat label="Verified Service Hours" value={hoursAgg._sum.hours ?? 0} />
        <Stat label="Pending Join Requests" value={pendingReports} highlight={pendingReports > 0} />
      </div>

      <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <QuickLink href="/admin/users" icon="👤" label="Manage Users" />
        <QuickLink href="/admin/clubs" icon="👥" label="Manage Clubs" />
        <QuickLink href="/admin/moderation" icon="🛡" label="Moderation & Audit Log" />
      </div>
    </div>
  );
}

function Stat({ label, value, sub, highlight }: { label: string; value: number; sub?: string; highlight?: boolean }) {
  return (
    <Card className={`p-4 ${highlight ? "border-warning/40 bg-warning-soft" : ""}`}>
      <p className={`text-2xl font-bold tabular-nums ${highlight ? "text-warning" : "text-text-primary"}`}>{value}</p>
      <p className="mt-0.5 text-xs text-text-secondary">{label}</p>
      {sub && <p className="text-[11px] text-text-muted">{sub}</p>}
    </Card>
  );
}

function QuickLink({ href, icon, label }: { href: string; icon: string; label: string }) {
  return (
    <a href={href} className="flex items-center gap-3 rounded-2xl border border-border bg-surface-1 p-4 font-medium text-text-primary hover:border-border-strong">
      <span className="text-xl">{icon}</span>
      {label}
    </a>
  );
}

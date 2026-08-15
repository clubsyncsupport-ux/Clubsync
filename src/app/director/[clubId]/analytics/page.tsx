import type { Metadata } from "next";
import { getDirectorContext } from "@/lib/director";
import { db } from "@/lib/db";
import { Card } from "@/components/ui/card";
import { BackButton } from "@/components/ui/back-button";
import { subDays } from "date-fns";

export const metadata: Metadata = { title: "Analytics" };

export default async function DirectorAnalyticsPage({ params }: { params: Promise<{ clubId: string }> }) {
  const { clubId } = await params;
  await getDirectorContext(clubId);

  const [totalMembers, newThisMonth, totalEvents, upcomingEvents, completedEvents, hoursAgg, registrationCount, topContributors] = await Promise.all([
    db.clubMembership.count({ where: { clubId, status: "ACTIVE" } }),
    db.clubMembership.count({ where: { clubId, status: "ACTIVE", joinedAt: { gte: subDays(new Date(), 30) } } }),
    db.event.count({ where: { clubId, recurrenceParentId: null } }),
    db.event.count({ where: { clubId, status: "SCHEDULED" } }),
    db.event.count({ where: { clubId, status: { in: ["COMPLETED", "FINALIZED"] } } }),
    db.serviceHourRecord.aggregate({ where: { clubId, status: "VERIFIED" }, _sum: { hours: true }, _count: true }),
    db.eventRegistration.count({ where: { event: { clubId }, status: { in: ["REGISTERED", "ATTENDED"] } } }),
    db.serviceHourRecord.groupBy({ by: ["userId"], where: { clubId, status: "VERIFIED" }, _sum: { hours: true }, orderBy: { _sum: { hours: "desc" } }, take: 5 }),
  ]);

  const contributors = await db.user.findMany({ where: { id: { in: topContributors.map((c) => c.userId) } } });
  const contributorMap = new Map(contributors.map((c) => [c.id, c]));

  const avgAttendance = totalEvents > 0 ? Math.round((registrationCount / totalEvents) * 10) / 10 : 0;
  const avgHoursPerMember = totalMembers > 0 ? Math.round(((hoursAgg._sum.hours ?? 0) / totalMembers) * 10) / 10 : 0;

  return (
    <div className="mx-auto max-w-2xl px-4 py-6 animate-fade-in">
      <BackButton fallbackHref={`/director/${clubId}`} />
      <h1 className="mt-3 text-2xl font-bold tracking-tight text-text-primary">Analytics</h1>

      <Section title="Membership">
        <Stat label="Total Members" value={totalMembers} />
        <Stat label="New This Month" value={newThisMonth} />
      </Section>

      <Section title="Events">
        <Stat label="Total Events" value={totalEvents} />
        <Stat label="Upcoming" value={upcomingEvents} />
        <Stat label="Completed" value={completedEvents} />
        <Stat label="Avg. Registrations / Event" value={avgAttendance} />
      </Section>

      <Section title="Service Hours">
        <Stat label="Total Hours Awarded" value={hoursAgg._sum.hours ?? 0} />
        <Stat label="Records" value={hoursAgg._count} />
        <Stat label="Avg. Hours / Member" value={avgHoursPerMember} />
      </Section>

      {topContributors.length > 0 && (
        <div className="mt-6">
          <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-text-muted">Top Contributors</h2>
          <Card>
            <div className="divide-y divide-border">
              {topContributors.map((c) => {
                const u = contributorMap.get(c.userId);
                if (!u) return null;
                return (
                  <div key={c.userId} className="flex items-center justify-between px-4 py-2.5 text-sm">
                    <span className="text-text-primary">
                      {u.firstName} {u.lastName}
                    </span>
                    <span className="font-semibold text-text-secondary">{c._sum.hours} hrs</span>
                  </div>
                );
              })}
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mt-6">
      <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-text-muted">{title}</h2>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">{children}</div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <Card className="p-4">
      <p className="text-xl font-bold tabular-nums text-text-primary">{value}</p>
      <p className="mt-0.5 text-xs text-text-secondary">{label}</p>
    </Card>
  );
}

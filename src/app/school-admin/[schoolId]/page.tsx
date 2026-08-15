import type { Metadata } from "next";
import Link from "next/link";
import { getSchoolAdminContext } from "@/lib/school-admin";
import { db } from "@/lib/db";
import { Card } from "@/components/ui/card";

export async function generateMetadata({ params }: { params: Promise<{ schoolId: string }> }): Promise<Metadata> {
  const { schoolId } = await params;
  const school = await db.school.findUnique({ where: { id: schoolId }, select: { name: true } });
  return { title: school ? `${school.name} Dashboard` : "School Admin" };
}

export default async function SchoolAdminDashboardPage({ params }: { params: Promise<{ schoolId: string }> }) {
  const { schoolId } = await params;
  const { school } = await getSchoolAdminContext(schoolId);

  const [studentCount, clubCount, upcomingEvents, pendingApprovals] = await Promise.all([
    db.user.count({ where: { schoolId, platformRole: "STUDENT" } }),
    db.club.count({ where: { schoolId, status: "ACTIVE" } }),
    db.event.count({ where: { club: { schoolId }, status: "SCHEDULED", startAt: { gte: new Date() } } }),
    db.clubMembership.count({ where: { club: { schoolId }, status: "PENDING" } }),
  ]);

  return (
    <div className="mx-auto max-w-5xl px-6 py-8">
      <h1 className="text-2xl font-bold tracking-tight text-text-primary">{school.name}</h1>
      <p className="mt-1 text-sm text-text-secondary">Everything at your school, in one place.</p>

      <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
        <Stat label="Students" value={studentCount} />
        <Stat label="Active Clubs" value={clubCount} />
        <Stat label="Upcoming Events" value={upcomingEvents} />
        <Stat label="Pending Join Requests" value={pendingApprovals} highlight={pendingApprovals > 0} />
      </div>

      <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2">
        <QuickLink href={`/school-admin/${schoolId}/students`} icon="🧑‍🎓" label="Manage Students" />
        <QuickLink href={`/school-admin/${schoolId}/clubs`} icon="👥" label="Manage Clubs" />
      </div>
    </div>
  );
}

function Stat({ label, value, highlight }: { label: string; value: number; highlight?: boolean }) {
  return (
    <Card className={highlight ? "border-warning/40 bg-warning-soft p-4" : "p-4"}>
      <p className={`text-2xl font-bold tabular-nums ${highlight ? "text-warning" : "text-text-primary"}`}>{value}</p>
      <p className="mt-0.5 text-xs text-text-secondary">{label}</p>
    </Card>
  );
}

function QuickLink({ href, icon, label }: { href: string; icon: string; label: string }) {
  return (
    <Link href={href} className="flex items-center gap-3 rounded-2xl border border-border bg-surface-1 p-4 font-medium text-text-primary hover:border-border-strong">
      <span className="text-xl">{icon}</span>
      {label}
    </Link>
  );
}

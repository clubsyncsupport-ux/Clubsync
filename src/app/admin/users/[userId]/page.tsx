import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/admin";
import { db } from "@/lib/db";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { EditGradeForm } from "@/components/edit-grade-form";
import { schoolGradeLevels } from "@/lib/grades";
import { BackButton } from "@/components/ui/back-button";
import { UserActions } from "./user-actions";
import { MergeUserSection } from "@/components/admin/merge-user-section";
import { ServiceHoursManager } from "@/components/admin/service-hours-manager";

export async function generateMetadata({ params }: { params: Promise<{ userId: string }> }): Promise<Metadata> {
  const { userId } = await params;
  const user = await db.user.findUnique({ where: { id: userId }, select: { firstName: true, lastName: true } });
  return { title: user ? `${user.firstName} ${user.lastName}` : "User" };
}

export default async function AdminUserDetailPage({ params }: { params: Promise<{ userId: string }> }) {
  await requireAdmin();
  const { userId } = await params;

  const user = await db.user.findUnique({
    where: { id: userId },
    include: { school: true, memberships: { include: { club: true } } },
  });
  if (!user) notFound();

  const [hoursAgg, eventCount] = await Promise.all([
    db.serviceHourRecord.aggregate({ where: { userId, status: "VERIFIED" }, _sum: { hours: true } }),
    db.eventRegistration.count({ where: { userId, status: "ATTENDED" } }),
  ]);

  return (
    <div className="mx-auto max-w-3xl px-6 py-8">
      <BackButton fallbackHref="/admin/users" />
      <div className="mt-3 flex items-start gap-4">
        <Avatar firstName={user.firstName} lastName={user.lastName} src={user.avatarUrl} size="xl" />
        <div className="flex-1">
          <h1 className="text-xl font-bold text-text-primary">
            {user.firstName} {user.lastName}
          </h1>
          <p className="text-sm text-text-secondary">{user.email}</p>
          <div className="mt-2 flex gap-2">
            <Badge tone={user.accountStatus === "SUSPENDED" ? "danger" : "success"}>{user.accountStatus}</Badge>
            {user.platformRole === "PLATFORM_ADMIN" && <Badge tone="accent">Platform Admin</Badge>}
          </div>
        </div>
      </div>

      <div className="mt-6 grid grid-cols-3 gap-3">
        <Card className="p-4">
          <p className="text-xl font-bold text-text-primary">{user.memberships.length}</p>
          <p className="text-xs text-text-secondary">Clubs Joined</p>
        </Card>
        <Card className="p-4">
          <p className="text-xl font-bold text-text-primary">{hoursAgg._sum.hours ?? 0}</p>
          <p className="text-xs text-text-secondary">Verified Hours</p>
        </Card>
        <Card className="p-4">
          <p className="text-xl font-bold text-text-primary">{eventCount}</p>
          <p className="text-xs text-text-secondary">Events Attended</p>
        </Card>
      </div>

      <Card className="mt-6">
        <CardContent className="p-5">
          <p className="text-sm font-semibold text-text-primary">Profile Details</p>
          <dl className="mt-3 grid grid-cols-2 gap-3 text-sm">
            {user.school ? (
              <div>
                <dt className="text-xs text-text-muted">Grade</dt>
                <dd className="mt-1">
                  <EditGradeForm userId={user.id} currentGrade={user.grade} gradeLevels={schoolGradeLevels(user.school)} />
                </dd>
              </div>
            ) : (
              <Field label="Grade" value={user.grade ?? "—"} />
            )}
            <Field label="School" value={user.school?.name ?? "—"} />
            <Field label="Joined" value={user.createdAt.toDateString()} />
            <Field label="Service Hour Goal" value={String(user.serviceHourGoal)} />
          </dl>
        </CardContent>
      </Card>

      {user.memberships.length > 0 && (
        <Card className="mt-4">
          <CardContent className="p-5">
            <p className="text-sm font-semibold text-text-primary">Club Memberships</p>
            <div className="mt-3 space-y-2">
              {user.memberships.map((m) => (
                <div key={m.id} className="flex items-center justify-between text-sm">
                  <span className="text-text-primary">{m.club.name}</span>
                  <Badge>{m.role}</Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <div className="mt-4">
        <ServiceHoursManager userId={user.id} />
      </div>

      <div className="mt-4">
        <MergeUserSection userId={user.id} name={`${user.firstName} ${user.lastName}`} />
      </div>

      <div className="mt-6">
        <UserActions userId={user.id} accountStatus={user.accountStatus} platformRole={user.platformRole} />
      </div>
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs text-text-muted">{label}</dt>
      <dd className="text-text-primary">{value}</dd>
    </div>
  );
}

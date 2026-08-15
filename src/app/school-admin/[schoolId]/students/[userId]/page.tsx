import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getSchoolAdminContext } from "@/lib/school-admin";
import { db } from "@/lib/db";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { EditGradeForm } from "@/components/edit-grade-form";
import { schoolGradeLevels } from "@/lib/grades";
import { BackButton } from "@/components/ui/back-button";
import { StudentActions } from "./student-actions";

export async function generateMetadata({ params }: { params: Promise<{ userId: string }> }): Promise<Metadata> {
  const { userId } = await params;
  const user = await db.user.findUnique({ where: { id: userId }, select: { firstName: true, lastName: true } });
  return { title: user ? `${user.firstName} ${user.lastName}` : "Student" };
}

export default async function SchoolAdminStudentDetailPage({ params }: { params: Promise<{ schoolId: string; userId: string }> }) {
  const { schoolId, userId } = await params;
  const { school } = await getSchoolAdminContext(schoolId);

  const user = await db.user.findUnique({
    where: { id: userId },
    include: { memberships: { include: { club: true } } },
  });
  // Never show — or allow acting on — an account outside this school, or
  // anyone who isn't a plain STUDENT (Platform Admins / other School Admins
  // are never reachable through this page, even by direct URL).
  if (!user || user.schoolId !== schoolId || user.platformRole !== "STUDENT") notFound();

  const [hoursAgg, eventCount] = await Promise.all([
    db.serviceHourRecord.aggregate({ where: { userId, status: "VERIFIED" }, _sum: { hours: true } }),
    db.eventRegistration.count({ where: { userId, status: "ATTENDED" } }),
  ]);

  return (
    <div className="mx-auto max-w-3xl px-6 py-8">
      <BackButton fallbackHref={`/school-admin/${schoolId}/students`} />
      <div className="mt-3 flex items-start gap-4">
        <Avatar firstName={user.firstName} lastName={user.lastName} src={user.avatarUrl} size="xl" />
        <div className="flex-1">
          <h1 className="text-xl font-bold text-text-primary">
            {user.firstName} {user.lastName}
          </h1>
          <p className="text-sm text-text-secondary">{user.email}</p>
          <div className="mt-2 flex gap-2">
            <Badge tone={user.accountStatus === "SUSPENDED" ? "danger" : "success"}>{user.accountStatus}</Badge>
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
            <div>
              <dt className="text-xs text-text-muted">Grade</dt>
              <dd className="mt-1">
                <EditGradeForm userId={user.id} currentGrade={user.grade} gradeLevels={schoolGradeLevels(school)} />
              </dd>
            </div>
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

      <div className="mt-6">
        <StudentActions schoolId={schoolId} userId={user.id} accountStatus={user.accountStatus} />
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

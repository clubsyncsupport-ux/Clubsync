import type { Metadata } from "next";
import { getSchoolAdminContext } from "@/lib/school-admin";
import { db } from "@/lib/db";
import { Card, CardContent } from "@/components/ui/card";
import { PendingStaffList } from "@/app/admin/settings/pending-staff-list";

export const metadata: Metadata = { title: "Teachers" };

export default async function SchoolAdminTeachersPage({ params }: { params: Promise<{ schoolId: string }> }) {
  const { schoolId } = await params;
  await getSchoolAdminContext(schoolId);

  const [pending, approvedCount, rejectedCount] = await Promise.all([
    db.user.findMany({
      where: { accountKind: "STAFF", staffApprovalStatus: "PENDING", schoolId },
      select: { id: true, firstName: true, lastName: true, email: true, avatarUrl: true, school: { select: { name: true } } },
      orderBy: { firstName: "asc" },
    }),
    db.user.count({ where: { accountKind: "STAFF", staffApprovalStatus: "APPROVED", schoolId } }),
    db.user.count({ where: { accountKind: "STAFF", staffApprovalStatus: "REJECTED", schoolId } }),
  ]);

  return (
    <div className="mx-auto max-w-2xl px-4 py-6 space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-text-primary">Teachers</h1>
        <p className="mt-1 text-[15px] text-text-secondary">
          A new Teacher account at your school can&rsquo;t create a club until it&rsquo;s approved here.
        </p>
      </div>

      <Card>
        <CardContent className="p-5">
          <p className="text-sm font-semibold text-text-primary">Pending Approval {pending.length > 0 && `(${pending.length})`}</p>
          <PendingStaffList pending={pending} />
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-5">
          <p className="text-sm font-semibold text-text-primary">All Teachers at This School</p>
          <dl className="mt-3 grid grid-cols-3 gap-3 text-sm">
            <div>
              <dt className="text-xs text-text-muted">Pending</dt>
              <dd className="font-semibold text-text-primary">{pending.length}</dd>
            </div>
            <div>
              <dt className="text-xs text-text-muted">Approved</dt>
              <dd className="font-semibold text-text-primary">{approvedCount}</dd>
            </div>
            <div>
              <dt className="text-xs text-text-muted">Rejected</dt>
              <dd className="font-semibold text-text-primary">{rejectedCount}</dd>
            </div>
          </dl>
        </CardContent>
      </Card>
    </div>
  );
}

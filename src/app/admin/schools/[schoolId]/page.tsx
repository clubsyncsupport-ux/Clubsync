import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/admin";
import { db } from "@/lib/db";
import { Card, CardContent } from "@/components/ui/card";
import { SchoolBasicInfoForm } from "./school-basic-info-form";
import { AssignSchoolAdminForm } from "./assign-school-admin-form";
import { SchoolAdminList } from "./school-admin-list";
import { DeleteSchoolButton } from "./delete-school-button";

export async function generateMetadata({ params }: { params: Promise<{ schoolId: string }> }): Promise<Metadata> {
  const { schoolId } = await params;
  const school = await db.school.findUnique({ where: { id: schoolId }, select: { name: true } });
  return { title: school?.name ?? "School" };
}

export default async function AdminSchoolDetailPage({ params }: { params: Promise<{ schoolId: string }> }) {
  await requireAdmin();
  const { schoolId } = await params;

  const school = await db.school.findUnique({
    where: { id: schoolId },
    include: {
      _count: { select: { users: true, clubs: true } },
      schoolAdmins: true,
    },
  });
  if (!school) notFound();

  return (
    <div className="mx-auto max-w-3xl px-6 py-8">
      <Link href="/admin/schools" className="text-sm font-medium text-text-secondary hover:text-text-primary">
        ← Back to Schools
      </Link>
      <h1 className="mt-3 text-2xl font-bold tracking-tight text-text-primary">{school.name}</h1>

      <Link
        href={`/school-admin/${school.id}`}
        className="mt-4 inline-flex items-center gap-1.5 rounded-xl bg-accent px-4 py-2 text-sm font-medium text-on-accent hover:bg-accent-hover"
      >
        🛡 Manage as School Admin →
      </Link>
      <p className="mt-1.5 text-xs text-text-muted">
        Opens this school&rsquo;s full management dashboard — students, clubs, events, and settings — so you can step in and help.
      </p>

      <div className="mt-6 grid grid-cols-2 gap-3">
        <Card className="p-4">
          <p className="text-xl font-bold text-text-primary">{school._count.users}</p>
          <p className="text-xs text-text-secondary">Students & staff</p>
        </Card>
        <Card className="p-4">
          <p className="text-xl font-bold text-text-primary">{school._count.clubs}</p>
          <p className="text-xs text-text-secondary">Clubs</p>
        </Card>
      </div>

      <Card className="mt-6">
        <CardContent className="p-5">
          <p className="text-sm font-semibold text-text-primary">School Information</p>
          <div className="mt-3">
            <SchoolBasicInfoForm schoolId={school.id} school={school} />
          </div>
        </CardContent>
      </Card>

      <Card className="mt-4">
        <CardContent className="p-5">
          <p className="text-sm font-semibold text-text-primary">School Admin(s)</p>
          <p className="mt-1 text-xs text-text-muted">
            School Admins can manage everything at this school — students, clubs, events, and settings — but can never assign or remove
            other School Admins, and can never touch another school. Only a Platform Admin can assign or remove a School Admin.
          </p>
          <SchoolAdminList admins={school.schoolAdmins} />
          <AssignSchoolAdminForm schoolId={school.id} />
        </CardContent>
      </Card>

      <Card className="mt-4">
        <CardContent className="p-5 space-y-3">
          <p className="text-sm font-semibold text-text-primary">Danger Zone</p>
          <p className="text-xs text-text-muted">
            A school can only be deleted once it has no students, staff, or clubs remaining.
          </p>
          <DeleteSchoolButton schoolId={school.id} />
        </CardContent>
      </Card>
    </div>
  );
}

import type { Metadata } from "next";
import Link from "next/link";
import { getSchoolAdminContext } from "@/lib/school-admin";
import { db } from "@/lib/db";
import { Badge } from "@/components/ui/badge";
import { Avatar } from "@/components/ui/avatar";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";

export const metadata: Metadata = { title: "Students" };

export default async function SchoolAdminStudentsPage({
  params,
  searchParams,
}: {
  params: Promise<{ schoolId: string }>;
  searchParams: Promise<{ q?: string }>;
}) {
  const { schoolId } = await params;
  await getSchoolAdminContext(schoolId);
  const { q } = await searchParams;

  const students = await db.user.findMany({
    where: {
      schoolId,
      platformRole: "STUDENT",
      ...(q ? { OR: [{ firstName: { contains: q } }, { lastName: { contains: q } }, { email: { contains: q } }] } : {}),
    },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  return (
    <div className="mx-auto max-w-5xl px-6 py-8">
      <h1 className="text-2xl font-bold tracking-tight text-text-primary">Students</h1>

      <form action={`/school-admin/${schoolId}/students`} method="get" className="mt-4">
        <input
          type="search"
          name="q"
          defaultValue={q}
          placeholder="Search by name or email…"
          className="w-full max-w-md rounded-xl border border-border bg-surface-1 px-4 py-2 text-sm outline-none focus:border-accent"
        />
      </form>

      {students.length === 0 ? (
        <Card className="mt-5">
          <EmptyState
            icon="🧑‍🎓"
            title={q ? "No students match your search" : "No students yet"}
            description={q ? `Nothing found for "${q}".` : "Students who join your school will show up here."}
          />
        </Card>
      ) : (
        <div className="mt-5 overflow-hidden rounded-2xl border border-border">
          <table className="w-full text-left text-sm">
            <thead className="bg-surface-1 text-xs text-text-muted">
              <tr>
                <th className="px-4 py-2 font-medium">Student</th>
                <th className="px-4 py-2 font-medium">Grade</th>
                <th className="px-4 py-2 font-medium">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {students.map((s) => (
                <tr key={s.id} className="hover:bg-surface-2">
                  <td className="px-4 py-2.5">
                    <Link href={`/school-admin/${schoolId}/students/${s.id}`} className="flex items-center gap-2">
                      <Avatar firstName={s.firstName} lastName={s.lastName} src={s.avatarUrl} size="sm" />
                      <div>
                        <p className="font-medium text-text-primary">
                          {s.firstName} {s.lastName}
                        </p>
                        <p className="text-xs text-text-muted">{s.email}</p>
                      </div>
                    </Link>
                  </td>
                  <td className="px-4 py-2.5 text-text-secondary">{s.grade ?? "—"}</td>
                  <td className="px-4 py-2.5">
                    <Badge tone={s.accountStatus === "SUSPENDED" ? "danger" : "success"}>{s.accountStatus}</Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

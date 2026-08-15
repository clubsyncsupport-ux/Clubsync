import type { Metadata } from "next";
import Link from "next/link";
import { requireAdmin } from "@/lib/admin";
import { db } from "@/lib/db";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { CreateSchoolForm } from "./create-school-form";

export const metadata: Metadata = { title: "Schools" };

export default async function AdminSchoolsPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  await requireAdmin();
  const { q } = await searchParams;

  const schools = await db.school.findMany({
    where: q ? { name: { contains: q } } : undefined,
    include: {
      _count: { select: { users: true, clubs: true } },
      schoolAdmins: { select: { id: true, firstName: true, lastName: true } },
    },
    orderBy: { name: "asc" },
  });

  return (
    <div className="mx-auto max-w-5xl px-6 py-8">
      <h1 className="text-2xl font-bold tracking-tight text-text-primary">Schools</h1>
      <p className="mt-1 text-sm text-text-secondary">Every school on ClubSync, and who administers each one.</p>

      <form action="/admin/schools" method="get" className="mt-4">
        <input
          type="search"
          name="q"
          defaultValue={q}
          placeholder="Search schools…"
          className="w-full max-w-md rounded-xl border border-border bg-surface-1 px-4 py-2 text-sm outline-none focus:border-accent"
        />
      </form>

      <Card className="mt-5">
        <div className="p-5">
          <p className="text-sm font-semibold text-text-primary">Add a School</p>
          <CreateSchoolForm />
        </div>
      </Card>

      {schools.length === 0 ? (
        <Card className="mt-5">
          <EmptyState
            icon="🏫"
            title={q ? "No schools match your search" : "No schools yet"}
            description={q ? `Nothing found for "${q}".` : "Add your first school above to get started."}
          />
        </Card>
      ) : (
        <div className="mt-5 overflow-hidden rounded-2xl border border-border">
          <table className="w-full text-left text-sm">
            <thead className="bg-surface-1 text-xs text-text-muted">
              <tr>
                <th className="px-4 py-2 font-medium">School</th>
                <th className="px-4 py-2 font-medium">Location</th>
                <th className="px-4 py-2 font-medium">Students</th>
                <th className="px-4 py-2 font-medium">Clubs</th>
                <th className="px-4 py-2 font-medium">School Admin(s)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {schools.map((s) => (
                <tr key={s.id} className="hover:bg-surface-2">
                  <td className="px-4 py-2.5">
                    <Link href={`/admin/schools/${s.id}`} className="font-medium text-text-primary">
                      {s.name}
                    </Link>
                  </td>
                  <td className="px-4 py-2.5 text-text-secondary">{[s.city, s.region, s.country].filter(Boolean).join(", ") || "—"}</td>
                  <td className="px-4 py-2.5 text-text-secondary">{s._count.users}</td>
                  <td className="px-4 py-2.5 text-text-secondary">{s._count.clubs}</td>
                  <td className="px-4 py-2.5 text-text-secondary">
                    {s.schoolAdmins.length === 0 ? "—" : s.schoolAdmins.map((a) => `${a.firstName} ${a.lastName}`).join(", ")}
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

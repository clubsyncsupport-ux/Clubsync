import type { Metadata } from "next";
import Link from "next/link";
import { getSchoolAdminContext } from "@/lib/school-admin";
import { db } from "@/lib/db";
import { getTakenColors } from "@/lib/data/club-colors";
import { Badge, ColorDot } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { CreateClubForm } from "./create-club-form";

export const metadata: Metadata = { title: "Clubs" };

export default async function SchoolAdminClubsPage({
  params,
  searchParams,
}: {
  params: Promise<{ schoolId: string }>;
  searchParams: Promise<{ q?: string }>;
}) {
  const { schoolId } = await params;
  await getSchoolAdminContext(schoolId);
  const { q } = await searchParams;

  const [clubs, takenColors] = await Promise.all([
    db.club.findMany({
      where: { schoolId, ...(q ? { name: { contains: q } } : {}) },
      include: { _count: { select: { memberships: { where: { status: "ACTIVE" } }, events: true } } },
      orderBy: { createdAt: "desc" },
    }),
    getTakenColors(schoolId),
  ]);

  return (
    <div className="mx-auto max-w-5xl px-6 py-8">
      <h1 className="text-2xl font-bold tracking-tight text-text-primary">Clubs</h1>

      <form action={`/school-admin/${schoolId}/clubs`} method="get" className="mt-4">
        <input
          type="search"
          name="q"
          defaultValue={q}
          placeholder="Search clubs…"
          className="w-full max-w-md rounded-xl border border-border bg-surface-1 px-4 py-2 text-sm outline-none focus:border-accent"
        />
      </form>

      <Card className="mt-5">
        <div className="p-5">
          <p className="text-sm font-semibold text-text-primary">Add a Club</p>
          <CreateClubForm schoolId={schoolId} takenColors={takenColors} />
        </div>
      </Card>

      {clubs.length === 0 ? (
        <Card className="mt-5">
          <EmptyState
            icon="🏫"
            title={q ? "No clubs match your search" : "No clubs yet"}
            description={q ? `Nothing found for "${q}".` : "Add your first club above to get started."}
          />
        </Card>
      ) : (
        <div className="mt-5 overflow-hidden rounded-2xl border border-border">
          <table className="w-full text-left text-sm">
            <thead className="bg-surface-1 text-xs text-text-muted">
              <tr>
                <th className="px-4 py-2 font-medium">Club</th>
                <th className="px-4 py-2 font-medium">Members</th>
                <th className="px-4 py-2 font-medium">Events</th>
                <th className="px-4 py-2 font-medium">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {clubs.map((c) => (
                <tr key={c.id} className="hover:bg-surface-2">
                  <td className="px-4 py-2.5">
                    <Link href={`/school-admin/${schoolId}/clubs/${c.id}`} className="flex items-center gap-2 font-medium text-text-primary">
                      <ColorDot color={c.color} />
                      {c.name}
                    </Link>
                  </td>
                  <td className="px-4 py-2.5 text-text-secondary">{c._count.memberships}</td>
                  <td className="px-4 py-2.5 text-text-secondary">{c._count.events}</td>
                  <td className="px-4 py-2.5">
                    <Badge tone={c.status === "ACTIVE" ? "success" : c.status === "ARCHIVED" ? "danger" : "neutral"}>{c.status}</Badge>
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

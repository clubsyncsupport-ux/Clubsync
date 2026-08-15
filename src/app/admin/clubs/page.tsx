import type { Metadata } from "next";
import Link from "next/link";
import { requireAdmin } from "@/lib/admin";
import { db } from "@/lib/db";
import { Badge, ColorDot } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";

export const metadata: Metadata = { title: "Clubs" };

export default async function AdminClubsPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  await requireAdmin();
  const { q } = await searchParams;

  const clubs = await db.club.findMany({
    where: q ? { name: { contains: q } } : undefined,
    include: { school: true, _count: { select: { memberships: { where: { status: "ACTIVE" } }, events: true } } },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  return (
    <div className="mx-auto max-w-5xl px-6 py-8">
      <h1 className="text-2xl font-bold tracking-tight text-text-primary">Clubs</h1>

      <form action="/admin/clubs" method="get" className="mt-4">
        <input
          type="search"
          name="q"
          defaultValue={q}
          placeholder="Search clubs…"
          className="w-full max-w-md rounded-xl border border-border bg-surface-1 px-4 py-2 text-sm outline-none focus:border-accent"
        />
      </form>

      {clubs.length === 0 ? (
        <Card className="mt-5">
          <EmptyState
            icon="🏫"
            title={q ? "No clubs match your search" : "No clubs yet"}
            description={q ? `Nothing found for "${q}".` : "Clubs will show up here once schools start creating them."}
          />
        </Card>
      ) : (
        <div className="mt-5 overflow-hidden rounded-2xl border border-border">
          <table className="w-full text-left text-sm">
            <thead className="bg-surface-1 text-xs text-text-muted">
              <tr>
                <th className="px-4 py-2 font-medium">Club</th>
                <th className="px-4 py-2 font-medium">School</th>
                <th className="px-4 py-2 font-medium">Members</th>
                <th className="px-4 py-2 font-medium">Events</th>
                <th className="px-4 py-2 font-medium">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {clubs.map((c) => (
                <tr key={c.id} className="hover:bg-surface-2">
                  <td className="px-4 py-2.5">
                    <Link href={`/admin/clubs/${c.id}`} className="flex items-center gap-2 font-medium text-text-primary">
                      <ColorDot color={c.color} />
                      {c.name}
                    </Link>
                  </td>
                  <td className="px-4 py-2.5 text-text-secondary">{c.school.name}</td>
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

import type { Metadata } from "next";
import Link from "next/link";
import { requireAdmin } from "@/lib/admin";
import { db } from "@/lib/db";
import { Badge } from "@/components/ui/badge";
import { Avatar } from "@/components/ui/avatar";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";

export const metadata: Metadata = { title: "Users" };

export default async function AdminUsersPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  await requireAdmin();
  const { q } = await searchParams;

  const users = await db.user.findMany({
    where: q
      ? { OR: [{ firstName: { contains: q } }, { lastName: { contains: q } }, { email: { contains: q } }] }
      : undefined,
    include: { school: true },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  return (
    <div className="mx-auto max-w-5xl px-6 py-8">
      <h1 className="text-2xl font-bold tracking-tight text-text-primary">Users</h1>

      <form action="/admin/users" method="get" className="mt-4">
        <input
          type="search"
          name="q"
          defaultValue={q}
          placeholder="Search by name or email…"
          className="w-full max-w-md rounded-xl border border-border bg-surface-1 px-4 py-2 text-sm outline-none focus:border-accent"
        />
      </form>

      {users.length === 0 ? (
        <Card className="mt-5">
          <EmptyState
            icon="🧑‍🎓"
            title={q ? "No users match your search" : "No users yet"}
            description={q ? `Nothing found for "${q}".` : "Registered students, directors, and staff will show up here."}
          />
        </Card>
      ) : (
      <div className="mt-5 overflow-hidden rounded-2xl border border-border">
        <table className="w-full text-left text-sm">
          <thead className="bg-surface-1 text-xs text-text-muted">
            <tr>
              <th className="px-4 py-2 font-medium">User</th>
              <th className="px-4 py-2 font-medium">School</th>
              <th className="px-4 py-2 font-medium">Role</th>
              <th className="px-4 py-2 font-medium">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {users.map((u) => (
              <tr key={u.id} className="hover:bg-surface-2">
                <td className="px-4 py-2.5">
                  <Link href={`/admin/users/${u.id}`} className="flex items-center gap-2">
                    <Avatar firstName={u.firstName} lastName={u.lastName} src={u.avatarUrl} size="sm" />
                    <div>
                      <p className="font-medium text-text-primary">
                        {u.firstName} {u.lastName}
                      </p>
                      <p className="text-xs text-text-muted">{u.email}</p>
                    </div>
                  </Link>
                </td>
                <td className="px-4 py-2.5 text-text-secondary">{u.school?.name ?? "—"}</td>
                <td className="px-4 py-2.5">{u.platformRole === "PLATFORM_ADMIN" && <Badge tone="accent">Admin</Badge>}</td>
                <td className="px-4 py-2.5">
                  <Badge tone={u.accountStatus === "SUSPENDED" ? "danger" : "success"}>{u.accountStatus}</Badge>
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

import type { Metadata } from "next";
import Link from "next/link";
import { requireAdmin } from "@/lib/admin";
import { db } from "@/lib/db";
import { Card, CardContent } from "@/components/ui/card";
import { CLUB_CATEGORIES } from "@/lib/constants";
import { GrantAdminForm } from "./grant-admin-form";
import { AdminList } from "./admin-list";

export const metadata: Metadata = { title: "Admin Settings" };

export default async function AdminSettingsPage() {
  const admin = await requireAdmin();

  const [schoolCount, userCount, clubCount, dbStats, admins] = await Promise.all([
    db.school.count(),
    db.user.count(),
    db.club.count(),
    db.eventAttachment.aggregate({ _sum: { size: true }, _count: true }),
    db.user.findMany({
      where: { platformRole: "PLATFORM_ADMIN" },
      select: { id: true, firstName: true, lastName: true, email: true, avatarUrl: true },
      orderBy: { firstName: "asc" },
    }),
  ]);

  const storageMb = ((dbStats._sum.size ?? 0) / (1024 * 1024)).toFixed(2);

  return (
    <div className="mx-auto max-w-3xl px-6 py-8 space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-text-primary">Platform Settings</h1>
        <p className="mt-1 text-sm text-text-secondary">Application-wide configuration.</p>
      </div>

      <Card>
        <CardContent className="p-5">
          <p className="text-sm font-semibold text-text-primary">Platform Overview</p>
          <dl className="mt-3 grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
            <div>
              <dt className="text-xs text-text-muted">Total Users</dt>
              <dd className="font-semibold text-text-primary">{userCount}</dd>
            </div>
            <div>
              <dt className="text-xs text-text-muted">Total Clubs</dt>
              <dd className="font-semibold text-text-primary">{clubCount}</dd>
            </div>
            <div>
              <dt className="text-xs text-text-muted">Schools</dt>
              <dd className="font-semibold text-text-primary">{schoolCount}</dd>
            </div>
            <div>
              <dt className="text-xs text-text-muted">Files Stored</dt>
              <dd className="font-semibold text-text-primary">
                {dbStats._count} ({storageMb} MB)
              </dd>
            </div>
          </dl>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-5">
          <p className="text-sm font-semibold text-text-primary">Schools & Organizations</p>
          <p className="mt-1 text-xs text-text-muted">Add schools, edit their details, and assign School Admins.</p>
          <Link href="/admin/schools" className="mt-3 inline-block text-sm font-medium text-accent">
            Manage schools →
          </Link>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-5">
          <p className="text-sm font-semibold text-text-primary">Club Categories</p>
          <p className="mt-1 text-xs text-text-muted">Available when creating or editing a club.</p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {CLUB_CATEGORIES.map((c) => (
              <span key={c} className="rounded-full border border-border px-2.5 py-1 text-xs text-text-secondary">
                {c}
              </span>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-5">
          <p className="text-sm font-semibold text-text-primary">Platform Administrators</p>
          <p className="mt-1 text-xs text-text-muted">Anyone here can add or remove other admins. Search by email to add one.</p>
          <GrantAdminForm />
          <AdminList admins={admins} currentUserId={admin.id} />
        </CardContent>
      </Card>
    </div>
  );
}

import { getSchoolAdminContext } from "@/lib/school-admin";
import { db } from "@/lib/db";
import { logoutAction } from "@/app/actions/auth";
import { switchProfileAction } from "@/app/actions/profile";
import { AdminNavLinks, AdminMobileNavLinks } from "@/app/admin/admin-nav-links";
import type { NavIconName } from "@/components/nav/nav-icons";

export default async function SchoolAdminLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ schoolId: string }>;
}) {
  const { schoolId } = await params;
  const { school, user, isPlatformAdmin } = await getSchoolAdminContext(schoolId);
  const pendingStaffCount = await db.user.count({ where: { accountKind: "STAFF", staffApprovalStatus: "PENDING", schoolId } });

  const NAV: { href: string; label: string; icon: NavIconName; badge?: boolean }[] = [
    { href: `/school-admin/${schoolId}`, label: "Dashboard", icon: "LayoutDashboard" },
    { href: `/school-admin/${schoolId}/students`, label: "Students", icon: "GraduationCap" },
    { href: `/school-admin/${schoolId}/teachers`, label: "Teachers", icon: "User", badge: pendingStaffCount > 0 },
    { href: `/school-admin/${schoolId}/clubs`, label: "Clubs", icon: "Users" },
    { href: `/school-admin/${schoolId}/settings`, label: "Settings", icon: "Settings" },
  ];

  return (
    <div className="flex min-h-dvh bg-surface-0">
      <aside className="hidden w-60 shrink-0 flex-col border-r border-border bg-surface-1 p-4 md:sticky md:top-0 md:flex md:h-dvh">
        <div className="min-w-0 px-2 py-3">
          <p className="truncate text-lg font-bold tracking-tight text-text-primary">{school.name}</p>
          <p className="text-[11px] text-text-muted">School Admin</p>
        </div>
        <div className="mt-4 flex-1">
          <AdminNavLinks items={NAV} />
        </div>
        <div className="border-t border-border pt-3">
          <p className="px-2 text-sm font-medium text-text-primary">
            {user.firstName} {user.lastName}
          </p>
          <form action={switchProfileAction.bind(null, isPlatformAdmin ? { kind: "admin" } : { kind: "student" })} className="mt-2">
            <button type="submit" className="px-2 text-xs font-medium text-accent">
              {isPlatformAdmin ? "← Back to platform admin" : "← Back to student app"}
            </button>
          </form>
          <form action={logoutAction} className="mt-1">
            <button type="submit" className="px-2 text-xs text-danger">
              Sign Out
            </button>
          </form>
        </div>
      </aside>

      <div className="flex-1">
        <header className="flex items-center justify-between border-b border-border bg-surface-1 px-4 py-3 md:hidden">
          <span className="truncate font-semibold text-text-primary">{school.name}</span>
          <form action={switchProfileAction.bind(null, isPlatformAdmin ? { kind: "admin" } : { kind: "student" })}>
            <button type="submit" className="shrink-0 text-xs font-medium text-accent">
              Exit
            </button>
          </form>
        </header>
        <div className="border-b border-border bg-surface-1 md:hidden">
          <AdminMobileNavLinks items={NAV} />
        </div>
        <main>{children}</main>
      </div>
    </div>
  );
}

import { requireAdmin } from "@/lib/admin";
import { logoutAction } from "@/app/actions/auth";
import { switchProfileAction } from "@/app/actions/profile";
import { db } from "@/lib/db";
import { AdminNavLinks, AdminMobileNavLinks } from "./admin-nav-links";
import type { NavIconName } from "@/components/nav/nav-icons";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const admin = await requireAdmin();
  const pendingStaffCount = await db.user.count({ where: { accountKind: "STAFF", staffApprovalStatus: "PENDING" } });

  const NAV: { href: string; label: string; icon: NavIconName; badge?: boolean }[] = [
    { href: "/admin", label: "Dashboard", icon: "LayoutDashboard" },
    { href: "/admin/schools", label: "Schools", icon: "School" },
    { href: "/admin/users", label: "Users", icon: "User" },
    { href: "/admin/teachers", label: "Teachers", icon: "GraduationCap", badge: pendingStaffCount > 0 },
    { href: "/admin/clubs", label: "Clubs", icon: "Users" },
    { href: "/admin/events", label: "Events", icon: "Calendar" },
    { href: "/admin/service-hours", label: "Service Hours", icon: "Clock" },
    { href: "/admin/moderation", label: "Moderation & Logs", icon: "Shield" },
    { href: "/admin/settings", label: "Settings", icon: "Settings" },
  ];

  return (
    <div className="flex min-h-dvh bg-surface-0">
      <aside className="hidden w-60 shrink-0 flex-col border-r border-border bg-surface-1 p-4 md:sticky md:top-0 md:flex md:h-dvh">
        <div className="px-2 py-3">
          <p className="text-lg font-bold tracking-tight text-text-primary">ClubSync</p>
          <p className="text-[11px] text-text-muted">Platform Admin</p>
        </div>
        <div className="mt-4 flex-1">
          <AdminNavLinks items={NAV} />
        </div>
        <div className="border-t border-border pt-3">
          <p className="px-2 text-sm font-medium text-text-primary">
            {admin.firstName} {admin.lastName}
          </p>
          <form action={switchProfileAction.bind(null, { kind: "student" })} className="mt-2">
            <button type="submit" className="px-2 text-xs font-medium text-accent">
              ← Back to student app
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
          <span className="font-semibold text-text-primary">ClubSync Admin</span>
          <form action={switchProfileAction.bind(null, { kind: "student" })}>
            <button type="submit" className="text-xs font-medium text-accent">
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

import { requireTeacher } from "@/lib/teacher";
import { db } from "@/lib/db";
import { logoutAction } from "@/app/actions/auth";
import { AdminNavLinks, AdminMobileNavLinks } from "@/app/admin/admin-nav-links";
import type { NavIconName } from "@/components/nav/nav-icons";

export default async function TeacherLayout({ children }: { children: React.ReactNode }) {
  const user = await requireTeacher();
  const pendingCount = await db.club.count({ where: { pendingSupervisorId: user.id, approvalStatus: "PENDING_SUPERVISOR" } });

  const NAV: { href: string; label: string; icon: NavIconName; badge?: boolean }[] = [
    { href: "/teacher", label: "Dashboard", icon: "LayoutDashboard" },
    { href: "/teacher/supervising-requests", label: "Supervising Requests", icon: "ClipboardList", badge: pendingCount > 0 },
    { href: "/teacher/calendar", label: "Calendar", icon: "CalendarDays" },
  ];

  return (
    <div className="flex min-h-dvh bg-surface-0">
      <aside className="hidden w-60 shrink-0 flex-col border-r border-border bg-surface-1 p-4 md:sticky md:top-0 md:flex md:h-dvh">
        <div className="min-w-0 px-2 py-3">
          <p className="truncate text-lg font-bold tracking-tight text-text-primary">ClubSync</p>
          <p className="text-[11px] text-text-muted">Teacher</p>
        </div>
        <div className="mt-4 flex-1">
          <AdminNavLinks items={NAV} />
        </div>
        <div className="border-t border-border pt-3">
          <p className="truncate px-2 text-sm font-medium text-text-primary">
            {user.firstName} {user.lastName}
          </p>
          <form action={logoutAction} className="mt-2">
            <button type="submit" className="px-2 text-xs text-danger">
              Sign Out
            </button>
          </form>
        </div>
      </aside>

      <div className="flex-1">
        <header className="flex items-center justify-between border-b border-border bg-surface-1 px-4 py-3 md:hidden">
          <span className="truncate font-semibold text-text-primary">ClubSync</span>
          <form action={logoutAction}>
            <button type="submit" className="shrink-0 text-xs font-medium text-danger">
              Sign Out
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

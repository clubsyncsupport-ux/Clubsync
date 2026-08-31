import { requireTeacher } from "@/lib/teacher";
import { getViewer, directorClubs } from "@/lib/viewer";
import { getActiveProfile } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { AppShell } from "@/components/nav/app-shell";
import type { NavItem } from "@/components/nav/nav-links";

export default async function TeacherLayout({ children }: { children: React.ReactNode }) {
  const user = await requireTeacher();
  const [viewer, active, pendingCount, unreadCount] = await Promise.all([
    getViewer(),
    getActiveProfile(),
    db.club.count({ where: { pendingSupervisorId: user.id, approvalStatus: "PENDING_SUPERVISOR" } }),
    db.notification.count({ where: { userId: user.id, read: false } }),
  ]);

  const navItems: NavItem[] = [
    { href: "/teacher", label: "Dashboard", icon: "LayoutDashboard", exact: true },
    { href: "/teacher/supervising-requests", label: "Supervising Requests", icon: "ClipboardList", badge: pendingCount > 0 },
    { href: "/teacher/calendar", label: "Calendar", icon: "CalendarDays" },
  ];

  return (
    <AppShell
      navItems={navItems}
      user={{ firstName: viewer.firstName, lastName: viewer.lastName, avatarUrl: viewer.avatarUrl }}
      directorClubs={directorClubs(viewer).map((c) => ({ id: c.id, name: c.name, color: c.color }))}
      isAdmin={viewer.platformRole === "PLATFORM_ADMIN"}
      isStaff
      active={active}
      unreadCount={unreadCount}
    >
      {children}
    </AppShell>
  );
}

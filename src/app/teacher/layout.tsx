import { requireTeacher } from "@/lib/teacher";
import { getViewer, directorClubs } from "@/lib/viewer";
import { requireUser } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { AppShell } from "@/components/nav/app-shell";
import type { NavItem } from "@/components/nav/nav-links";
import { TutorialRoot } from "@/components/tutorial/tutorial-root";
import { tutorialPropsFor } from "@/lib/tutorial/server";

export default async function TeacherLayout({ children }: { children: React.ReactNode }) {
  const authUser = await requireUser();
  const [, viewer, pendingCount, unreadCount] = await Promise.all([
    requireTeacher(),
    getViewer(),
    db.club.count({ where: { pendingSupervisorId: authUser.id, approvalStatus: "PENDING_SUPERVISOR" } }),
    db.notification.count({ where: { userId: authUser.id, read: false } }),
  ]);

  const navItems: NavItem[] = [
    { href: "/teacher", label: "Dashboard", icon: "LayoutDashboard", exact: true },
    { href: "/teacher/supervising-requests", label: "Supervising Requests", icon: "ClipboardList", badge: pendingCount > 0 },
    { href: "/teacher/calendar", label: "Calendar", icon: "CalendarDays" },
    { href: "/teacher/coverage", label: "Staffing Board", icon: "ClipboardCheck" },
    { href: "/teacher/chats", label: "Chats", icon: "MessageCircle" },
    { href: "/teacher/school-feed", label: "School Feed", icon: "Megaphone" },
  ];
  const leaderClubs = directorClubs(viewer);

  return (
    <TutorialRoot
      {...tutorialPropsFor(viewer, {
        role: "teacher",
        isClubLeader: leaderClubs.length > 0,
        autoStartPath: "/teacher",
        ids: { clubId: leaderClubs[0]?.id, schoolId: viewer.schoolAdminOfId ?? undefined },
      })}
    >
      <AppShell
        navItems={navItems}
        user={{ firstName: viewer.firstName, lastName: viewer.lastName, avatarUrl: viewer.avatarUrl }}
        directorClubs={leaderClubs.map((c) => ({ id: c.id, name: c.name, color: c.color }))}
        isAdmin={viewer.platformRole === "PLATFORM_ADMIN"}
        isStaff
        // The Teacher Dashboard is the "teacher" profile (the default "student"
        // slot is shown as Teacher for staff accounts) — not whichever club was
        // last picked in the menu.
        active={{ kind: "student" }}
        unreadCount={unreadCount}
      >
        {children}
      </AppShell>
    </TutorialRoot>
  );
}

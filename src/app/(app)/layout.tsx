import { getViewer, directorClubs } from "@/lib/viewer";
import { getActiveProfile } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { generateEventReminders } from "@/lib/reminders";
import { AppShell } from "@/components/nav/app-shell";
import type { NavItem } from "@/components/nav/nav-links";

const STUDENT_NAV: NavItem[] = [
  { href: "/home", label: "Home", icon: "Home", exact: true },
  { href: "/calendar", label: "Calendar", icon: "Calendar" },
  { href: "/service-hours", label: "Hours", icon: "Clock" },
  { href: "/discover", label: "Discover", icon: "Compass" },
  { href: "/notifications", label: "Alerts", icon: "Bell" },
];

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const viewer = await getViewer();
  const active = await getActiveProfile();
  await generateEventReminders(viewer.id);
  const unreadCount = await db.notification.count({ where: { userId: viewer.id, read: false } });

  const schoolAdminOf =
    viewer.platformRole === "SCHOOL_ADMIN" && viewer.schoolAdminOfId
      ? await db.school.findUnique({ where: { id: viewer.schoolAdminOfId }, select: { id: true, name: true } })
      : null;

  return (
    <AppShell
      navItems={STUDENT_NAV}
      user={{ firstName: viewer.firstName, lastName: viewer.lastName, avatarUrl: viewer.avatarUrl }}
      directorClubs={directorClubs(viewer).map((c) => ({ id: c.id, name: c.name, color: c.color }))}
      schoolAdminOf={schoolAdminOf}
      isAdmin={viewer.platformRole === "PLATFORM_ADMIN"}
      isStaff={viewer.accountKind === "STAFF"}
      active={active}
      unreadCount={unreadCount}
    >
      {children}
    </AppShell>
  );
}

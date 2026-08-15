import { getDirectorContext } from "@/lib/director";
import { getViewer, directorClubs } from "@/lib/viewer";
import { getActiveProfile } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { AppShell } from "@/components/nav/app-shell";
import type { NavItem } from "@/components/nav/nav-links";

export default async function DirectorLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ clubId: string }>;
}) {
  const { clubId } = await params;
  const { club } = await getDirectorContext(clubId);
  const viewer = await getViewer();
  const active = await getActiveProfile();
  const [unreadCount, pendingRequestCount] = await Promise.all([
    db.notification.count({ where: { userId: viewer.id, read: false } }),
    db.clubMembership.count({ where: { clubId, status: "PENDING" } }),
  ]);

  const navItems: NavItem[] = [
    { href: `/director/${clubId}`, label: "Dashboard", icon: "Home", exact: true },
    { href: `/director/${clubId}/events`, label: "Events", icon: "Calendar" },
    { href: `/director/${clubId}/attendance`, label: "Attendance", icon: "ClipboardList" },
    { href: `/director/${clubId}/calendar`, label: "Calendar", icon: "CalendarDays" },
    { href: `/director/${clubId}/members`, label: "Members", icon: "Users", badge: pendingRequestCount > 0 },
    { href: `/director/${clubId}/announcements`, label: "News", icon: "Megaphone" },
    { href: `/director/${clubId}/settings`, label: "Settings", icon: "Settings" },
  ];

  return (
    <AppShell
      navItems={navItems}
      eyebrow={`Managing · ${club.name}`}
      user={{ firstName: viewer.firstName, lastName: viewer.lastName, avatarUrl: viewer.avatarUrl }}
      directorClubs={directorClubs(viewer).map((c) => ({ id: c.id, name: c.name, color: c.color }))}
      isAdmin={viewer.platformRole === "PLATFORM_ADMIN"}
      isStaff={viewer.accountKind === "STAFF"}
      active={active}
      unreadCount={unreadCount}
    >
      {children}
    </AppShell>
  );
}

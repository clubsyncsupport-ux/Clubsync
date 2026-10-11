import { getViewer, directorClubs } from "@/lib/viewer";
import { after } from "next/server";
import { db } from "@/lib/db";
import { generateEventReminders } from "@/lib/reminders";
import { AppShell } from "@/components/nav/app-shell";
import { NotificationToastListener } from "@/components/notification-toast-listener";
import type { NavItem } from "@/components/nav/nav-links";
import { isSchoolAdminTier, schoolAdminTierLabel } from "@/lib/constants";
import { TutorialRoot } from "@/components/tutorial/tutorial-root";
import { tutorialPropsFor } from "@/lib/tutorial/server";

const STUDENT_NAV: NavItem[] = [
  { href: "/home", label: "Home", icon: "Home", exact: true },
  { href: "/my-clubs", label: "Clubs", icon: "LayoutGrid" },
  { href: "/chats", label: "Chats", icon: "MessageCircle" },
  { href: "/calendar", label: "Calendar", icon: "Calendar" },
  { href: "/service-hours", label: "Hours", icon: "Clock" },
  { href: "/discover", label: "Discover", icon: "Compass" },
  // On a phone, Alerts is the bell in the top bar, which makes room for Chats.
  { href: "/notifications", label: "Alerts", icon: "Bell", desktopOnly: true },
];

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const viewer = await getViewer();
  // Event reminders only create notifications — nothing on this page depends
  // on them — so they run after the page is sent instead of making every
  // navigation wait on them. The two lookups the shell does need run together.
  after(() => generateEventReminders(viewer.id));
  const [unreadCount, schoolAdminOfSchool] = await Promise.all([
    db.notification.count({ where: { userId: viewer.id, read: false } }),
    isSchoolAdminTier(viewer.platformRole) && viewer.schoolAdminOfId
      ? db.school.findUnique({ where: { id: viewer.schoolAdminOfId }, select: { id: true, name: true } })
      : Promise.resolve(null),
  ]);
  const schoolAdminOf = schoolAdminOfSchool
    ? { ...schoolAdminOfSchool, roleLabel: schoolAdminTierLabel(viewer.platformRole) }
    : null;
  const leaderClubs = directorClubs(viewer);
  const isStaff = viewer.accountKind === "STAFF";

  return (
    <TutorialRoot
      {...tutorialPropsFor(viewer, {
        role: isStaff ? "teacher" : "student",
        isClubLeader: leaderClubs.length > 0,
        // A teacher account has no student home page; its tour starts from
        // the Teacher Dashboard instead.
        autoStartPath: isStaff ? null : "/home",
        ids: { clubId: leaderClubs[0]?.id, schoolId: viewer.schoolAdminOfId ?? undefined },
      })}
    >
      <AppShell
        navItems={STUDENT_NAV}
        user={{ firstName: viewer.firstName, lastName: viewer.lastName, avatarUrl: viewer.avatarUrl }}
        directorClubs={leaderClubs.map((c) => ({ id: c.id, name: c.name, color: c.color }))}
        schoolAdminOf={schoolAdminOf}
        isAdmin={viewer.platformRole === "PLATFORM_ADMIN"}
        isStaff={isStaff}
        // This is the student area, so that's the profile to show — not whatever
        // was last picked in the menu.
        active={{ kind: "student" }}
        unreadCount={unreadCount}
      >
        {children}
        <NotificationToastListener />
      </AppShell>
    </TutorialRoot>
  );
}

import { getDirectorContext } from "@/lib/director";
import { getViewer, directorClubs } from "@/lib/viewer";
import { requireUser } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { AppShell } from "@/components/nav/app-shell";
import type { NavItem } from "@/components/nav/nav-links";
import { TutorialRoot } from "@/components/tutorial/tutorial-root";
import { tutorialPropsFor } from "@/lib/tutorial/server";

export default async function DirectorLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ clubId: string }>;
}) {
  const { clubId } = await params;
  const authUser = await requireUser();
  // Everything the shell needs only depends on who's signed in and which club
  // this is, so it all runs in one round trip instead of one after another.
  const [{ club }, viewer, unreadCount, pendingRequestCount] = await Promise.all([
    getDirectorContext(clubId),
    getViewer(),
    db.notification.count({ where: { userId: authUser.id, read: false } }),
    db.clubMembership.count({ where: { clubId, status: "PENDING" } }),
  ]);

  const navItems: NavItem[] = [
    { href: `/director/${clubId}`, label: "Dashboard", icon: "Home", exact: true },
    { href: `/director/${clubId}/events`, label: "Events", icon: "Calendar" },
    { href: `/director/${clubId}/attendance`, label: "Attendance", icon: "ClipboardList" },
    { href: `/director/${clubId}/calendar`, label: "Calendar", icon: "CalendarDays" },
    { href: `/director/${clubId}/members`, label: "Members", icon: "Users", badge: pendingRequestCount > 0 },
    { href: `/director/${clubId}/announcements`, label: "News", icon: "Megaphone" },
    { href: `/director/${clubId}/positions`, label: "Positions", icon: "ClipboardCheck" },
    { href: `/director/${clubId}/chat`, label: "Chat", icon: "MessageCircle" },
    { href: `/director/${clubId}/contacts`, label: "Contacts", icon: "Phone" },
    { href: `/director/${clubId}/registration`, label: "Registration", icon: "ClipboardCheck" },
    { href: `/director/${clubId}/settings`, label: "Settings", icon: "Settings" },
  ];
  const isStaff = viewer.accountKind === "STAFF";

  return (
    <TutorialRoot
      {...tutorialPropsFor(viewer, {
        role: isStaff ? "teacher" : "student",
        isClubLeader: true,
        // The quick tour belongs to the home pages, not a club's screens.
        autoStartPath: null,
        ids: { clubId, schoolId: viewer.schoolAdminOfId ?? undefined },
      })}
    >
      <AppShell
        navItems={navItems}
        eyebrow={`Managing · ${club.name}`}
        user={{ firstName: viewer.firstName, lastName: viewer.lastName, avatarUrl: viewer.avatarUrl }}
        directorClubs={directorClubs(viewer).map((c) => ({ id: c.id, name: c.name, color: c.color }))}
        isAdmin={viewer.platformRole === "PLATFORM_ADMIN"}
        isStaff={isStaff}
        active={{ kind: "director", clubId }}
        unreadCount={unreadCount}
      >
        {children}
      </AppShell>
    </TutorialRoot>
  );
}

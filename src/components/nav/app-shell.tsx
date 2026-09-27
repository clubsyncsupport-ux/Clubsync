import Link from "next/link";
import { DesktopNavLinks, BottomNavLinks, type NavItem } from "./nav-links";
import { ProfileSwitcher } from "./profile-switcher";
import { NotificationBell } from "./notification-bell";
import { Bell, MessageCircle } from "lucide-react";
import type { ActiveProfile } from "@/lib/auth/session";

export function AppShell({
  navItems,
  eyebrow,
  user,
  directorClubs,
  schoolAdminOf = null,
  isAdmin,
  isStaff = false,
  active,
  unreadCount,
  children,
}: {
  navItems: NavItem[];
  eyebrow?: string;
  user: { firstName: string; lastName: string; avatarUrl: string | null };
  directorClubs: { id: string; name: string; color: string }[];
  schoolAdminOf?: { id: string; name: string; roleLabel: string } | null;
  isAdmin: boolean;
  /** STAFF accounts (club directors who signed up without a student profile)
   * don't get a "Student" row in the switcher. */
  isStaff?: boolean;
  active: ActiveProfile;
  unreadCount: number;
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-dvh">
      {/* Desktop sidebar — sticky so it stays put (and the profile menu stays reachable)
          on pages tall enough to scroll, instead of scrolling away with the content. */}
      <aside className="hidden w-64 shrink-0 flex-col border-r border-border bg-surface-1 p-4 md:sticky md:top-0 md:flex md:h-dvh print:hidden">
        <Link href={isStaff ? "/teacher" : "/home"} className="flex items-center gap-2 px-2 py-3">
          <span className="text-xl font-bold tracking-tight text-text-primary">ClubSync</span>
        </Link>
        {eyebrow && <p className="mt-2 truncate px-2 text-xs font-medium uppercase tracking-wide text-text-muted">{eyebrow}</p>}
        <div className="mt-4 flex-1">
          <DesktopNavLinks items={navItems} />
        </div>
        <div className="flex items-center justify-between rounded-xl p-2">
          <ProfileSwitcher {...user} directorClubs={directorClubs} schoolAdminOf={schoolAdminOf} isAdmin={isAdmin} isStaff={isStaff} active={active} placement="above-left" />
          <Link href="/notifications" className="relative rounded-full p-2 hover:bg-surface-2">
            <Bell className="h-[18px] w-[18px]" strokeWidth={2} />
            {unreadCount > 0 && <span className="absolute right-1 top-1 h-2 w-2 rounded-full bg-danger" />}
          </Link>
        </div>
      </aside>

      <div className="flex min-h-dvh flex-1 flex-col">
        {/* Mobile top bar */}
        <header className="flex items-center justify-between border-b border-border bg-surface-1 px-4 py-3 md:hidden print:hidden">
          <Link href={isStaff ? "/teacher" : "/home"} className="flex items-center gap-2">
            <span className="text-lg font-bold tracking-tight text-text-primary">ClubSync</span>
          </Link>
          <div className="flex items-center gap-1">
            <NotificationBell unreadCount={unreadCount} />
            <ProfileSwitcher {...user} directorClubs={directorClubs} schoolAdminOf={schoolAdminOf} isAdmin={isAdmin} isStaff={isStaff} active={active} />
          </div>
        </header>

        <main className="flex-1 pb-20 md:pb-8 print:pb-0">{children}</main>

        <div className="print:hidden">
          <BottomNavLinks items={navItems} />
        </div>
      </div>

      {!isStaff && (
        <div className="group fixed bottom-20 right-4 z-40 md:bottom-6 md:right-6 print:hidden">
          <span className="pointer-events-none absolute inset-0 -z-10 rounded-full bg-accent/50 blur-xl transition-opacity duration-300 group-hover:opacity-80" />
          <Link
            href="/chats"
            aria-label="Chats"
            className="relative flex h-16 w-16 items-center justify-center rounded-full bg-accent text-on-accent shadow-[var(--shadow-lg)] transition-transform duration-200 hover:scale-110 active:scale-95"
          >
            <MessageCircle className="h-7 w-7" strokeWidth={2} />
          </Link>
          <span className="pointer-events-none absolute right-full top-1/2 mr-3 -translate-y-1/2 translate-x-1 whitespace-nowrap rounded-lg bg-surface-2 px-2.5 py-1.5 text-xs font-medium text-text-primary opacity-0 shadow-[var(--shadow-sm)] transition-all duration-200 group-hover:translate-x-0 group-hover:opacity-100">
            Chats
          </span>
        </div>
      )}
    </div>
  );
}

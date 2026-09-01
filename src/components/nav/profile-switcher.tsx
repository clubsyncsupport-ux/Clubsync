"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useOnClickOutside } from "@/lib/use-on-click-outside";
import { Avatar } from "@/components/ui/avatar";
import { switchProfileAction } from "@/app/actions/profile";
import { logoutAction } from "@/app/actions/auth";
import { cn } from "@/lib/cn";
import type { ActiveProfile } from "@/lib/auth/session";
import { User, Wrench, Shield, School, Plus, Settings, LogOut, LayoutDashboard, type LucideIcon } from "lucide-react";

type DirectorClub = { id: string; name: string; color: string };
type SchoolAdminOf = { id: string; name: string };

type ProfileSwitcherProps = {
  firstName: string;
  lastName: string;
  avatarUrl: string | null;
  directorClubs: DirectorClub[];
  schoolAdminOf?: SchoolAdminOf | null;
  isAdmin: boolean;
  /** STAFF accounts (club directors who signed up without a student profile)
   * have no "Student" row to switch into. */
  isStaff?: boolean;
  active: ActiveProfile;
  /** Where the menu opens relative to the trigger. Use "above-left" for a
   * trigger pinned to the bottom-left of the screen (the desktop sidebar),
   * where opening downward/rightward would run off the viewport. */
  placement?: "below-right" | "above-left";
};

// This component lives in the persistent app layout, so it survives page
// navigation rather than remounting — closing it from a menu item's onClick
// races against Next's own client-side transition and isn't reliable.
// Keying the actual menu on the pathname makes React remount it (resetting
// `open` to false) on every route change, without an effect calling setState.
export function ProfileSwitcher(props: ProfileSwitcherProps) {
  const pathname = usePathname();
  return <ProfileSwitcherMenu key={pathname} {...props} />;
}

function ProfileSwitcherMenu({
  firstName,
  lastName,
  avatarUrl,
  directorClubs,
  schoolAdminOf = null,
  isAdmin,
  isStaff = false,
  active,
  placement = "below-right",
}: ProfileSwitcherProps) {
  const [open, setOpen] = useState(false);
  const [, startTransition] = useTransition();
  const ref = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  useOnClickOutside(ref, () => setOpen(false));

  function switchTo(profile: ActiveProfile) {
    startTransition(() => {
      switchProfileAction(profile);
    });
  }

  useEffect(() => {
    if (!open) return;
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setOpen(false);
        triggerRef.current?.focus();
      }
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open]);

  const activeLabel =
    active.kind === "student"
      ? // getActiveProfile() defaults to "student" whenever no cookie is set
        // yet (e.g. right after a fresh login) — meaningless for a STAFF
        // account, which has no student profile to actually be viewing.
        isStaff
        ? "Teacher"
        : "Student"
      : active.kind === "admin"
        ? "Platform Admin"
        : active.kind === "school-admin"
          ? schoolAdminOf?.name
            ? `${schoolAdminOf.name} Admin`
            : "School Admin"
          : (directorClubs.find((c) => c.id === active.clubId)?.name ?? "Teacher");

  return (
    <div className="relative" ref={ref}>
      <button
        ref={triggerRef}
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={`Account menu — currently viewing as ${activeLabel}`}
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2 rounded-full pr-1 transition-opacity hover:opacity-80"
      >
        <Avatar firstName={firstName} lastName={lastName} src={avatarUrl} size="sm" />
      </button>

      {open && (
        <div
          role="menu"
          aria-label="Account switcher"
          className={cn(
            "absolute z-40 w-72 animate-fade-in overflow-hidden rounded-2xl border border-border bg-surface-1 shadow-[var(--shadow-lg)]",
            placement === "above-left" ? "bottom-full left-0 mb-2" : "right-0 mt-2"
          )}
        >
          <div className="border-b border-border p-4">
            <p className="font-semibold text-text-primary">
              {firstName} {lastName}
            </p>
            <p className="text-xs text-text-muted">Currently viewing as {activeLabel}</p>
          </div>

          <div className="max-h-64 overflow-y-auto p-2">
            {!isStaff && (
              <ProfileRow
                icon={User}
                label="Student"
                selected={active.kind === "student"}
                onClick={() => switchTo({ kind: "student" })}
              />
            )}
            {isAdmin && (
              <ProfileRow icon={Wrench} label="Platform Admin" selected={active.kind === "admin"} onClick={() => switchTo({ kind: "admin" })} />
            )}
            {isStaff && (
              <Link
                href="/teacher"
                role="menuitem"
                className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-text-primary hover:bg-surface-2"
              >
                <LayoutDashboard className="h-[18px] w-[18px]" strokeWidth={2} />
                Teacher Dashboard
              </Link>
            )}
            {directorClubs.length > 0 && (
              <p className="mt-2 px-3 pb-1 text-xs font-semibold uppercase tracking-wide text-text-muted">My Clubs</p>
            )}
            {directorClubs.map((c) => (
              <ProfileRow
                key={c.id}
                icon={Shield}
                label={c.name}
                selected={active.kind === "director" && active.clubId === c.id}
                onClick={() => switchTo({ kind: "director", clubId: c.id })}
              />
            ))}
            {schoolAdminOf && (
              <ProfileRow
                icon={School}
                label={`${schoolAdminOf.name} Admin`}
                selected={active.kind === "school-admin" && active.schoolId === schoolAdminOf.id}
                onClick={() => switchTo({ kind: "school-admin", schoolId: schoolAdminOf.id })}
              />
            )}
            <Link
              href="/clubs/new"
              role="menuitem"
              className="mt-1 flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-accent hover:bg-surface-2"
            >
              <Plus className="h-[18px] w-[18px]" strokeWidth={2} />
              Create Club
            </Link>
          </div>

          <div className="border-t border-border p-2">
            <Link
              href="/settings"
              role="menuitem"
              className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-text-primary hover:bg-surface-2"
            >
              <Settings className="h-[18px] w-[18px]" strokeWidth={2} /> Settings
            </Link>
            <form action={logoutAction}>
              <button
                type="submit"
                role="menuitem"
                className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm text-danger hover:bg-danger-soft"
              >
                <LogOut className="h-[18px] w-[18px]" strokeWidth={2} /> Sign Out
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

function ProfileRow({ icon: Icon, label, selected, onClick }: { icon: LucideIcon; label: string; selected: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      role="menuitem"
      onClick={onClick}
      className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-medium text-text-primary hover:bg-surface-2"
    >
      <Icon className="h-[18px] w-[18px]" strokeWidth={2} />
      <span className="flex-1">{label}</span>
      {selected && <span className="text-accent">✓</span>}
    </button>
  );
}

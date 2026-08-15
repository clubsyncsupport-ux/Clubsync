"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/cn";
import { NAV_ICONS, type NavIconName } from "./nav-icons";

export type NavItem = {
  href: string;
  label: string;
  icon: NavIconName;
  /** Match only the exact pathname, never as a prefix. Every nav array's
   * first (dashboard/index) item needs this — its href is a literal path
   * segment shared by every sibling route (e.g. "/director/x" is a prefix
   * of "/director/x/events"), so prefix-matching would keep it highlighted
   * on every other page in the section. */
  exact?: boolean;
  /** Small red dot on the icon — e.g. "you have a pending join request to review." */
  badge?: boolean;
};

function isActive(pathname: string | null, item: NavItem) {
  if (!pathname) return false;
  if (item.exact) return pathname === item.href;
  return pathname === item.href || pathname.startsWith(`${item.href}/`);
}

export function DesktopNavLinks({ items }: { items: NavItem[] }) {
  const pathname = usePathname();
  return (
    <nav className="space-y-1">
      {items.map((item) => {
        const active = isActive(pathname, item);
        const Icon = NAV_ICONS[item.icon];
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "flex items-center gap-3 rounded-xl px-3 py-2.5 text-[15px] font-medium transition-colors",
              active ? "bg-accent-soft text-accent-soft-text" : "text-text-secondary hover:bg-surface-2 hover:text-text-primary"
            )}
          >
            <span className="relative inline-flex">
              <Icon className="h-[18px] w-[18px]" strokeWidth={2} />
              {item.badge && <span className="absolute -right-0.5 -top-0.5 h-2 w-2 rounded-full bg-danger" />}
            </span>
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}

export function BottomNavLinks({ items }: { items: NavItem[] }) {
  const pathname = usePathname();
  return (
    <nav className="fixed inset-x-0 bottom-0 z-30 flex transform-gpu border-t border-border bg-surface-1/95 backdrop-blur-lg pb-[env(safe-area-inset-bottom)] will-change-transform md:hidden">
      {items.map((item) => {
        const active = isActive(pathname, item);
        const Icon = NAV_ICONS[item.icon];
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "flex flex-1 flex-col items-center gap-0.5 py-2.5 text-[10px] font-medium transition-colors",
              active ? "text-accent" : "text-text-muted"
            )}
          >
            <span className="relative inline-flex">
              <Icon className="h-5 w-5" strokeWidth={2} />
              {item.badge && <span className="absolute -right-0.5 -top-0.5 h-2 w-2 rounded-full bg-danger" />}
            </span>
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}

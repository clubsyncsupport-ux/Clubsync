"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/cn";
import { NAV_ICONS, type NavIconName } from "@/components/nav/nav-icons";

// The "active" item is whichever href matches most specifically — an exact
// match always wins, otherwise the longest href that's a path-prefix of the
// current URL. This keeps a root/"Dashboard" item (e.g. "/admin" or
// "/school-admin/{id}") from staying highlighted on every deeper subpage just
// because it's also a string-prefix of their hrefs.
function activeHref(pathname: string | null, items: { href: string }[]): string | null {
  if (!pathname) return null;
  const exact = items.find((i) => i.href === pathname);
  if (exact) return exact.href;
  const prefixMatches = items.filter((i) => pathname.startsWith(i.href + "/"));
  if (prefixMatches.length === 0) return null;
  return prefixMatches.reduce((longest, i) => (i.href.length > longest.href.length ? i : longest)).href;
}

export function AdminNavLinks({ items }: { items: { href: string; label: string; icon: NavIconName; badge?: boolean }[] }) {
  const pathname = usePathname();
  const current = activeHref(pathname, items);
  return (
    <nav className="space-y-1">
      {items.map((item) => {
        const active = item.href === current;
        const Icon = NAV_ICONS[item.icon];
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium transition-colors",
              active ? "bg-accent-soft text-accent-soft-text" : "text-text-secondary hover:bg-surface-2 hover:text-text-primary"
            )}
          >
            <span className="relative inline-flex">
              <Icon className="h-4 w-4" strokeWidth={2} />
              {item.badge && <span className="absolute -right-0.5 -top-0.5 h-2 w-2 rounded-full bg-danger" />}
            </span>
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}

// Horizontally-scrollable pill strip shown on mobile, where the sidebar is
// hidden entirely — without this there was no way to reach any admin section
// (including back to Dashboard) except the "Exit" link out of the panel.
export function AdminMobileNavLinks({ items }: { items: { href: string; label: string; icon: NavIconName; badge?: boolean }[] }) {
  const pathname = usePathname();
  const current = activeHref(pathname, items);
  return (
    <nav className="flex gap-1.5 overflow-x-auto px-3 py-2">
      {items.map((item) => {
        const active = item.href === current;
        const Icon = NAV_ICONS[item.icon];
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full px-3 py-1.5 text-xs font-medium transition-colors",
              active ? "bg-accent-soft text-accent-soft-text" : "bg-surface-2 text-text-secondary"
            )}
          >
            <span className="relative inline-flex">
              <Icon className="h-3.5 w-3.5" strokeWidth={2} />
              {item.badge && <span className="absolute -right-0.5 -top-0.5 h-1.5 w-1.5 rounded-full bg-danger" />}
            </span>
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}

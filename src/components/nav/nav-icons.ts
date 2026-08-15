import {
  Home,
  Calendar,
  CalendarDays,
  Clock,
  Compass,
  Bell,
  ClipboardList,
  Users,
  Megaphone,
  Settings,
  LayoutDashboard,
  School,
  User,
  Shield,
  GraduationCap,
  type LucideIcon,
} from "lucide-react";

// Server Components construct nav item arrays with dynamic per-club/per-school
// hrefs, but can't pass Lucide icon *component references* as props into a
// "use client" renderer — React can't serialize a function reference across
// that boundary. So server code passes an icon *name* string instead, and
// this map (used only by the client-side nav renderers) resolves it locally.
export const NAV_ICONS = {
  Home,
  Calendar,
  CalendarDays,
  Clock,
  Compass,
  Bell,
  ClipboardList,
  Users,
  Megaphone,
  Settings,
  LayoutDashboard,
  School,
  User,
  Shield,
  GraduationCap,
} satisfies Record<string, LucideIcon>;

export type NavIconName = keyof typeof NAV_ICONS;

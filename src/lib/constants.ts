// Central source of truth for every "enum-like" string stored in the database.
// (Plain strings are used in prisma/schema.prisma instead of native enums so the
// schema works unchanged on SQLite today and Postgres later — see schema.prisma.)

export const GRADES = ["Grade 8", "Grade 9", "Grade 10", "Grade 11", "Grade 12"] as const;
export type Grade = (typeof GRADES)[number];

export const PLATFORM_ROLES = ["STUDENT", "SCHOOL_ADMIN", "PRINCIPAL", "VICE_PRINCIPAL", "PLATFORM_ADMIN"] as const;
export type PlatformRole = (typeof PLATFORM_ROLES)[number];

// Principal/Vice Principal get identical "School Admin"-shaped access to
// every school-scoped screen (see isSchoolAdminTier below) — they're
// distinct platformRole values only so approval routing can notify/label
// them specifically, not because their access differs from a plain School
// Admin's.
export const SCHOOL_ADMIN_TIER_ROLES = ["SCHOOL_ADMIN", "PRINCIPAL", "VICE_PRINCIPAL"] as const;
export function isSchoolAdminTier(role: string): boolean {
  return (SCHOOL_ADMIN_TIER_ROLES as readonly string[]).includes(role);
}

// Only Principal/Vice Principal (and Platform Admin, checked separately by
// callers) can actually approve/reject in the event-proposal and
// club-registration queues — a plain School Admin sees the same queue
// read-only, the same "can view but not act" split OFFICER already gets
// relative to DIRECTOR in getDirectorContext.
export const APPROVAL_ACTIONABLE_ROLES = ["PRINCIPAL", "VICE_PRINCIPAL"] as const;
export function canActionApprovals(role: string): boolean {
  return (APPROVAL_ACTIONABLE_ROLES as readonly string[]).includes(role);
}

export function schoolAdminTierLabel(role: string): string {
  if (role === "PRINCIPAL") return "Principal";
  if (role === "VICE_PRINCIPAL") return "Vice Principal";
  return "School Admin";
}

// SUPER_ADMIN sits strictly above OFFICER ("Admin") and below DIRECTOR — a
// trusted student-leader tier added for club chat (day-to-day chat
// management so the Sponsor Teacher isn't a bottleneck). Strictly additive:
// every existing OFFICER-level capability (getDirectorContext's
// isAuthorized check) also applies to SUPER_ADMIN, so promoting someone
// never takes anything away.
export const CLUB_ROLES = ["MEMBER", "OFFICER", "SUPER_ADMIN", "DIRECTOR"] as const;
export type ClubRole = (typeof CLUB_ROLES)[number];

export const MEMBERSHIP_STATUSES = ["ACTIVE", "PENDING"] as const;
export type MembershipStatus = (typeof MEMBERSHIP_STATUSES)[number];

export const CLUB_STATUSES = ["ACTIVE", "ARCHIVED", "MERGED"] as const;
export type ClubStatus = (typeof CLUB_STATUSES)[number];

export const EVENT_VISIBILITIES = ["PUBLIC", "PRIVATE"] as const;
export type EventVisibility = (typeof EVENT_VISIBILITIES)[number];

export const EVENT_STATUSES = ["SCHEDULED", "COMPLETED", "FINALIZED", "CANCELLED"] as const;
export type EventStatus = (typeof EVENT_STATUSES)[number];

export const EVENT_RECURRENCES = ["NONE", "DAILY", "WEEKLY", "MONTHLY"] as const;
export type EventRecurrence = (typeof EVENT_RECURRENCES)[number];

export const REGISTRATION_STATUSES = ["REGISTERED", "WAITLISTED", "CANCELLED", "ATTENDED"] as const;
export type RegistrationStatus = (typeof REGISTRATION_STATUSES)[number];

export const SERVICE_HOUR_STATUSES = ["VERIFIED", "PENDING", "REJECTED"] as const;
export type ServiceHourStatus = (typeof SERVICE_HOUR_STATUSES)[number];

export const NOTIFICATION_TYPES = [
  "EVENT_REMINDER",
  "ANNOUNCEMENT",
  "REGISTRATION",
  "SERVICE_HOURS",
  "ACHIEVEMENT",
  "PLATFORM",
] as const;
export type NotificationType = (typeof NOTIFICATION_TYPES)[number];

export const CLUB_CATEGORIES = [
  "Academic",
  "STEM",
  "Arts",
  "Music",
  "Athletics",
  "Leadership",
  "Community Service",
  "Environment",
  "Business",
  "Debate",
  "Technology",
  "Volunteer",
  "Culture",
  "Gaming",
  "Health & Wellness",
  "Language",
  "Other",
] as const;
export type ClubCategory = (typeof CLUB_CATEGORIES)[number];

export const EVENT_CATEGORIES = [
  "Meeting",
  "Volunteer",
  "Competition",
  "Workshop",
  "Social",
  "Executive Meeting",
  "Community Event",
  "Sports Training",
] as const;
export type EventCategoryT = (typeof EVENT_CATEGORIES)[number];

// Routine club meetings skip the event-proposal approval chain entirely —
// every other category needs Sponsor Teacher + Administrator sign-off. See
// src/lib/approvals.ts.
export const AUTO_APPROVED_EVENT_CATEGORIES = ["Meeting", "Executive Meeting"] as const;

export const THEMES = ["light", "dark", "system"] as const;
export type ThemePref = (typeof THEMES)[number];

export const CALENDAR_VIEWS = ["month", "week", "day", "agenda"] as const;
export type CalendarViewT = (typeof CALENDAR_VIEWS)[number];

// A curated palette clubs pick unique colors from (SRS 2.12 / 5.6).
// Deliberately red-free: red is reserved app-wide to mean "this event is
// full" on the student calendar (see calendar/page.tsx), so it's never a
// pickable club or personal-category color — a red event pill always means
// the same thing everywhere. Also deliberately white-free: white is
// reserved app-wide for the "My Google Calendar" layer on every calendar
// view (see GOOGLE_CALENDAR_COLOR in all-clubs-calendar-view.tsx).
export const CLUB_COLOR_PALETTE = [
  { name: "Teal", value: "#0d9488" },
  { name: "Blue", value: "#2563eb" },
  { name: "Indigo", value: "#4f46e5" },
  { name: "Violet", value: "#7c3aed" },
  { name: "Fuchsia", value: "#c026d3" },
  { name: "Orange", value: "#ea580c" },
  { name: "Amber", value: "#d97706" },
  { name: "Lime", value: "#65a30d" },
  { name: "Emerald", value: "#059669" },
  { name: "Cyan", value: "#0891b2" },
  { name: "Slate", value: "#475569" },
  // Second row — lighter/darker variants and a couple extra hues for more room to pick a unique color.
  { name: "Sky", value: "#0ea5e9" },
  { name: "Pink", value: "#db2777" },
  { name: "Gold", value: "#b45309" },
  { name: "Forest", value: "#166534" },
  { name: "Mint", value: "#10b981" },
  { name: "Periwinkle", value: "#6366f1" },
  { name: "Plum", value: "#a21caf" },
  { name: "Steel", value: "#334155" },
  { name: "Sand", value: "#a16207" },
] as const;

export const SERVICE_HOUR_GOALS = [30, 50, 75, 100, 150] as const;

// Minutes-before values offered wherever a student picks event reminder
// lead times (Settings default, and the per-event override after joining).
export const REMINDER_OFFSETS = [
  { minutes: 10, label: "10 minutes before" },
  { minutes: 60, label: "1 hour before" },
  { minutes: 120, label: "2 hours before" },
  { minutes: 720, label: "12 hours before" },
  { minutes: 1440, label: "1 day before" },
  { minutes: 10080, label: "1 week before" },
  { minutes: 43200, label: "1 month before" },
] as const;

export function parseReminderOffsets(csv: string): number[] {
  return csv
    .split(",")
    .map((s) => Number(s))
    .filter((n) => Number.isFinite(n) && n > 0);
}

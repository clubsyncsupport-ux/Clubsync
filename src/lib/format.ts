import { format, formatDistanceToNow, isSameDay, addDays, isSameWeek } from "date-fns";
import { schoolNow, toSchoolZone } from "@/lib/school-time";

// Every date passed in here is a real stored timestamp (an event's startAt,
// etc.) — always route it through toSchoolZone() before comparing it to
// schoolNow() or formatting a clock time from it. The server process itself
// runs in UTC (Vercel's default), 7-8 hours ahead of this school's Pacific
// time for most of the day, so formatting/comparing the raw Date directly
// would show the wrong hour and, near midnight, the wrong day entirely.
export function formatEventDate(date: Date): string {
  const zoned = toSchoolZone(date);
  const now = schoolNow();
  if (isSameDay(zoned, now)) return `Today, ${format(zoned, "h:mm a")}`;
  if (isSameDay(zoned, addDays(now, 1))) return `Tomorrow, ${format(zoned, "h:mm a")}`;
  if (isSameWeek(zoned, now)) return format(zoned, "EEEE, h:mm a");
  return format(zoned, "MMM d, h:mm a");
}

export function formatDateShort(date: Date): string {
  return format(toSchoolZone(date), "MMM d");
}

export function formatTimeRange(start: Date, end: Date): string {
  return `${format(toSchoolZone(start), "h:mm a")} – ${format(toSchoolZone(end), "h:mm a")}`;
}

export function timeAgo(date: Date): string {
  return formatDistanceToNow(date, { addSuffix: true });
}

export function greeting(): string {
  const hour = schoolNow().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}

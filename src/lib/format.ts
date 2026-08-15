import { format, formatDistanceToNow, isToday, isTomorrow, isThisWeek } from "date-fns";

export function formatEventDate(date: Date): string {
  if (isToday(date)) return `Today, ${format(date, "h:mm a")}`;
  if (isTomorrow(date)) return `Tomorrow, ${format(date, "h:mm a")}`;
  if (isThisWeek(date)) return format(date, "EEEE, h:mm a");
  return format(date, "MMM d, h:mm a");
}

export function formatDateShort(date: Date): string {
  return format(date, "MMM d");
}

export function formatTimeRange(start: Date, end: Date): string {
  return `${format(start, "h:mm a")} – ${format(end, "h:mm a")}`;
}

export function timeAgo(date: Date): string {
  return formatDistanceToNow(date, { addSuffix: true });
}

export function greeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}

import { toZonedTime, fromZonedTime } from "date-fns-tz";
import { addDays, addMonths } from "date-fns";

const SCHOOL_TIME_ZONE = "America/Vancouver";

// The school's own "wall clock now" — a Date object whose LOCAL getters
// (getFullYear/getMonth/getDate/getHours, and anything built on them like
// date-fns' isSameDay/isSameWeek) read out Pacific time, regardless of what
// timezone the server process itself runs in. Vercel's Node runtime
// defaults to UTC, which is 7-8 hours ahead of Pacific: for roughly the
// last third of every school day (Pacific late afternoon through
// midnight), a plain `new Date()` has already rolled over to *tomorrow* in
// UTC, so `.getHours()`/`.getDate()` — and isToday()/isTomorrow(), which
// use `new Date()` internally — silently read out tomorrow's hour/day.
//
// SAFE to compare (via isSameDay/isSameWeek/addDays/etc.) against another
// value that went through this same conversion — including a real database
// timestamp passed through `toSchoolZone()` below, or a pure calendar-grid
// placeholder Date (e.g. from eachDayOfInterval/parseISO of a date-only
// string, which carry no real timezone meaning of their own).
// UNSAFE to compare directly against a raw real timestamp (an Event's
// startAt, a Notification's createdAt) without first passing it through
// `toSchoolZone()` — the two use different effective timezones and will
// silently disagree near local midnight.
export function schoolNow(): Date {
  return toZonedTime(new Date(), SCHOOL_TIME_ZONE);
}

// Converts a real timestamp into the same "fake local" representation as
// schoolNow(), so it can be safely compared against schoolNow() (or another
// toSchoolZone() result) with isSameDay/isSameWeek/etc.
export function toSchoolZone(date: Date): Date {
  return toZonedTime(date, SCHOOL_TIME_ZONE);
}

// The reverse of schoolNow()/toSchoolZone(): takes a wall-clock date/time as
// the school would read it on its own clock (e.g. schoolNow() with the
// hours set to 23:59:59.999 for "end of today") and returns the real
// absolute UTC instant that corresponds to, correctly accounting for
// Pacific's DST offset. Use this whenever the result needs to be compared
// against — or stored alongside — real timestamp columns (e.g. building an
// "end of today" cutoff for an `Event.startAt` query).
export function fromSchoolZone(wallClockDate: Date): Date {
  return fromZonedTime(wallClockDate, SCHOOL_TIME_ZONE);
}

// A date ("2026-10-10") and time ("15:30") exactly as typed into a form mean
// the school's own clock. `new Date("2026-10-10T15:30")` reads them in the
// *server's* timezone instead — UTC on Vercel — so a 3:30 PM event used to be
// stored as 3:30 PM UTC (8:30 AM Pacific). Returns an Invalid Date (NaN) for
// malformed input so callers can keep their existing isNaN check.
export function schoolWallClockToInstant(date: string, time = "00:00", dayOffset = 0): Date {
  const d = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date);
  const t = /^(\d{2}):(\d{2})(?::(\d{2}))?$/.exec(time);
  if (!d || !t) return new Date(NaN);
  // UTC arithmetic just to roll the calendar date — no timezone meaning.
  const rolled = new Date(Date.UTC(Number(d[1]), Number(d[2]) - 1, Number(d[3]) + dayOffset)).toISOString().slice(0, 10);
  return fromZonedTime(`${rolled}T${t[1]}:${t[2]}:${t[3] ?? "00"}`, SCHOOL_TIME_ZONE);
}

// "2026-10-10" + N days/weeks/months -> a "yyyy-MM-dd" string, done on a
// midday-UTC anchor so a DST shift in whatever timezone this process runs in
// can never roll it onto a neighbouring date. Month steps clamp the way
// date-fns' addMonths does (Jan 31 + 1 month = Feb 28).
export function addToSchoolDate(date: string, unit: "day" | "week" | "month", amount: number): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date);
  if (!m) return date;
  const anchor = new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3]), 12));
  const next = unit === "month" ? addMonths(anchor, amount) : addDays(anchor, unit === "week" ? amount * 7 : amount);
  return next.toISOString().slice(0, 10);
}

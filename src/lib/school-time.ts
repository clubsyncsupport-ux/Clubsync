import { toZonedTime, fromZonedTime } from "date-fns-tz";

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

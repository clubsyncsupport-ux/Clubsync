import "server-only";
import { db } from "@/lib/db";

// Hugh Boyd's fixed bell-time templates (confirmed against the school's own
// published Bell Schedule page, 2026-2027 year). Which template applies on a
// given date is read off that day's SchoolCalendarEvent rows (see below) —
// not guessed purely from the day of the week — so a Pro-D day, a
// Collaboration Day, or any other exception is handled correctly without a
// separate holiday calendar.
export type BellSlot = { name: string; start: string; end: string; isBlock: boolean };

const MWF_TEMPLATE: BellSlot[] = [
  { name: "Warning Bell", start: "8:25", end: "8:25", isBlock: false },
  { name: "Block", start: "8:30", end: "9:51", isBlock: true },
  { name: "Block", start: "10:00", end: "11:21", isBlock: true },
  { name: "Block", start: "11:30", end: "12:51", isBlock: true },
  { name: "Lunch", start: "12:51", end: "1:39", isBlock: false },
  { name: "Block", start: "1:39", end: "3:00", isBlock: true },
];

const TTH_TEMPLATE: BellSlot[] = [
  { name: "Warning Bell", start: "8:25", end: "8:25", isBlock: false },
  { name: "Block", start: "8:30", end: "9:36", isBlock: true },
  { name: "Personal Learning Time (PLT)", start: "9:41", end: "10:41", isBlock: false },
  { name: "Block", start: "10:46", end: "11:52", isBlock: true },
  { name: "Break", start: "11:52", end: "12:03", isBlock: false },
  { name: "Block", start: "12:03", end: "1:09", isBlock: true },
  { name: "Lunch", start: "1:09", end: "1:54", isBlock: false },
  { name: "Block", start: "1:54", end: "3:00", isBlock: true },
];

// Collaboration Day's own letter order is fixed by the school (B, A, D, C —
// not a rotating code), so no day-type label parsing is needed for it.
const COLLAB_TEMPLATE: (BellSlot & { letter?: string })[] = [
  { name: "Staff Collaboration Time", start: "8:30", end: "9:30", isBlock: false },
  { name: "Warning Bell", start: "9:30", end: "9:30", isBlock: false },
  { name: "Block", start: "9:35", end: "10:41", isBlock: true, letter: "B" },
  { name: "Block", start: "10:49", end: "11:55", isBlock: true, letter: "A" },
  { name: "Block", start: "12:03", end: "1:09", isBlock: true, letter: "D" },
  { name: "Lunch", start: "1:09", end: "1:54", isBlock: false },
  { name: "Block", start: "1:54", end: "3:00", isBlock: true, letter: "C" },
];

export type TodaysSchedule =
  | { status: "SCHOOL_DAY"; dayLabel: string; slots: (BellSlot & { letter?: string })[] }
  | { status: "NO_SCHOOL"; reason: string }
  | { status: "UNKNOWN" };

function isPltLabel(title: string): boolean {
  return /\(PLT\)/i.test(title);
}

function extractLetters(title: string): string[] {
  return title.replace(/\(PLT\)/i, "").match(/[A-D]/gi)?.map((l) => l.toUpperCase()) ?? [];
}

function computeScheduleForDay(events: { title: string; category: string }[], date: Date): TodaysSchedule {
  const noSchool = events.find((e) => e.category === "PRO_D" || e.category === "SCHOOL_CLOSED");
  if (noSchool) return { status: "NO_SCHOOL", reason: noSchool.title };

  if (events.some((e) => e.category === "COLLABORATION_DAY")) {
    return { status: "SCHOOL_DAY", dayLabel: "Collaboration Day", slots: COLLAB_TEMPLATE };
  }

  const scheduleLabel = events.find((e) => e.category === "SCHEDULE");
  if (scheduleLabel) {
    const template = isPltLabel(scheduleLabel.title) ? TTH_TEMPLATE : MWF_TEMPLATE;
    const letters = extractLetters(scheduleLabel.title);
    let letterIndex = 0;
    const slots = template.map((slot) => (slot.isBlock ? { ...slot, letter: letters[letterIndex++] } : slot));
    return { status: "SCHOOL_DAY", dayLabel: scheduleLabel.title.toUpperCase(), slots };
  }

  const day = date.getDay();
  if (day === 0 || day === 6) return { status: "NO_SCHOOL", reason: "Weekend" };
  // A weekday with no matching calendar data (outside the imported school
  // year, or a genuine gap) — show nothing rather than guess.
  return { status: "UNKNOWN" };
}

export async function getTodaysSchedule(schoolId: string, date: Date): Promise<TodaysSchedule> {
  const dayStart = new Date(date);
  dayStart.setHours(0, 0, 0, 0);
  const dayEnd = new Date(dayStart);
  dayEnd.setDate(dayEnd.getDate() + 1);

  const events = await db.schoolCalendarEvent.findMany({
    where: { schoolId, date: { gte: dayStart, lt: dayEnd } },
    select: { title: true, category: true },
  });

  return computeScheduleForDay(events, date);
}

function dateKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

// Batched variant of getTodaysSchedule for a whole visible calendar range (a
// month/week/agenda view) — one query for every day at once instead of one
// query per day, keyed by the same "yyyy-MM-dd" format date-fns' `format`
// produces so callers can look a day up with `schedules.get(format(day,
// "yyyy-MM-dd"))`.
export async function getSchedulesForRange(schoolId: string, start: Date, end: Date): Promise<Map<string, TodaysSchedule>> {
  const rangeStart = new Date(start.getFullYear(), start.getMonth(), start.getDate());
  const rangeEndExclusive = new Date(end.getFullYear(), end.getMonth(), end.getDate() + 1);

  const events = await db.schoolCalendarEvent.findMany({
    where: { schoolId, date: { gte: rangeStart, lt: rangeEndExclusive } },
    select: { title: true, category: true, date: true },
  });

  const byDay = new Map<string, { title: string; category: string }[]>();
  for (const e of events) {
    const key = dateKey(e.date);
    if (!byDay.has(key)) byDay.set(key, []);
    byDay.get(key)!.push(e);
  }

  const result = new Map<string, TodaysSchedule>();
  for (let d = new Date(rangeStart); d < rangeEndExclusive; d.setDate(d.getDate() + 1)) {
    result.set(dateKey(d), computeScheduleForDay(byDay.get(dateKey(d)) ?? [], d));
  }
  return result;
}

// Which of today's blocks is happening right now, if any — purely for
// highlighting in the widget, not tied to any notification.
export function currentSlotIndex(slots: BellSlot[], now: Date): number | null {
  const minutesNow = now.getHours() * 60 + now.getMinutes();
  for (let i = 0; i < slots.length; i++) {
    const [sh, sm] = slots[i].start.split(":").map(Number);
    const [eh, em] = slots[i].end.split(":").map(Number);
    const start = sh * 60 + sm;
    const end = eh * 60 + em;
    if (minutesNow >= start && minutesNow < end) return i;
  }
  return null;
}

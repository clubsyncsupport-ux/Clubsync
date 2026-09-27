// One-off import: Hugh Boyd Secondary School publishes its school-year
// calendar (Pro-D days, Collaboration Days, parent-teacher conferences,
// assemblies, cultural observances, and the daily A/B/C/D rotation label) as
// a public iCal feed at https://boyd.sd38.bc.ca/calendar-feed.ics. This
// parses a saved snapshot of that feed (prisma/hugh-boyd-calendar-2026-2027.ics,
// fetched 2026-09-25) and loads it into SchoolCalendarEvent for the
// 2026-2027 school year — the source the bell-schedule widget and the
// student calendar view both read from.
//
// Run with: npx tsx prisma/import-school-calendar.ts
// Safe to re-run: clears this school's existing SchoolCalendarEvent rows
// first, so re-importing a refreshed feed snapshot doesn't duplicate rows.
import { PrismaClient } from "@prisma/client";
import fs from "fs";
import path from "path";

const db = new PrismaClient();

const SCHOOL_NAME = "Hugh Boyd Secondary School";
const ICS_PATH = path.join(__dirname, "hugh-boyd-calendar-2026-2027.ics");
const SCHOOL_YEAR_START = "2026-09-01";
const SCHOOL_YEAR_END = "2027-08-31";

function decodeHtmlEntities(s: string): string {
  return s
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&#39;/g, "'")
    .replace(/&quot;/g, '"');
}

function toISODate(v: string): string | null {
  const m = v.match(/^(\d{4})(\d{2})(\d{2})/);
  if (!m) return null;
  return `${m[1]}-${m[2]}-${m[3]}`;
}

type RawEvent = { date: string; endDate: string | null; title: string };

function parseIcs(raw: string): RawEvent[] {
  // Unfold RFC 5545 continuation lines (a line starting with a space/tab
  // continues the previous line) before splitting into logical lines.
  const unfolded = raw.replace(/\r\n/g, "\n").replace(/\n[ \t]/g, "");
  const lines = unfolded.split("\n");

  const events: RawEvent[] = [];
  let cur: { dtstart?: string; dtend?: string; summary?: string } | null = null;
  for (const line of lines) {
    if (line === "BEGIN:VEVENT") cur = {};
    else if (line === "END:VEVENT") {
      if (cur?.dtstart && cur.summary) {
        const date = toISODate(cur.dtstart);
        if (date) {
          events.push({
            date,
            endDate: cur.dtend ? toISODate(cur.dtend) : null,
            // The feed pads summaries with zero-width/BOM characters.
            title: decodeHtmlEntities(cur.summary.replace(/[​﻿]/g, "").trim()),
          });
        }
      }
      cur = null;
    } else if (cur) {
      const idx = line.indexOf(":");
      if (idx === -1) continue;
      const key = line.slice(0, idx);
      const value = line.slice(idx + 1);
      if (key.startsWith("DTSTART")) cur.dtstart = value;
      else if (key.startsWith("DTEND")) cur.dtend = value;
      else if (key === "SUMMARY") cur.summary = value;
    }
  }
  return events;
}

// A day-type/rotation label like "ABCD", "BADC", "A (PLT) BCD" — see
// src/lib/bell-schedule.ts, which reads exactly this category to figure out
// which bell-time template applies on a given date.
const SCHEDULE_LABEL = /^[A-D]{4}$/i;
const PLT_SCHEDULE_LABEL = /^[A-D]\s*\(PLT\)\s*[A-D]{3}$/i;

function categorize(title: string): string {
  if (SCHEDULE_LABEL.test(title) || PLT_SCHEDULE_LABEL.test(title)) return "SCHEDULE";
  if (/collaboration day/i.test(title)) return "COLLABORATION_DAY";
  if (/pro-?d day/i.test(title)) return "PRO_D";
  if (/school closed|no classes in session/i.test(title)) return "SCHOOL_CLOSED";
  if (/parent.*(teacher|evening|conference)/i.test(title)) return "PARENT_TEACHER";
  if (/\((judaism|islam|hinduism|sikhism|christianity|buddhism)|awareness|heritage|recognizes|history month|week \(/i.test(title)) {
    return "OBSERVANCE";
  }
  return "OTHER";
}

async function main() {
  const school = await db.school.findUnique({ where: { name: SCHOOL_NAME } });
  if (!school) {
    console.log(`No school named "${SCHOOL_NAME}" found — aborting.`);
    return;
  }

  const raw = fs.readFileSync(ICS_PATH, "utf8");
  const parsed = parseIcs(raw).filter((e) => e.date >= SCHOOL_YEAR_START && e.date <= SCHOOL_YEAR_END);

  const deleted = await db.schoolCalendarEvent.deleteMany({ where: { schoolId: school.id } });
  if (deleted.count > 0) console.log(`Cleared ${deleted.count} existing calendar event(s) for re-import.`);

  await db.schoolCalendarEvent.createMany({
    data: parsed.map((e) => ({
      schoolId: school.id,
      date: new Date(`${e.date}T00:00:00`),
      endDate: e.endDate ? new Date(`${e.endDate}T00:00:00`) : null,
      title: e.title,
      category: categorize(e.title),
    })),
  });

  const byCategory = parsed.reduce<Record<string, number>>((acc, e) => {
    const c = categorize(e.title);
    acc[c] = (acc[c] ?? 0) + 1;
    return acc;
  }, {});
  console.log(`Imported ${parsed.length} calendar events for ${SCHOOL_NAME} (2026-2027 school year).`);
  console.log("By category:", byCategory);
}

main().finally(() => db.$disconnect());

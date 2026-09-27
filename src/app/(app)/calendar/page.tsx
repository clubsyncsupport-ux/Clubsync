import type { Metadata } from "next";
import Link from "next/link";
import {
  addDays,
  addMonths,
  addWeeks,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameDay,
  isSameMonth,
  isToday,
  parseISO,
  startOfDay,
  startOfMonth,
  startOfWeek,
  subMonths,
  subWeeks,
} from "date-fns";
import { getViewer, requireStudentViewer } from "@/lib/viewer";
import { getVisibleEvents } from "@/lib/data/calendar";
import { getSchedulesForRange, currentSlotIndex, type TodaysSchedule } from "@/lib/bell-schedule";
import { getGoogleCalendarEvents } from "@/lib/google-calendar";
import { db } from "@/lib/db";
import { cn } from "@/lib/cn";
import { EventCard } from "@/components/event-card";
import { EmptyState } from "@/components/ui/empty-state";
import { Card, CardContent } from "@/components/ui/card";
import { ColorDot } from "@/components/ui/badge";
import { ClubFilterLegend } from "@/components/club-filter-legend";
import { ConnectGoogleCalendarPrompt } from "@/components/connect-google-calendar-prompt";
import { GOOGLE_CALENDAR_COLOR, GOOGLE_CALENDAR_LEGEND_ID, googleLegendEntry } from "@/components/all-clubs-calendar-view";
import { AddPersonalEvent } from "./add-personal-event";
import { PersonalEventRow } from "./personal-event-row";
import { ColorIndex } from "./color-index";

type ViewType = "month" | "week" | "day" | "agenda";
const PERSONAL_COLOR = "#6b7280";
const SCHOOL_EVENT_COLOR = "#ca8a04";
const SCHOOL_EVENTS_LEGEND_ID = "__school__";
const BELL_SCHEDULE_COLOR = "#475569";
const BELL_SCHEDULE_LEGEND_ID = "__bell__";

export const metadata: Metadata = { title: "Calendar" };

export default async function CalendarPage({
  searchParams,
}: {
  searchParams: Promise<{ view?: string; date?: string }>;
}) {
  const { view: rawView, date: rawDate } = await searchParams;
  const view: ViewType = (["month", "week", "day", "agenda"] as const).includes(rawView as ViewType) ? (rawView as ViewType) : "month";
  const refDate = rawDate ? startOfDay(parseISO(rawDate)) : startOfDay(new Date());

  const viewer = requireStudentViewer(await getViewer());
  const clubIds = viewer.memberships.map((m) => m.clubId);

  let rangeStart: Date;
  let rangeEnd: Date;
  if (view === "month") {
    rangeStart = startOfWeek(startOfMonth(refDate));
    rangeEnd = endOfWeek(endOfMonth(refDate));
  } else if (view === "week") {
    rangeStart = startOfWeek(refDate);
    rangeEnd = endOfWeek(refDate);
  } else if (view === "day") {
    rangeStart = refDate;
    rangeEnd = addDays(refDate, 1);
  } else {
    rangeStart = refDate;
    rangeEnd = addDays(refDate, 60);
  }

  const [clubEvents, personalEvents, categories, googleEvents, schoolEvents, schedules] = await Promise.all([
    clubIds.length ? getVisibleEvents(viewer.id, clubIds, rangeStart, rangeEnd) : Promise.resolve([]),
    db.personalEvent.findMany({
      where: { userId: viewer.id, startAt: { gte: rangeStart, lte: rangeEnd } },
      include: { category: true },
      orderBy: { startAt: "asc" },
    }),
    db.personalEventCategory.findMany({ where: { userId: viewer.id }, orderBy: { name: "asc" } }),
    viewer.googleCalendarRefreshToken
      ? getGoogleCalendarEvents(
          viewer.id,
          viewer.googleCalendarRefreshToken,
          rangeStart,
          rangeEnd,
          viewer.googleCalendarAccessToken,
          viewer.googleCalendarAccessTokenExpiresAt
        )
      : Promise.resolve([]),
    // "SCHEDULE" (the daily A/B/C/D rotation label) is excluded here — that's
    // purely backing data for the Home page's bell-schedule widget, not
    // something a student needs as its own calendar entry every school day.
    viewer.schoolId
      ? db.schoolCalendarEvent.findMany({
          where: { schoolId: viewer.schoolId, category: { not: "SCHEDULE" }, date: { gte: rangeStart, lte: rangeEnd } },
          orderBy: { date: "asc" },
        })
      : Promise.resolve([]),
    viewer.schoolId ? getSchedulesForRange(viewer.schoolId, rangeStart, rangeEnd) : Promise.resolve(new Map<string, TodaysSchedule>()),
  ]);

  const items: CalendarItem[] = [
    ...clubEvents.map((e) => {
      const isFull = e.maxParticipants != null && e._count.registrations >= e.maxParticipants;
      // Red is reserved to mean "full" — never a pickable club color — so a
      // full event's pill/dot always shows red regardless of its club's color.
      return { id: e.id, kind: "club" as const, title: e.title, startAt: e.startAt, color: isFull ? "var(--danger)" : e.club.color, isFull, event: e };
    }),
    ...personalEvents.map((e) => ({
      id: e.id,
      kind: "personal" as const,
      title: e.title,
      startAt: e.startAt,
      color: e.category?.color ?? PERSONAL_COLOR,
      personal: e,
    })),
    ...googleEvents.map((e) => ({ id: e.id, kind: "google" as const, title: e.title, startAt: e.startAt, color: GOOGLE_CALENDAR_COLOR })),
    ...schoolEvents.map((e) => ({ id: e.id, kind: "school" as const, title: e.title, startAt: e.date, color: SCHOOL_EVENT_COLOR })),
  ].sort((a, b) => a.startAt.getTime() - b.startAt.getTime());

  const { prevHref, nextHref, title } = getNav(view, refDate);
  const clubs: { id: string; name: string; color: string }[] = viewer.memberships.map((m) => m.club);
  if (viewer.googleCalendarRefreshToken) clubs.push(googleLegendEntry());
  if (schoolEvents.length > 0) clubs.push({ id: SCHOOL_EVENTS_LEGEND_ID, name: "School Calendar", color: SCHOOL_EVENT_COLOR });
  const hasBellSchedule = Array.from(schedules.values()).some((s) => s.status === "SCHOOL_DAY");
  if (hasBellSchedule) clubs.push({ id: BELL_SCHEDULE_LEGEND_ID, name: "Bell Schedule", color: BELL_SCHEDULE_COLOR });

  return (
    <div className="mx-auto max-w-4xl px-4 py-6 animate-fade-in">
      <h1 className="text-2xl font-bold tracking-tight text-text-primary">Calendar</h1>
      <div className="mt-3 flex flex-wrap gap-2">
        <AddPersonalEvent categories={categories} />
        <ColorIndex categories={categories} />
      </div>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Link href={prevHref} className="rounded-lg border border-border px-2.5 py-1.5 text-text-secondary hover:bg-surface-2">
            ‹
          </Link>
          <p className="min-w-40 text-center text-[15px] font-semibold text-text-primary">{title}</p>
          <Link href={nextHref} className="rounded-lg border border-border px-2.5 py-1.5 text-text-secondary hover:bg-surface-2">
            ›
          </Link>
          <Link href={`/calendar?view=${view}&date=${format(new Date(), "yyyy-MM-dd")}`} className="ml-1 rounded-lg border border-border px-3 py-1.5 text-sm font-medium text-text-secondary hover:bg-surface-2">
            Today
          </Link>
        </div>
        <div className="flex rounded-xl border border-border p-1">
          {(["month", "week", "day", "agenda"] as const).map((v) => (
            <Link
              key={v}
              href={`/calendar?view=${v}&date=${format(refDate, "yyyy-MM-dd")}`}
              className={cn(
                "rounded-lg px-3 py-1.5 text-sm font-medium capitalize transition-colors",
                view === v ? "bg-accent text-on-accent" : "text-text-secondary hover:bg-surface-2"
              )}
            >
              {v}
            </Link>
          ))}
        </div>
      </div>

      {(clubs.length > 0 || categories.length > 0) && (
        <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1.5">
          <ClubFilterLegend clubs={clubs} storageKey="clubsync_hidden_clubs_student_calendar" />
          {categories.map((c) => (
            <div key={c.id} className="flex items-center gap-1.5 text-xs text-text-secondary">
              <ColorDot color={c.color} />
              {c.name}
            </div>
          ))}
        </div>
      )}

      {!viewer.googleCalendarRefreshToken && (
        <div className="mt-3">
          <ConnectGoogleCalendarPrompt />
        </div>
      )}

      <div className="mt-5">
        {view === "month" && <MonthGrid refDate={refDate} items={items} schedules={schedules} />}
        {view === "week" && <WeekColumns refDate={refDate} items={items} schedules={schedules} />}
        {view === "day" && <DayList refDate={refDate} items={items} schedules={schedules} />}
        {view === "agenda" && <AgendaList items={items} schedules={schedules} />}
      </div>
    </div>
  );
}

function getNav(view: ViewType, refDate: Date) {
  if (view === "month") {
    return {
      prevHref: `/calendar?view=month&date=${format(subMonths(refDate, 1), "yyyy-MM-dd")}`,
      nextHref: `/calendar?view=month&date=${format(addMonths(refDate, 1), "yyyy-MM-dd")}`,
      title: format(refDate, "MMMM yyyy"),
    };
  }
  if (view === "week") {
    const start = startOfWeek(refDate);
    return {
      prevHref: `/calendar?view=week&date=${format(subWeeks(refDate, 1), "yyyy-MM-dd")}`,
      nextHref: `/calendar?view=week&date=${format(addWeeks(refDate, 1), "yyyy-MM-dd")}`,
      title: `${format(start, "MMM d")} – ${format(endOfWeek(refDate), "MMM d")}`,
    };
  }
  if (view === "day") {
    return {
      prevHref: `/calendar?view=day&date=${format(addDays(refDate, -1), "yyyy-MM-dd")}`,
      nextHref: `/calendar?view=day&date=${format(addDays(refDate, 1), "yyyy-MM-dd")}`,
      title: format(refDate, "EEEE, MMM d"),
    };
  }
  return {
    prevHref: `/calendar?view=agenda&date=${format(refDate, "yyyy-MM-dd")}`,
    nextHref: `/calendar?view=agenda&date=${format(refDate, "yyyy-MM-dd")}`,
    title: "Upcoming",
  };
}

type ClubEventWithClub = Awaited<ReturnType<typeof getVisibleEvents>>[number];
type PersonalEventData = {
  id: string;
  title: string;
  startAt: Date;
  endAt: Date;
  location: string | null;
  category: { name: string; color: string } | null;
};

type CalendarItem =
  | { id: string; kind: "club"; title: string; startAt: Date; color: string; isFull: boolean; event: ClubEventWithClub }
  | { id: string; kind: "personal"; title: string; startAt: Date; color: string; personal: PersonalEventData }
  | { id: string; kind: "google"; title: string; startAt: Date; color: string }
  | { id: string; kind: "school"; title: string; startAt: Date; color: string };

function CalendarItemRow({ item }: { item: CalendarItem }) {
  if (item.kind === "club") return <EventCard event={item.event} full={item.isFull} />;
  if (item.kind === "personal") return <PersonalEventRow event={item.personal} />;
  const label = item.kind === "google" ? "Google Calendar" : "School";
  const dataAttr = item.kind === "google" ? GOOGLE_CALENDAR_LEGEND_ID : SCHOOL_EVENTS_LEGEND_ID;
  return (
    <div data-club-id={dataAttr} className="flex items-center gap-3 rounded-2xl border border-dashed border-border-strong bg-surface-1 p-4">
      <div className="h-11 w-1.5 shrink-0 rounded-full border border-black/15" style={{ backgroundColor: item.color }} />
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5 text-xs font-medium text-text-secondary">
          <span className="inline-block h-2.5 w-2.5 shrink-0 rounded-full border border-black/15" style={{ backgroundColor: item.color }} />
          <span className="truncate">{label}</span>
        </div>
        <p className="mt-0.5 truncate font-semibold text-text-primary">{item.title}</p>
        <p className="mt-0.5 text-sm text-text-secondary">{format(item.startAt, "MMM d, h:mm a")}</p>
      </div>
    </div>
  );
}

function MonthGrid({ refDate, items, schedules }: { refDate: Date; items: CalendarItem[]; schedules: Map<string, TodaysSchedule> }) {
  const days = eachDayOfInterval({ start: startOfWeek(startOfMonth(refDate)), end: endOfWeek(endOfMonth(refDate)) });
  const itemsByDay = new Map<string, CalendarItem[]>();
  for (const it of items) {
    const key = format(it.startAt, "yyyy-MM-dd");
    if (!itemsByDay.has(key)) itemsByDay.set(key, []);
    itemsByDay.get(key)!.push(it);
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-border">
      <div className="grid grid-cols-7 border-b border-border bg-surface-1 text-center text-xs font-semibold text-text-muted">
        {["S", "M", "T", "W", "T", "F", "S"].map((d, i) => (
          <div key={i} className="py-2">
            {d}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7">
        {days.map((day) => {
          const key = format(day, "yyyy-MM-dd");
          const dayItems = itemsByDay.get(key) ?? [];
          const schedule = schedules.get(key);
          return (
            <Link
              href={`/calendar?view=day&date=${key}`}
              key={key}
              className={cn(
                "min-h-20 border-b border-r border-border p-1.5 text-left transition-colors hover:bg-surface-2 sm:min-h-24 sm:p-2",
                !isSameMonth(day, refDate) && "bg-surface-0/50 opacity-40"
              )}
            >
              <div className="flex items-center gap-1">
                <span
                  className={cn(
                    "inline-flex h-6 w-6 items-center justify-center rounded-full text-xs font-medium",
                    isToday(day) ? "bg-accent text-on-accent" : "text-text-secondary"
                  )}
                >
                  {format(day, "d")}
                </span>
                {schedule?.status === "SCHOOL_DAY" && (
                  <span
                    data-club-id={BELL_SCHEDULE_LEGEND_ID}
                    title={schedule.dayLabel}
                    className="min-w-0 truncate rounded px-1 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-white sm:text-[10px]"
                    style={{ backgroundColor: BELL_SCHEDULE_COLOR }}
                  >
                    {schedule.dayLabel === "Collaboration Day" ? "Collab" : schedule.dayLabel}
                  </span>
                )}
              </div>
              <div className="mt-1 space-y-0.5">
                {dayItems.slice(0, 3).map((it) => (
                  <div
                    key={it.id}
                    data-club-id={
                      it.kind === "club" ? it.event.club.id : it.kind === "google" ? GOOGLE_CALENDAR_LEGEND_ID : it.kind === "school" ? SCHOOL_EVENTS_LEGEND_ID : undefined
                    }
                    className={cn(
                      "truncate rounded px-1 py-0.5 text-[10px] font-medium sm:text-[11px]",
                      it.kind === "google" ? "border border-dashed border-black/15" : "text-white",
                      it.kind === "personal" && "border border-dashed border-white/60"
                    )}
                    style={{ backgroundColor: it.color, color: it.kind === "google" ? "#111827" : undefined }}
                    title={it.kind === "school" ? `School: ${it.title}` : undefined}
                  >
                    {it.title}
                  </div>
                ))}
                {dayItems.length > 3 && <div className="text-[10px] text-text-muted">+{dayItems.length - 3} more</div>}
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}

function WeekColumns({ refDate, items, schedules }: { refDate: Date; items: CalendarItem[]; schedules: Map<string, TodaysSchedule> }) {
  const days = eachDayOfInterval({ start: startOfWeek(refDate), end: endOfWeek(refDate) });
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-7">
      {days.map((day) => {
        const dayItems = items.filter((it) => isSameDay(it.startAt, day));
        const schedule = schedules.get(format(day, "yyyy-MM-dd"));
        return (
          <div key={day.toISOString()} className="rounded-xl border border-border p-2">
            <p className={cn("mb-2 text-center text-xs font-semibold", isToday(day) ? "text-accent" : "text-text-muted")}>
              {format(day, "EEE d")}
            </p>
            {schedule?.status === "SCHOOL_DAY" && (
              <div data-club-id={BELL_SCHEDULE_LEGEND_ID} className="mb-1.5 space-y-0.5 rounded-lg border border-dashed p-1.5" style={{ borderColor: BELL_SCHEDULE_COLOR }}>
                <p className="truncate text-center text-[10px] font-semibold uppercase tracking-wide" style={{ color: BELL_SCHEDULE_COLOR }} title={schedule.dayLabel}>
                  {schedule.dayLabel}
                </p>
                {schedule.slots
                  .filter((s) => s.isBlock)
                  .map((slot, i) => (
                    <div key={i} className="flex items-center justify-between text-[10px] text-text-secondary">
                      <span>Block {slot.letter}</span>
                      <span className="tabular-nums">{slot.start}</span>
                    </div>
                  ))}
              </div>
            )}
            <div className="space-y-1.5">
              {dayItems.length === 0 && <p className="text-center text-[11px] text-text-muted">—</p>}
              {dayItems.map((it) =>
                it.kind === "club" ? (
                  <Link
                    key={it.id}
                    href={`/events/${it.id}`}
                    data-club-id={it.event.club.id}
                    className="block truncate rounded-lg px-2 py-1 text-[11px] font-medium text-white"
                    style={{ backgroundColor: it.color }}
                    title={it.title}
                  >
                    {format(it.startAt, "h:mm a")} {it.title}
                  </Link>
                ) : it.kind === "google" ? (
                  <div
                    key={it.id}
                    data-club-id={GOOGLE_CALENDAR_LEGEND_ID}
                    className="truncate rounded-lg border border-dashed border-black/15 px-2 py-1 text-[11px] font-medium"
                    style={{ backgroundColor: it.color, color: "#111827" }}
                    title={it.title}
                  >
                    {format(it.startAt, "h:mm a")} {it.title}
                  </div>
                ) : it.kind === "school" ? (
                  <div
                    key={it.id}
                    data-club-id={SCHOOL_EVENTS_LEGEND_ID}
                    className="truncate rounded-lg px-2 py-1 text-[11px] font-medium text-white"
                    style={{ backgroundColor: it.color }}
                    title={it.title}
                  >
                    {it.title}
                  </div>
                ) : (
                  <div
                    key={it.id}
                    className="truncate rounded-lg border border-dashed border-white/60 px-2 py-1 text-[11px] font-medium text-white"
                    style={{ backgroundColor: it.color }}
                    title={it.title}
                  >
                    {format(it.startAt, "h:mm a")} {it.title}
                  </div>
                )
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function DayBellSchedule({ refDate, schedule }: { refDate: Date; schedule: TodaysSchedule | undefined }) {
  if (schedule?.status !== "SCHOOL_DAY") return null;
  const current = isToday(refDate) ? currentSlotIndex(schedule.slots, new Date()) : null;
  return (
    <div data-club-id={BELL_SCHEDULE_LEGEND_ID}>
      <Card>
        <CardContent className="p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-text-muted">Bell Schedule</p>
          <p className="mt-0.5 text-sm font-medium text-text-primary">{schedule.dayLabel}</p>
          <div className="mt-3 divide-y divide-border">
            {schedule.slots.map((slot, i) => (
              <div key={i} className={cn("flex items-center justify-between py-1.5", i === current ? "text-accent" : "text-text-secondary")}>
                <span className="text-sm font-medium">{slot.isBlock ? `Block ${slot.letter ?? ""}`.trim() : slot.name}</span>
                <span className="text-xs tabular-nums">{slot.start === slot.end ? slot.start : `${slot.start} – ${slot.end}`}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function DayList({ refDate, items, schedules }: { refDate: Date; items: CalendarItem[]; schedules: Map<string, TodaysSchedule> }) {
  const dayItems = items.filter((it) => isSameDay(it.startAt, refDate));
  const schedule = schedules.get(format(refDate, "yyyy-MM-dd"));
  return (
    <div className="space-y-2">
      <DayBellSchedule refDate={refDate} schedule={schedule} />
      {dayItems.length === 0 ? (
        <Card>
          <EmptyState icon="📅" title="Nothing scheduled" description="No events on this day." />
        </Card>
      ) : (
        dayItems.map((it) => <CalendarItemRow key={it.id} item={it} />)
      )}
    </div>
  );
}

function AgendaList({ items, schedules }: { items: CalendarItem[]; schedules: Map<string, TodaysSchedule> }) {
  if (items.length === 0) {
    return (
      <Card>
        <EmptyState icon="📅" title="You're all caught up!" description="No upcoming events in the next 60 days." />
      </Card>
    );
  }
  const byDay = new Map<string, CalendarItem[]>();
  for (const it of items) {
    const key = format(it.startAt, "yyyy-MM-dd");
    if (!byDay.has(key)) byDay.set(key, []);
    byDay.get(key)!.push(it);
  }
  return (
    <div className="space-y-5">
      {Array.from(byDay.entries()).map(([key, dayItems]) => {
        const schedule = schedules.get(key);
        return (
          <div key={key}>
            <p className="mb-2 flex items-center gap-2 text-sm font-semibold text-text-secondary">
              {format(parseISO(key), "EEEE, MMMM d")}
              {schedule?.status === "SCHOOL_DAY" && (
                <span
                  data-club-id={BELL_SCHEDULE_LEGEND_ID}
                  className="rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white"
                  style={{ backgroundColor: BELL_SCHEDULE_COLOR }}
                >
                  {schedule.dayLabel}
                </span>
              )}
            </p>
            <div className="space-y-2">
              {dayItems.map((it) => (
                <CalendarItemRow key={it.id} item={it} />
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

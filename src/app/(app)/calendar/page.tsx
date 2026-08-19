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
import { getViewer } from "@/lib/viewer";
import { getVisibleEvents } from "@/lib/data/calendar";
import { db } from "@/lib/db";
import { cn } from "@/lib/cn";
import { EventCard } from "@/components/event-card";
import { EmptyState } from "@/components/ui/empty-state";
import { Card } from "@/components/ui/card";
import { ColorDot } from "@/components/ui/badge";
import { ClubFilterLegend } from "@/components/club-filter-legend";
import { AddPersonalEvent } from "./add-personal-event";
import { PersonalEventRow } from "./personal-event-row";
import { ColorIndex } from "./color-index";

type ViewType = "month" | "week" | "day" | "agenda";
const PERSONAL_COLOR = "#6b7280";

export const metadata: Metadata = { title: "Calendar" };

export default async function CalendarPage({
  searchParams,
}: {
  searchParams: Promise<{ view?: string; date?: string }>;
}) {
  const { view: rawView, date: rawDate } = await searchParams;
  const view: ViewType = (["month", "week", "day", "agenda"] as const).includes(rawView as ViewType) ? (rawView as ViewType) : "month";
  const refDate = rawDate ? startOfDay(parseISO(rawDate)) : startOfDay(new Date());

  const viewer = await getViewer();
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

  const [clubEvents, personalEvents, categories] = await Promise.all([
    clubIds.length ? getVisibleEvents(viewer.id, clubIds, rangeStart, rangeEnd) : Promise.resolve([]),
    db.personalEvent.findMany({
      where: { userId: viewer.id, startAt: { gte: rangeStart, lte: rangeEnd } },
      include: { category: true },
      orderBy: { startAt: "asc" },
    }),
    db.personalEventCategory.findMany({ where: { userId: viewer.id }, orderBy: { name: "asc" } }),
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
  ].sort((a, b) => a.startAt.getTime() - b.startAt.getTime());

  const { prevHref, nextHref, title } = getNav(view, refDate);
  const clubs = viewer.memberships.map((m) => m.club);

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

      <div className="mt-5">
        {view === "month" && <MonthGrid refDate={refDate} items={items} />}
        {view === "week" && <WeekColumns refDate={refDate} items={items} />}
        {view === "day" && <DayList refDate={refDate} items={items} />}
        {view === "agenda" && <AgendaList items={items} />}
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
  | { id: string; kind: "personal"; title: string; startAt: Date; color: string; personal: PersonalEventData };

function MonthGrid({ refDate, items }: { refDate: Date; items: CalendarItem[] }) {
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
          return (
            <Link
              href={`/calendar?view=day&date=${key}`}
              key={key}
              className={cn(
                "min-h-20 border-b border-r border-border p-1.5 text-left transition-colors hover:bg-surface-2 sm:min-h-24 sm:p-2",
                !isSameMonth(day, refDate) && "bg-surface-0/50 opacity-40"
              )}
            >
              <span
                className={cn(
                  "inline-flex h-6 w-6 items-center justify-center rounded-full text-xs font-medium",
                  isToday(day) ? "bg-accent text-on-accent" : "text-text-secondary"
                )}
              >
                {format(day, "d")}
              </span>
              <div className="mt-1 space-y-0.5">
                {dayItems.slice(0, 3).map((it) => (
                  <div
                    key={it.id}
                    data-club-id={it.kind === "club" ? it.event.club.id : undefined}
                    className={cn(
                      "truncate rounded px-1 py-0.5 text-[10px] font-medium text-white sm:text-[11px]",
                      it.kind === "personal" && "border border-dashed border-white/60"
                    )}
                    style={{ backgroundColor: it.color }}
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

function WeekColumns({ refDate, items }: { refDate: Date; items: CalendarItem[] }) {
  const days = eachDayOfInterval({ start: startOfWeek(refDate), end: endOfWeek(refDate) });
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-7">
      {days.map((day) => {
        const dayItems = items.filter((it) => isSameDay(it.startAt, day));
        return (
          <div key={day.toISOString()} className="rounded-xl border border-border p-2">
            <p className={cn("mb-2 text-center text-xs font-semibold", isToday(day) ? "text-accent" : "text-text-muted")}>
              {format(day, "EEE d")}
            </p>
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

function DayList({ refDate, items }: { refDate: Date; items: CalendarItem[] }) {
  const dayItems = items.filter((it) => isSameDay(it.startAt, refDate));
  if (dayItems.length === 0) {
    return (
      <Card>
        <EmptyState icon="📅" title="Nothing scheduled" description="No events on this day." />
      </Card>
    );
  }
  return (
    <div className="space-y-2">
      {dayItems.map((it) =>
        it.kind === "club" ? <EventCard key={it.id} event={it.event} full={it.isFull} /> : <PersonalEventRow key={it.id} event={it.personal} />
      )}
    </div>
  );
}

function AgendaList({ items }: { items: CalendarItem[] }) {
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
      {Array.from(byDay.entries()).map(([key, dayItems]) => (
        <div key={key}>
          <p className="mb-2 text-sm font-semibold text-text-secondary">{format(parseISO(key), "EEEE, MMMM d")}</p>
          <div className="space-y-2">
            {dayItems.map((it) =>
              it.kind === "club" ? <EventCard key={it.id} event={it.event} full={it.isFull} /> : <PersonalEventRow key={it.id} event={it.personal} />
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

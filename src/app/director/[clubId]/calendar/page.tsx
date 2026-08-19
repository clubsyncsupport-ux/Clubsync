import type { Metadata } from "next";
import Link from "next/link";
import {
  addDays,
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameMonth,
  isToday,
  parseISO,
  startOfDay,
  startOfMonth,
  startOfWeek,
  subMonths,
} from "date-fns";
import { getDirectorContext } from "@/lib/director";
import { db } from "@/lib/db";
import { cn } from "@/lib/cn";
import { EmptyState } from "@/components/ui/empty-state";
import { Card } from "@/components/ui/card";
import { ClubFilterLegend } from "@/components/club-filter-legend";

type ViewType = "month" | "agenda";

export const metadata: Metadata = { title: "All Clubs Calendar" };

export default async function AllClubsCalendarPage({
  params,
  searchParams,
}: {
  params: Promise<{ clubId: string }>;
  searchParams: Promise<{ view?: string; date?: string }>;
}) {
  const { clubId } = await params;
  const { club } = await getDirectorContext(clubId);
  const { view: rawView, date: rawDate } = await searchParams;
  const view: ViewType = rawView === "agenda" ? "agenda" : "month";
  const refDate = rawDate ? startOfDay(parseISO(rawDate)) : startOfDay(new Date());

  const rangeStart = view === "month" ? startOfWeek(startOfMonth(refDate)) : refDate;
  const rangeEnd = view === "month" ? endOfWeek(endOfMonth(refDate)) : addDays(refDate, 45);

  const events = await db.event.findMany({
    where: {
      status: { not: "CANCELLED" },
      startAt: { gte: rangeStart, lte: rangeEnd },
      club: { schoolId: club.schoolId, status: "ACTIVE" },
      visibility: "PUBLIC",
    },
    include: { club: true },
    orderBy: { startAt: "asc" },
  });

  const prevHref = `/director/${clubId}/calendar?view=${view}&date=${format(subMonths(refDate, 1), "yyyy-MM-dd")}`;
  const nextHref = `/director/${clubId}/calendar?view=${view}&date=${format(addMonths(refDate, 1), "yyyy-MM-dd")}`;
  const todayHref = `/director/${clubId}/calendar?view=${view}&date=${format(new Date(), "yyyy-MM-dd")}`;

  return (
    <div className="mx-auto max-w-4xl px-4 py-6 animate-fade-in">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-text-primary">All Clubs Calendar</h1>
          <p className="mt-1 text-[15px] text-text-secondary">
            Every scheduled meeting and event across every club at your school — check here before you book a time so you
            don&rsquo;t double-book a room or compete with another club&rsquo;s meeting.
          </p>
        </div>
        <Link
          href={`/director/${clubId}/events/new`}
          className="shrink-0 rounded-xl bg-accent px-4 py-2 text-sm font-medium text-on-accent hover:bg-accent-hover"
        >
          + Add Event
        </Link>
      </div>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Link href={prevHref} className="rounded-lg border border-border px-2.5 py-1.5 text-text-secondary hover:bg-surface-2">
            ‹
          </Link>
          <p className="min-w-40 text-center text-[15px] font-semibold text-text-primary">
            {view === "month" ? format(refDate, "MMMM yyyy") : "Upcoming (45 days)"}
          </p>
          <Link href={nextHref} className="rounded-lg border border-border px-2.5 py-1.5 text-text-secondary hover:bg-surface-2">
            ›
          </Link>
          <Link href={todayHref} className="ml-1 rounded-lg border border-border px-3 py-1.5 text-sm font-medium text-text-secondary hover:bg-surface-2">
            Today
          </Link>
        </div>
        <div className="flex rounded-xl border border-border p-1">
          {(["month", "agenda"] as const).map((v) => (
            <Link
              key={v}
              href={`/director/${clubId}/calendar?view=${v}&date=${format(refDate, "yyyy-MM-dd")}`}
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

      <div className="mt-5">
        <ClubFilterLegend
          clubs={Array.from(new Map(events.map((e) => [e.club.id, e.club])).values())}
          storageKey="clubsync_hidden_clubs_calendar"
        />
      </div>

      <div className="mt-5">
        {view === "month" ? (
          <MonthGrid refDate={refDate} events={events} currentClubId={clubId} />
        ) : (
          <AgendaList events={events} currentClubId={clubId} />
        )}
      </div>
    </div>
  );
}

type EventWithClub = { id: string; title: string; startAt: Date; club: { id: string; name: string; color: string } };

// Directors get the full management view for their own club's events; for
// every other club on this shared calendar they get the general event page
// (same one students use) — which correctly shows "not found" if they're not
// a member there, preserving that club's existing privacy boundary.
function eventHref(e: EventWithClub, currentClubId: string) {
  return e.club.id === currentClubId ? `/director/${currentClubId}/events/${e.id}` : `/events/${e.id}`;
}

function MonthGrid({ refDate, events, currentClubId }: { refDate: Date; events: EventWithClub[]; currentClubId: string }) {
  const days = eachDayOfInterval({ start: startOfWeek(startOfMonth(refDate)), end: endOfWeek(endOfMonth(refDate)) });
  const eventsByDay = new Map<string, EventWithClub[]>();
  for (const e of events) {
    const key = format(e.startAt, "yyyy-MM-dd");
    if (!eventsByDay.has(key)) eventsByDay.set(key, []);
    eventsByDay.get(key)!.push(e);
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
          const dayEvents = eventsByDay.get(key) ?? [];
          const hasConflict = dayEvents.length > 1 && new Set(dayEvents.map((e) => format(e.startAt, "HH:mm"))).size < dayEvents.length;
          return (
            <div
              key={key}
              className={cn(
                "min-h-20 border-b border-r border-border p-1.5 text-left sm:min-h-24 sm:p-2",
                !isSameMonth(day, refDate) && "bg-surface-0/50 opacity-40"
              )}
            >
              <div className="flex items-center justify-between">
                <span
                  className={cn(
                    "inline-flex h-6 w-6 items-center justify-center rounded-full text-xs font-medium",
                    isToday(day) ? "bg-accent text-on-accent" : "text-text-secondary"
                  )}
                >
                  {format(day, "d")}
                </span>
                {hasConflict && <span title="Multiple clubs meeting at the same time">⚠️</span>}
              </div>
              <div className="mt-1 space-y-0.5">
                {dayEvents.slice(0, 3).map((e) => (
                  <Link
                    key={e.id}
                    href={eventHref(e, currentClubId)}
                    data-club-id={e.club.id}
                    title={`${e.club.name} · ${format(e.startAt, "h:mm a")} — ${e.title}`}
                    className="block truncate rounded px-1 py-0.5 text-[10px] font-medium text-white hover:opacity-80 sm:text-[11px]"
                    style={{ backgroundColor: e.club.color }}
                  >
                    {format(e.startAt, "h:mm a")} {e.title}
                  </Link>
                ))}
                {dayEvents.length > 3 && <div className="text-[10px] text-text-muted">+{dayEvents.length - 3} more</div>}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function AgendaList({ events, currentClubId }: { events: EventWithClub[]; currentClubId: string }) {
  if (events.length === 0) {
    return (
      <Card>
        <EmptyState icon="📅" title="Nothing scheduled" description="No club events in this window yet." />
      </Card>
    );
  }
  const byDay = new Map<string, EventWithClub[]>();
  for (const e of events) {
    const key = format(e.startAt, "yyyy-MM-dd");
    if (!byDay.has(key)) byDay.set(key, []);
    byDay.get(key)!.push(e);
  }
  return (
    <div className="space-y-5">
      {Array.from(byDay.entries()).map(([key, dayEvents]) => (
        <div key={key}>
          <p className="mb-2 text-sm font-semibold text-text-secondary">{format(parseISO(key), "EEEE, MMMM d")}</p>
          <div className="space-y-2">
            {dayEvents.map((e) => (
              <Link key={e.id} href={eventHref(e, currentClubId)} data-club-id={e.club.id} className="block">
                <Card className="transition-colors hover:border-border-strong">
                  <div className="flex items-center gap-3 p-3">
                    <div className="h-9 w-1.5 shrink-0 rounded-full" style={{ backgroundColor: e.club.color }} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-text-primary">{e.title}</p>
                      <p className="text-xs text-text-secondary">
                        {e.club.name} · {format(e.startAt, "h:mm a")}
                      </p>
                    </div>
                  </div>
                </Card>
              </Link>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

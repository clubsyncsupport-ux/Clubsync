import Link from "next/link";
import { eachDayOfInterval, endOfMonth, endOfWeek, format, isSameMonth, isToday, parseISO, startOfMonth, startOfWeek } from "date-fns";
import { cn } from "@/lib/cn";
import { EmptyState } from "@/components/ui/empty-state";
import { Card } from "@/components/ui/card";

// White — reserved app-wide (never a pickable club color, see CLUB_COLOR_PALETTE).
export const GOOGLE_CALENDAR_COLOR = "#ffffff";
// A synthetic id (never a real club's cuid) so the Google layer can reuse
// ClubFilterLegend's existing data-club-id show/hide mechanism unchanged.
export const GOOGLE_CALENDAR_LEGEND_ID = "__google__";

type ClubEvent = { id: string; title: string; startAt: Date; club: { id: string; name: string; color: string } };
type GoogleEvent = { id: string; title: string; startAt: Date };

export type AllClubsCalendarItem = { kind: "club"; event: ClubEvent } | { kind: "google"; event: GoogleEvent };

export function googleLegendEntry() {
  return { id: GOOGLE_CALENDAR_LEGEND_ID, name: "My Google Calendar", color: GOOGLE_CALENDAR_COLOR };
}

export function AllClubsMonthGrid({
  refDate,
  items,
  eventHref,
}: {
  refDate: Date;
  items: AllClubsCalendarItem[];
  eventHref: (event: ClubEvent) => string;
}) {
  const days = eachDayOfInterval({ start: startOfWeek(startOfMonth(refDate)), end: endOfWeek(endOfMonth(refDate)) });
  const itemsByDay = new Map<string, AllClubsCalendarItem[]>();
  for (const it of items) {
    const key = format(it.event.startAt, "yyyy-MM-dd");
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
          const clubTimes = dayItems.filter((it) => it.kind === "club").map((it) => format(it.event.startAt, "HH:mm"));
          const hasConflict = clubTimes.length > 1 && new Set(clubTimes).size < clubTimes.length;
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
                {dayItems.slice(0, 3).map((it) =>
                  it.kind === "club" ? (
                    <Link
                      key={it.event.id}
                      href={eventHref(it.event)}
                      data-club-id={it.event.club.id}
                      title={`${it.event.club.name} · ${format(it.event.startAt, "h:mm a")} — ${it.event.title}`}
                      className="block truncate rounded px-1 py-0.5 text-[10px] font-medium text-white hover:opacity-80 sm:text-[11px]"
                      style={{ backgroundColor: it.event.club.color }}
                    >
                      {format(it.event.startAt, "h:mm a")} {it.event.title}
                    </Link>
                  ) : (
                    <div
                      key={it.event.id}
                      data-club-id={GOOGLE_CALENDAR_LEGEND_ID}
                      title={`My Google Calendar · ${format(it.event.startAt, "h:mm a")} — ${it.event.title}`}
                      className="truncate rounded border border-dashed border-black/15 px-1 py-0.5 text-[10px] font-medium sm:text-[11px]"
                      style={{ backgroundColor: GOOGLE_CALENDAR_COLOR, color: "#111827" }}
                    >
                      {format(it.event.startAt, "h:mm a")} {it.event.title}
                    </div>
                  )
                )}
                {dayItems.length > 3 && <div className="text-[10px] text-text-muted">+{dayItems.length - 3} more</div>}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function AllClubsAgendaList({
  items,
  eventHref,
}: {
  items: AllClubsCalendarItem[];
  eventHref: (event: ClubEvent) => string;
}) {
  if (items.length === 0) {
    return (
      <Card>
        <EmptyState icon="📅" title="Nothing scheduled" description="No events in this window yet." />
      </Card>
    );
  }
  const byDay = new Map<string, AllClubsCalendarItem[]>();
  for (const it of items) {
    const key = format(it.event.startAt, "yyyy-MM-dd");
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
              it.kind === "club" ? (
                <Link key={it.event.id} href={eventHref(it.event)} data-club-id={it.event.club.id} className="block">
                  <Card className="transition-colors hover:border-border-strong">
                    <div className="flex items-center gap-3 p-3">
                      <div className="h-9 w-1.5 shrink-0 rounded-full" style={{ backgroundColor: it.event.club.color }} />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold text-text-primary">{it.event.title}</p>
                        <p className="text-xs text-text-secondary">
                          {it.event.club.name} · {format(it.event.startAt, "h:mm a")}
                        </p>
                      </div>
                    </div>
                  </Card>
                </Link>
              ) : (
                <div key={it.event.id} data-club-id={GOOGLE_CALENDAR_LEGEND_ID}>
                  <Card>
                    <div className="flex items-center gap-3 p-3">
                      <div className="h-9 w-1.5 shrink-0 rounded-full" style={{ backgroundColor: GOOGLE_CALENDAR_COLOR }} />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold text-text-primary">{it.event.title}</p>
                        <p className="text-xs text-text-secondary">
                          My Google Calendar · {format(it.event.startAt, "h:mm a")}
                        </p>
                      </div>
                    </div>
                  </Card>
                </div>
              )
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

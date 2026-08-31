import type { Metadata } from "next";
import Link from "next/link";
import { addDays, addMonths, endOfMonth, endOfWeek, format, parseISO, startOfDay, startOfMonth, startOfWeek, subMonths } from "date-fns";
import { getDirectorContext } from "@/lib/director";
import { getGoogleCalendarEvents } from "@/lib/google-calendar";
import { db } from "@/lib/db";
import { cn } from "@/lib/cn";
import { ClubFilterLegend } from "@/components/club-filter-legend";
import { ConnectGoogleCalendarPrompt } from "@/components/connect-google-calendar-prompt";
import {
  AllClubsMonthGrid,
  AllClubsAgendaList,
  googleLegendEntry,
  type AllClubsCalendarItem,
} from "@/components/all-clubs-calendar-view";

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
  const { club, user } = await getDirectorContext(clubId);
  const { view: rawView, date: rawDate } = await searchParams;
  const view: ViewType = rawView === "agenda" ? "agenda" : "month";
  const refDate = rawDate ? startOfDay(parseISO(rawDate)) : startOfDay(new Date());

  const rangeStart = view === "month" ? startOfWeek(startOfMonth(refDate)) : refDate;
  const rangeEnd = view === "month" ? endOfWeek(endOfMonth(refDate)) : addDays(refDate, 45);

  const [events, allSchoolClubs, me] = await Promise.all([
    db.event.findMany({
      where: {
        status: { not: "CANCELLED" },
        startAt: { gte: rangeStart, lte: rangeEnd },
        club: { schoolId: club.schoolId, status: "ACTIVE" },
        visibility: "PUBLIC",
      },
      include: { club: true },
      orderBy: { startAt: "asc" },
    }),
    // Every active club at the school, not just ones with an event in this
    // window — so the legend lets you pre-hide a club before it ever posts anything.
    db.club.findMany({ where: { schoolId: club.schoolId, status: "ACTIVE" }, select: { id: true, name: true, color: true }, orderBy: { name: "asc" } }),
    db.user.findUniqueOrThrow({ where: { id: user.id }, select: { googleCalendarRefreshToken: true } }),
  ]);
  const googleEvents = me.googleCalendarRefreshToken
    ? await getGoogleCalendarEvents(user.id, me.googleCalendarRefreshToken, rangeStart, rangeEnd)
    : [];

  // Directors get the full management view for their own club's events; for
  // every other club on this shared calendar they get the general event page
  // (same one students use) — which correctly shows "not found" if they're not
  // a member there, preserving that club's existing privacy boundary.
  const eventHref = (e: { id: string; club: { id: string } }) =>
    e.club.id === clubId ? `/director/${clubId}/events/${e.id}` : `/events/${e.id}`;

  const items: AllClubsCalendarItem[] = [
    ...events.map((e) => ({ kind: "club" as const, event: e })),
    ...googleEvents.map((e) => ({ kind: "google" as const, event: e })),
  ].sort((a, b) => a.event.startAt.getTime() - b.event.startAt.getTime());

  const legendClubs: { id: string; name: string; color: string }[] = [...allSchoolClubs];
  if (me.googleCalendarRefreshToken) legendClubs.push(googleLegendEntry());

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

      <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
        <ClubFilterLegend clubs={legendClubs} storageKey="clubsync_hidden_clubs_calendar" />
        {!me.googleCalendarRefreshToken && <ConnectGoogleCalendarPrompt />}
      </div>

      <div className="mt-5">
        {view === "month" ? (
          <AllClubsMonthGrid refDate={refDate} items={items} eventHref={eventHref} />
        ) : (
          <AllClubsAgendaList items={items} eventHref={eventHref} />
        )}
      </div>
    </div>
  );
}

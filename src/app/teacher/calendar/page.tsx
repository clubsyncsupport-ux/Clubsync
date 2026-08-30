import type { Metadata } from "next";
import Link from "next/link";
import { addDays, addMonths, endOfMonth, endOfWeek, format, parseISO, startOfDay, startOfMonth, startOfWeek, subMonths } from "date-fns";
import { requireTeacher } from "@/lib/teacher";
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

export const metadata: Metadata = { title: "Calendar" };

export default async function TeacherCalendarPage({
  searchParams,
}: {
  searchParams: Promise<{ view?: string; date?: string }>;
}) {
  const user = await requireTeacher();
  const { view: rawView, date: rawDate } = await searchParams;
  const view: ViewType = rawView === "agenda" ? "agenda" : "month";
  const refDate = rawDate ? startOfDay(parseISO(rawDate)) : startOfDay(new Date());

  const rangeStart = view === "month" ? startOfWeek(startOfMonth(refDate)) : refDate;
  const rangeEnd = view === "month" ? endOfWeek(endOfMonth(refDate)) : addDays(refDate, 45);

  const myMemberships = await db.clubMembership.findMany({
    where: { userId: user.id, role: "DIRECTOR", status: "ACTIVE" },
    include: { club: true },
  });
  const myClubIds = new Set(myMemberships.map((m) => m.clubId));
  const schoolIds = Array.from(new Set(myMemberships.map((m) => m.club.schoolId)));

  const events = await db.event.findMany({
    where: {
      status: { not: "CANCELLED" },
      startAt: { gte: rangeStart, lte: rangeEnd },
      club: { schoolId: { in: schoolIds }, status: "ACTIVE" },
      visibility: "PUBLIC",
    },
    include: { club: true },
    orderBy: { startAt: "asc" },
  });
  const googleEvents = user.googleCalendarRefreshToken
    ? await getGoogleCalendarEvents(user.id, user.googleCalendarRefreshToken, rangeStart, rangeEnd)
    : [];

  // A teacher's own clubs get the full management view; every other club at
  // their school(s) gets the general event page, same privacy boundary as
  // the per-club All Clubs Calendar.
  const eventHref = (e: { id: string; club: { id: string } }) =>
    myClubIds.has(e.club.id) ? `/director/${e.club.id}/events/${e.id}` : `/events/${e.id}`;

  const items: AllClubsCalendarItem[] = [
    ...events.map((e) => ({ kind: "club" as const, event: e })),
    ...googleEvents.map((e) => ({ kind: "google" as const, event: e })),
  ].sort((a, b) => a.event.startAt.getTime() - b.event.startAt.getTime());

  const legendClubs: { id: string; name: string; color: string }[] = Array.from(
    new Map(events.map((e) => [e.club.id, e.club])).values()
  ).map((c) => ({ id: c.id, name: c.name, color: c.color }));
  if (user.googleCalendarRefreshToken) legendClubs.push(googleLegendEntry());

  const prevHref = `/teacher/calendar?view=${view}&date=${format(subMonths(refDate, 1), "yyyy-MM-dd")}`;
  const nextHref = `/teacher/calendar?view=${view}&date=${format(addMonths(refDate, 1), "yyyy-MM-dd")}`;
  const todayHref = `/teacher/calendar?view=${view}&date=${format(new Date(), "yyyy-MM-dd")}`;

  return (
    <div className="mx-auto max-w-4xl px-4 py-6 animate-fade-in">
      <h1 className="text-2xl font-bold tracking-tight text-text-primary">Calendar</h1>
      <p className="mt-1 text-[15px] text-text-secondary">
        Every scheduled meeting and event across every club you run — plus your personal Google Calendar, if you&rsquo;ve
        connected it, so you never double-book yourself.
      </p>

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
              href={`/teacher/calendar?view=${v}&date=${format(refDate, "yyyy-MM-dd")}`}
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
        <ClubFilterLegend clubs={legendClubs} storageKey="clubsync_hidden_clubs_teacher_calendar" />
        {!user.googleCalendarRefreshToken && <ConnectGoogleCalendarPrompt />}
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

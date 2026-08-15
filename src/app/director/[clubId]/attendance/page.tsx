import type { Metadata } from "next";
import Link from "next/link";
import { subDays, subMonths, subYears } from "date-fns";
import { getDirectorContext } from "@/lib/director";
import { db } from "@/lib/db";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar } from "@/components/ui/avatar";
import { EmptyState } from "@/components/ui/empty-state";
import { cn } from "@/lib/cn";
import { formatEventDate } from "@/lib/format";

type Range = "week" | "month" | "year" | "all" | "students";
const RANGES = ["week", "month", "year", "all", "students"] as const;

export const metadata: Metadata = { title: "Attendance" };

export default async function ClubAttendancePage({
  params,
  searchParams,
}: {
  params: Promise<{ clubId: string }>;
  searchParams: Promise<{ range?: string }>;
}) {
  const { clubId } = await params;
  await getDirectorContext(clubId);
  const { range: rawRange } = await searchParams;
  const range: Range = RANGES.includes(rawRange as Range) ? (rawRange as Range) : "all";

  const now = new Date();

  const rangeLabel = (r: Range) => (r === "all" ? "All time" : r === "students" ? "Students" : `Past ${r}`);

  return (
    <div className="mx-auto max-w-3xl px-4 py-6 animate-fade-in">
      <h1 className="text-2xl font-bold tracking-tight text-text-primary">Attendance</h1>
      <p className="mt-1 text-[15px] text-text-secondary">Every meeting and event with attendance tracking turned on, and who showed up.</p>

      <div className="mt-4 flex flex-wrap gap-1 rounded-xl border border-border p-1">
        {RANGES.map((r) => (
          <Link
            key={r}
            href={`/director/${clubId}/attendance?range=${r}`}
            className={cn(
              "flex-1 rounded-lg px-3 py-1.5 text-center text-sm font-medium capitalize transition-colors",
              range === r ? "bg-accent text-on-accent" : "text-text-secondary hover:bg-surface-2"
            )}
          >
            {rangeLabel(r)}
          </Link>
        ))}
      </div>

      <div className="mt-5">{range === "students" ? <StudentsView clubId={clubId} now={now} /> : <EventsView clubId={clubId} range={range} now={now} />}</div>
    </div>
  );
}

async function EventsView({ clubId, range, now }: { clubId: string; range: Range; now: Date }) {
  const since = range === "week" ? subDays(now, 7) : range === "month" ? subMonths(now, 1) : range === "year" ? subYears(now, 1) : null;

  const events = await db.event.findMany({
    where: {
      clubId,
      attendanceEnabled: true,
      ...(since ? { startAt: { gte: since } } : {}),
    },
    include: {
      _count: {
        select: {
          registrations: { where: { status: { in: ["REGISTERED", "ATTENDED", "NO_SHOW"] } } },
        },
      },
      registrations: { where: { status: "ATTENDED" }, select: { id: true } },
    },
    orderBy: { startAt: "desc" },
  });

  if (events.length === 0) {
    return (
      <Card>
        <EmptyState
          icon="📋"
          title="No attendance-tracked events"
          description="Turn on “Track Attendance” when creating an event or meeting to see it here."
        />
      </Card>
    );
  }

  return (
    <div className="space-y-2">
      {events.map((e) => (
        <Link
          key={e.id}
          href={`/director/${clubId}/events/${e.id}/attendance`}
          className="flex items-center justify-between gap-3 rounded-2xl border border-border bg-surface-1 p-4 transition-colors hover:border-border-strong"
        >
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <p className="truncate font-semibold text-text-primary">{e.title}</p>
              <Badge tone="neutral">{e.category}</Badge>
            </div>
            <p className="mt-0.5 text-sm text-text-secondary">{formatEventDate(e.startAt)}</p>
          </div>
          <p className="shrink-0 text-sm font-semibold text-text-secondary">
            {e.registrations.length} / {e._count.registrations}
          </p>
        </Link>
      ))}
    </div>
  );
}

async function StudentsView({ clubId, now }: { clubId: string; now: Date }) {
  const [members, trackedEvents] = await Promise.all([
    db.clubMembership.findMany({
      where: { clubId, status: "ACTIVE" },
      include: { user: true },
      orderBy: { user: { firstName: "asc" } },
    }),
    db.event.findMany({
      where: { clubId, attendanceEnabled: true, startAt: { lte: now } },
      select: {
        id: true,
        allowedGrades: true,
        registrations: { where: { status: "ATTENDED" }, select: { userId: true } },
      },
    }),
  ]);

  if (members.length === 0) {
    return (
      <Card>
        <EmptyState icon="🧑‍🎓" title="No members yet" description="Once students join this club, their attendance record shows up here." />
      </Card>
    );
  }

  const rows = members.map((m) => {
    const eligibleEvents = trackedEvents.filter((e) => {
      if (!e.allowedGrades) return true;
      const allowed = e.allowedGrades.split(",");
      return m.user.grade ? allowed.includes(m.user.grade) : false;
    });
    const attended = eligibleEvents.filter((e) => e.registrations.some((r) => r.userId === m.userId)).length;
    return { membership: m, attended, possible: eligibleEvents.length };
  });

  return (
    <Card>
      <div className="divide-y divide-border">
        {rows.map(({ membership: m, attended, possible }) => (
          <div key={m.id} className="flex items-center gap-3 p-4">
            <Avatar firstName={m.user.firstName} lastName={m.user.lastName} src={m.user.avatarUrl} size="sm" />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-text-primary">
                {m.user.firstName} {m.user.lastName}
              </p>
              <p className="text-xs text-text-muted">{m.user.grade ?? "—"}</p>
            </div>
            <p className="shrink-0 text-sm font-semibold text-text-secondary">
              {possible === 0 ? "No tracked events yet" : `${attended} / ${possible} attended`}
            </p>
          </div>
        ))}
      </div>
    </Card>
  );
}

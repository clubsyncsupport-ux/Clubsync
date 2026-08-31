import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getDirectorContext } from "@/lib/director";
import { db } from "@/lib/db";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { BackButton } from "@/components/ui/back-button";

export const metadata: Metadata = { title: "Attendance" };
import { formatEventDate } from "@/lib/format";
import { AttendanceRow } from "./attendance-row";
import { AutoMarkAttendedOnView } from "./auto-mark-attended-on-view";

export default async function EventAttendancePage({ params }: { params: Promise<{ clubId: string; eventId: string }> }) {
  const { clubId, eventId } = await params;
  await getDirectorContext(clubId);

  const event = await db.event.findUnique({
    where: { id: eventId },
    include: {
      registrations: {
        where: { status: { in: ["REGISTERED", "WAITLISTED", "ATTENDED", "NO_SHOW"] } },
        include: { user: true },
        orderBy: { user: { firstName: "asc" } },
      },
    },
  });
  if (!event || event.clubId !== clubId) notFound();

  const hoursRecords = await db.serviceHourRecord.findMany({ where: { eventId } });
  const hoursByUserId = new Map(hoursRecords.map((h) => [h.userId, h.hours]));

  const attendedCount = event.registrations.filter((r) => r.status === "ATTENDED").length;

  return (
    <div className="mx-auto max-w-3xl px-4 py-6 animate-fade-in">
      <AutoMarkAttendedOnView eventId={eventId} />
      <BackButton fallbackHref={`/director/${clubId}/attendance`} />

      <div className="mt-3 flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-text-primary">Attendance</h1>
          <p className="mt-1 text-sm text-text-secondary">
            {event.title} · {formatEventDate(event.startAt)}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-3">
          <p className="text-sm font-medium text-text-secondary">
            {attendedCount} / {event.registrations.length} attended
          </p>
          {event.registrations.length > 0 && (
            <a
              href={`/director/${clubId}/events/${eventId}/attendance/export`}
              className="rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-text-secondary hover:border-border-strong"
            >
              ⬇ Export CSV
            </a>
          )}
        </div>
      </div>

      <div className="mt-5">
        {event.registrations.length === 0 ? (
          <Card>
            <EmptyState icon="📋" title="No one signed up" description="Nobody registered for this event yet." />
          </Card>
        ) : (
          <Card className="overflow-hidden p-0">
            {event.registrations.map((r) => (
              <AttendanceRow
                key={r.id}
                eventId={eventId}
                awardsServiceHours={event.awardsServiceHours}
                defaultHours={event.defaultServiceHours}
                registrant={{
                  userId: r.userId,
                  firstName: r.user.firstName,
                  lastName: r.user.lastName,
                  avatarUrl: r.user.avatarUrl,
                  grade: r.user.grade,
                  status: r.status,
                  hours: hoursByUserId.get(r.userId) ?? event.defaultServiceHours,
                  note: r.attendanceNote ?? "",
                }}
              />
            ))}
          </Card>
        )}
      </div>
    </div>
  );
}

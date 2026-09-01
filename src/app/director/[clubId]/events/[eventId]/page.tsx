import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getDirectorContext } from "@/lib/director";
import { db } from "@/lib/db";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatTimeRange } from "@/lib/format";
import { format } from "date-fns";
import { ChecklistSection } from "./checklist-section";
import { AttachmentsSection } from "./attachments-section";
import { FinalizeSection } from "./finalize-section";
import { CancelEventButton } from "./cancel-event-button";
import { RegistrantRow } from "./registrant-row";
import { RolesRoster } from "./roles-roster";
import { BackButton } from "@/components/ui/back-button";

export async function generateMetadata({ params }: { params: Promise<{ clubId: string; eventId: string }> }): Promise<Metadata> {
  const { eventId } = await params;
  const event = await db.event.findUnique({ where: { id: eventId }, select: { title: true } });
  return { title: event?.title ?? "Event" };
}

export default async function DirectorEventDetailPage({ params }: { params: Promise<{ clubId: string; eventId: string }> }) {
  const { clubId, eventId } = await params;
  await getDirectorContext(clubId);

  const event = await db.event.findUnique({
    where: { id: eventId },
    include: {
      checklistItems: { orderBy: { order: "asc" } },
      attachments: true,
      registrations: {
        where: { status: { in: ["REGISTERED", "WAITLISTED", "ATTENDED", "NO_SHOW"] } },
        include: { user: true, role: true },
        orderBy: { registeredAt: "asc" },
      },
      roles: { orderBy: { order: "asc" } },
    },
  });
  if (!event || event.clubId !== clubId) notFound();

  const existingHours = await db.serviceHourRecord.findMany({ where: { eventId } });
  const hoursByUserId = new Map(existingHours.map((h) => [h.userId, h.hours]));

  return (
    <div className="mx-auto max-w-2xl px-4 py-6 space-y-6 animate-fade-in">
      <div>
        <BackButton fallbackHref={`/director/${clubId}/events`} />
        <div className="mt-3 flex items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-text-primary">{event.title}</h1>
            <p className="mt-1 text-[15px] text-text-secondary">
              {format(event.startAt, "EEEE, MMMM d, yyyy")} · {formatTimeRange(event.startAt, event.endAt)}
            </p>
          </div>
          <Badge tone={event.status === "FINALIZED" ? "success" : event.status === "CANCELLED" ? "neutral" : "accent"}>{event.status}</Badge>
        </div>
        <p className="mt-3 whitespace-pre-wrap text-[15px] text-text-primary">{event.description}</p>
        <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2">
          {event.status === "SCHEDULED" && (
            <>
              <Link href={`/director/${clubId}/events/${eventId}/edit`} className="text-sm font-medium text-accent">
                ✏ Edit Event
              </Link>
              <CancelEventButton
                eventId={event.id}
                clubId={clubId}
                isRecurring={event.recurrence !== "NONE" || !!event.recurrenceParentId}
              />
            </>
          )}
          <Link href={`/director/${clubId}/events/new?copyFrom=${eventId}`} className="text-sm font-medium text-accent">
            ⧉ Copy Event
          </Link>
        </div>
        {event.attendanceEnabled && (
          <Link
            href={`/director/${clubId}/events/${eventId}/attendance`}
            className="mt-4 inline-flex items-center gap-1.5 rounded-xl bg-accent px-4 py-2 text-sm font-medium text-on-accent hover:bg-accent-hover"
          >
            📋 Take Attendance →
          </Link>
        )}
      </div>

      {event.roles.length > 0 && (
        <div>
          <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-text-muted">Roles</h2>
          <RolesRoster
            roles={event.roles.map((r) => ({
              id: r.id,
              name: r.name,
              capacity: r.capacity,
              waitlistCapacity: r.waitlistCapacity,
              people: event.registrations
                .filter((reg) => reg.roleId === r.id)
                .map((reg) => ({
                  userId: reg.userId,
                  firstName: reg.user.firstName,
                  lastName: reg.user.lastName,
                  grade: reg.user.grade,
                  status: reg.status as "REGISTERED" | "WAITLISTED" | "ATTENDED" | "NO_SHOW",
                })),
            }))}
          />
        </div>
      )}

      <div>
        <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-text-muted">Registrants ({event.registrations.length})</h2>
        {event.registrations.length === 0 ? (
          <p className="text-sm text-text-muted">No one has registered yet.</p>
        ) : (
          <Card>
            <CardContent className="divide-y divide-border p-0">
              {event.registrations.map((r) => (
                <RegistrantRow
                  key={r.id}
                  eventId={event.id}
                  userId={r.userId}
                  firstName={r.user.firstName}
                  lastName={r.user.lastName}
                  avatarUrl={r.user.avatarUrl}
                  grade={r.user.grade}
                  status={r.status as "REGISTERED" | "WAITLISTED" | "ATTENDED" | "NO_SHOW"}
                  roleName={r.role?.name ?? null}
                />
              ))}
            </CardContent>
          </Card>
        )}
      </div>

      <ChecklistSection eventId={event.id} items={event.checklistItems} visibleToStudents={event.checklistVisibleToStudents} />
      <AttachmentsSection eventId={event.id} attachments={event.attachments} />

      {(event.status === "COMPLETED" || event.status === "FINALIZED") && (
        <FinalizeSection
          eventId={event.id}
          defaultHours={event.defaultServiceHours}
          awardsServiceHours={event.awardsServiceHours}
          eventImpact={event.eventImpact}
          alreadyFinalized={event.status === "FINALIZED"}
          registrants={event.registrations.map((r) => ({
            id: r.userId,
            name: `${r.user.firstName} ${r.user.lastName}`,
            grade: r.user.grade,
            avatarUrl: r.user.avatarUrl,
            hours: hoursByUserId.get(r.userId) ?? event.defaultServiceHours,
          }))}
        />
      )}
    </div>
  );
}

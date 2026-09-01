import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { getViewer, directorClubs } from "@/lib/viewer";
import { db } from "@/lib/db";
import { ColorDot, Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { RegisterEventButton } from "@/components/register-event-button";
import { RecurringSeriesJoin } from "@/components/recurring-series-join";
import { ShareButton } from "@/components/share-button";
import { BackButton } from "@/components/ui/back-button";
import { formatTimeRange } from "@/lib/format";
import { parseReminderOffsets } from "@/lib/constants";
import { format } from "date-fns";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const event = await db.event.findUnique({ where: { id }, select: { title: true } });
  return { title: event?.title ?? "Event" };
}

export default async function EventDetailsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const viewer = await getViewer();

  const event = await db.event.findUnique({
    where: { id },
    include: {
      club: true,
      attachments: true,
      _count: { select: { registrations: { where: { status: "REGISTERED" } } } },
      registrations: { where: { userId: viewer.id }, include: { role: true } },
      invites: { where: { userId: viewer.id } },
      roles: {
        orderBy: { order: "asc" },
        include: { _count: { select: { registrations: { where: { status: "REGISTERED" } } } } },
      },
      checklistItems: { orderBy: { order: "asc" } },
    },
  });

  if (!event) notFound();

  const isMember = viewer.memberships.some((m) => m.clubId === event.clubId);
  // Directors/admins at the same school can always view an event's details,
  // regardless of the owning club's visibility settings — the shared "All
  // Clubs Calendar" is meant for coordination across every club, so a
  // director clicking another club's event shouldn't 404. Regular students
  // are unaffected: they still need membership (or an invite for PRIVATE
  // events) exactly as before.
  // A club still awaiting its supervisor's approval is invisible to everyone
  // except its own members (i.e. the creator) — the school-staff widening
  // below is meant for coordinating across already-public clubs, not for
  // previewing a club nobody has approved yet.
  const isSchoolStaff =
    event.club.approvalStatus === "APPROVED" &&
    (viewer.platformRole === "PLATFORM_ADMIN" ||
      (viewer.platformRole === "SCHOOL_ADMIN" && viewer.schoolAdminOfId === event.club.schoolId) ||
      directorClubs(viewer).some((c) => c.schoolId === event.club.schoolId));
  const canView = isSchoolStaff || (event.visibility === "PUBLIC" ? isMember : event.invites.length > 0);
  if (!canView) notFound();

  const myRegistration = event.registrations[0];
  const registeredCount = event._count.registrations;
  const isFull = event.maxParticipants ? registeredCount >= event.maxParticipants : false;
  const spotsLeft = event.maxParticipants ? Math.max(event.maxParticipants - registeredCount, 0) : null;
  const allowedGrades = event.allowedGrades ? event.allowedGrades.split(",") : null;
  const gradeEligible = !allowedGrades || (viewer.grade ? allowedGrades.includes(viewer.grade) : false);

  return (
    <div className="mx-auto max-w-2xl px-4 py-6 animate-fade-in">
      <BackButton fallbackHref="/calendar" />
      <Link
        href={`/clubs/${event.club.slug}`}
        className="mt-3 flex items-center gap-2 text-sm font-medium text-text-secondary hover:text-text-primary"
      >
        <ColorDot color={event.club.color} />
        {event.club.name}
      </Link>

      <h1 className="mt-3 text-2xl font-bold tracking-tight text-text-primary">{event.title}</h1>
      <div className="mt-2 flex flex-wrap gap-2">
        <Badge tone="accent">{event.category}</Badge>
        {event.awardsServiceHours && <Badge tone="success">⏱ {event.defaultServiceHours} service hours</Badge>}
        {event.visibility === "PRIVATE" && <Badge tone="warning">Private event</Badge>}
        {allowedGrades && <Badge tone={gradeEligible ? "accent" : "warning"}>{allowedGrades.join(", ")} only</Badge>}
      </div>

      <Card className="mt-5">
        <CardContent className="p-5 space-y-4">
          <InfoRow icon="📅" label={format(event.startAt, "EEEE, MMMM d, yyyy")} sub={formatTimeRange(event.startAt, event.endAt)} />
          {(event.building || event.room || event.address) && (
            <InfoRow icon="📍" label={[event.building, event.room].filter(Boolean).join(", ") || "Location"} sub={event.address ?? undefined} />
          )}
          {event.maxParticipants && (
            <InfoRow
              icon="👥"
              label={`${registeredCount} / ${event.maxParticipants} registered`}
              sub={spotsLeft !== null ? `${spotsLeft} spots left` : undefined}
            />
          )}
        </CardContent>
      </Card>

      {event.roles.length > 0 && (
        <Card className="mt-5">
          <CardContent className="space-y-2 p-5">
            <p className="text-sm font-semibold text-text-primary">Roles</p>
            {event.roles.map((r) => {
              const filled = r._count.registrations;
              const roleFull = filled >= r.capacity;
              const roleGrades = r.allowedGrades ? r.allowedGrades.split(",") : null;
              return (
                <div key={r.id} className="flex items-center justify-between text-sm">
                  <span className="text-text-primary">
                    {r.name}
                    {roleGrades && <span className="ml-1.5 text-xs text-text-muted">({roleGrades.join(", ")} only)</span>}
                  </span>
                  <span className={roleFull ? "font-medium text-success" : "text-text-secondary"}>
                    {filled} / {r.capacity} {roleFull ? "✓ Filled" : "filled"}
                  </span>
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}

      {event.checklistVisibleToStudents && event.checklistItems.length > 0 && (
        <Card className="mt-5">
          <CardContent className="space-y-2 p-5">
            <p className="text-sm font-semibold text-text-primary">Planning Checklist</p>
            {event.checklistItems.map((item) => (
              <div key={item.id} className="flex items-center gap-2 text-sm">
                <span className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border text-[10px] ${item.completed ? "border-accent bg-accent text-on-accent" : "border-border-strong"}`}>
                  {item.completed && "✓"}
                </span>
                <span className={item.completed ? "text-text-muted line-through" : "text-text-primary"}>{item.task}</span>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      <div className="mt-5">
        <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-text-muted">Description</h2>
        <p className="whitespace-pre-wrap text-[15px] leading-relaxed text-text-primary">{event.description}</p>
      </div>

      {event.awardsServiceHours && event.serviceTaskDescription && (
        <Card className="mt-5 border-success/30 bg-success-soft">
          <CardContent className="p-4">
            <p className="text-sm font-semibold text-success">Volunteer Task</p>
            <p className="mt-1 text-sm text-text-primary">{event.serviceTaskDescription}</p>
          </CardContent>
        </Card>
      )}

      {event.attachments.length > 0 && (
        <div className="mt-5">
          <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-text-muted">Attachments</h2>
          <div className="space-y-2">
            {event.attachments.map((a) => (
              <a
                key={a.id}
                href={a.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 rounded-xl border border-border bg-surface-1 p-3 text-sm font-medium text-text-primary hover:border-border-strong"
              >
                📎 {a.filename}
              </a>
            ))}
          </div>
        </div>
      )}

      <div className="mt-6 flex gap-3">
        <div className="flex-1">
          {!isMember && !myRegistration ? (
            <div className="rounded-xl border border-border bg-surface-1 px-4 py-3 text-center text-sm text-text-secondary">
              You&rsquo;re viewing this as a director — you&rsquo;re not a member of {event.club.name}.
            </div>
          ) : !gradeEligible && !myRegistration ? (
            <div className="rounded-xl border border-warning/30 bg-warning-soft px-4 py-3 text-center text-sm text-warning">
              Only open to {allowedGrades?.join(", ")}
            </div>
          ) : (
            <RegisterEventButton
              eventId={event.id}
              initialStatus={(myRegistration?.status as "REGISTERED" | "WAITLISTED" | "ATTENDED") ?? "NONE"}
              full={isFull}
              waitlistEnabled={event.waitlistEnabled}
              initialReminderOffsets={myRegistration?.reminderOffsets ? parseReminderOffsets(myRegistration.reminderOffsets) : []}
              accountDefaultOffsets={parseReminderOffsets(viewer.reminderOffsets)}
              roles={event.roles.map((r) => {
                const roleGrades = r.allowedGrades ? r.allowedGrades.split(",") : null;
                const roleEligible = !roleGrades || (viewer.grade ? roleGrades.includes(viewer.grade) : false);
                return {
                  id: r.id,
                  name: r.name,
                  capacity: r.capacity,
                  filledCount: r._count.registrations,
                  eligible: roleEligible,
                  ineligibleReason: roleEligible ? undefined : `${roleGrades!.join(", ")} only`,
                };
              })}
              initialRoleName={myRegistration?.role?.name}
            />
          )}
          {isMember && gradeEligible && (event.recurrence !== "NONE" || event.recurrenceParentId) && (
            <RecurringSeriesJoin eventId={event.id} roleNames={event.roles.map((r) => r.name)} />
          )}
        </div>
        <ShareButton title={event.title} text={`${event.title} — ${event.club.name} on ClubSync`} />
      </div>
    </div>
  );
}

function InfoRow({ icon, label, sub }: { icon: string; label: string; sub?: string }) {
  return (
    <div className="flex items-start gap-3">
      <span className="text-lg leading-none">{icon}</span>
      <div>
        <p className="text-[15px] font-medium text-text-primary">{label}</p>
        {sub && <p className="text-sm text-text-secondary">{sub}</p>}
      </div>
    </div>
  );
}

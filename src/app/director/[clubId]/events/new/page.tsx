import type { Metadata } from "next";
import { getDirectorContext } from "@/lib/director";
import { db } from "@/lib/db";
import { schoolGradeLevels } from "@/lib/grades";
import { CreateEventForm, type EventPrefill } from "./create-event-form";
import { BackButton } from "@/components/ui/back-button";

export const metadata: Metadata = { title: "New Event" };

export default async function NewEventPage({
  params,
  searchParams,
}: {
  params: Promise<{ clubId: string }>;
  searchParams: Promise<{ copyFrom?: string }>;
}) {
  const { clubId } = await params;
  const { club } = await getDirectorContext(clubId);
  const { copyFrom } = await searchParams;

  const [members, sourceEvent, school] = await Promise.all([
    db.clubMembership.findMany({
      where: { clubId, status: "ACTIVE" },
      include: { user: true },
      orderBy: { user: { firstName: "asc" } },
    }),
    copyFrom ? db.event.findUnique({ where: { id: copyFrom } }) : null,
    db.school.findUniqueOrThrow({ where: { id: club.schoolId } }),
  ]);
  const gradeLevels = schoolGradeLevels(school);

  // Only ever prefill from an event that belongs to *this* club — never trust
  // the copyFrom id enough to leak another club's event details into a form.
  const prefill: EventPrefill | undefined =
    sourceEvent && sourceEvent.clubId === clubId
      ? {
          title: `${sourceEvent.title} (Copy)`,
          description: sourceEvent.description,
          category: sourceEvent.category,
          building: sourceEvent.building ?? "",
          room: sourceEvent.room ?? "",
          address: sourceEvent.address ?? "",
          maxParticipants: sourceEvent.maxParticipants,
          waitlistEnabled: sourceEvent.waitlistEnabled,
          allowedGrades: sourceEvent.allowedGrades ? sourceEvent.allowedGrades.split(",") : null,
          awardsServiceHours: sourceEvent.awardsServiceHours,
          defaultServiceHours: sourceEvent.defaultServiceHours,
          serviceTaskDescription: sourceEvent.serviceTaskDescription ?? "",
          attendanceEnabled: sourceEvent.attendanceEnabled,
          visibility: sourceEvent.visibility === "PRIVATE" ? "PRIVATE" : "PUBLIC",
        }
      : undefined;

  return (
    <div className="mx-auto max-w-2xl px-4 py-6 animate-fade-in">
      <BackButton fallbackHref={`/director/${clubId}/events`} />
      <h1 className="mt-3 text-2xl font-bold tracking-tight text-text-primary">Create Event</h1>
      <p className="mt-1 text-[15px] text-text-secondary">
        {prefill ? "Copied from an existing event — pick a new date and time below, then save." : "Members will automatically see this on their calendar."}
      </p>
      <CreateEventForm
        clubId={clubId}
        members={members.map((m) => ({ id: m.user.id, name: `${m.user.firstName} ${m.user.lastName}` }))}
        gradeLevels={gradeLevels}
        prefill={prefill}
      />
    </div>
  );
}

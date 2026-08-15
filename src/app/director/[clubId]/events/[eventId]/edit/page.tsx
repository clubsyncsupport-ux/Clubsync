import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { getDirectorContext } from "@/lib/director";
import { db } from "@/lib/db";
import { EditEventForm } from "./edit-event-form";

export const metadata: Metadata = { title: "Edit Event" };

export default async function EditEventPage({ params }: { params: Promise<{ clubId: string; eventId: string }> }) {
  const { clubId, eventId } = await params;
  await getDirectorContext(clubId);

  const event = await db.event.findUnique({
    where: { id: eventId },
    include: { registrations: { where: { status: { in: ["REGISTERED", "WAITLISTED", "ATTENDED", "NO_SHOW"] } } } },
  });
  if (!event || event.clubId !== clubId) notFound();

  const members = await db.clubMembership.findMany({
    where: { clubId, status: "ACTIVE" },
    include: { user: true },
    orderBy: { user: { firstName: "asc" } },
  });
  const registeredUserIds = event.registrations.map((r) => r.userId);

  return (
    <div className="mx-auto max-w-2xl px-4 py-6 animate-fade-in">
      <Link href={`/director/${clubId}/events/${eventId}`} className="text-sm font-medium text-text-secondary hover:text-text-primary">
        ← Back to {event.title}
      </Link>
      <h1 className="mt-3 text-2xl font-bold tracking-tight text-text-primary">Edit Event</h1>
      <EditEventForm
        members={members.map((m) => ({ id: m.user.id, name: `${m.user.firstName} ${m.user.lastName}` }))}
        registeredUserIds={registeredUserIds}
        event={{
          id: event.id,
          clubId: event.clubId,
          title: event.title,
          description: event.description,
          category: event.category,
          startAt: event.startAt,
          endAt: event.endAt,
          building: event.building,
          room: event.room,
          address: event.address,
          maxParticipants: event.maxParticipants,
          waitlistEnabled: event.waitlistEnabled,
          awardsServiceHours: event.awardsServiceHours,
          defaultServiceHours: event.defaultServiceHours,
          serviceTaskDescription: event.serviceTaskDescription,
          attendanceEnabled: event.attendanceEnabled,
        }}
      />
    </div>
  );
}

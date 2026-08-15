"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { updateEventAction } from "@/app/actions/director-events";
import { Button } from "@/components/ui/button";
import { Input, Label, Textarea, Select, FieldError } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { EVENT_CATEGORIES } from "@/lib/constants";
import { format } from "date-fns";

type EventForEdit = {
  id: string;
  clubId: string;
  title: string;
  description: string;
  category: string;
  startAt: Date;
  endAt: Date;
  building: string | null;
  room: string | null;
  address: string | null;
  maxParticipants: number | null;
  waitlistEnabled: boolean;
  awardsServiceHours: boolean;
  defaultServiceHours: number;
  serviceTaskDescription: string | null;
  attendanceEnabled: boolean;
};

export function EditEventForm({
  event,
  members,
  registeredUserIds,
}: {
  event: EventForEdit;
  members: { id: string; name: string }[];
  registeredUserIds: string[];
}) {
  const router = useRouter();
  const [awardsServiceHours, setAwardsServiceHours] = useState(event.awardsServiceHours);
  const [assigned, setAssigned] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function toggleAssigned(id: string) {
    setAssigned((prev) => (prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]));
  }

  function handleSubmit(formData: FormData) {
    setError(null);
    assigned.forEach((id) => formData.append("assignedUserIds", id));
    startTransition(async () => {
      const res = await updateEventAction(event.id, formData);
      if (res?.error) setError(res.error);
      else router.push(`/director/${event.clubId}/events/${event.id}`);
    });
  }

  return (
    <form action={handleSubmit} className="mt-6 space-y-5">
      <Card>
        <CardContent className="space-y-4 p-5">
          <p className="text-sm font-semibold text-text-primary">Basic Information</p>
          <div>
            <Label htmlFor="title">Event name</Label>
            <Input id="title" name="title" defaultValue={event.title} required />
          </div>
          <div>
            <Label htmlFor="description">Description</Label>
            <Textarea id="description" name="description" rows={3} defaultValue={event.description} required />
          </div>
          <div>
            <Label htmlFor="category">Category</Label>
            <Select id="category" name="category" defaultValue={event.category}>
              {EVENT_CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </Select>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="space-y-4 p-5">
          <p className="text-sm font-semibold text-text-primary">Schedule</p>
          <div>
            <Label htmlFor="date">Date</Label>
            <Input id="date" name="date" type="date" defaultValue={format(event.startAt, "yyyy-MM-dd")} required />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="startTime">Start time</Label>
              <Input id="startTime" name="startTime" type="time" defaultValue={format(event.startAt, "HH:mm")} required />
            </div>
            <div>
              <Label htmlFor="endTime">End time</Label>
              <Input id="endTime" name="endTime" type="time" defaultValue={format(event.endAt, "HH:mm")} required />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="space-y-4 p-5">
          <p className="text-sm font-semibold text-text-primary">Location</p>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="building">Building</Label>
              <Input id="building" name="building" defaultValue={event.building ?? ""} />
            </div>
            <div>
              <Label htmlFor="room">Room</Label>
              <Input id="room" name="room" defaultValue={event.room ?? ""} />
            </div>
          </div>
          <div>
            <Label htmlFor="address">Address (optional)</Label>
            <Input id="address" name="address" defaultValue={event.address ?? ""} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="space-y-4 p-5">
          <p className="text-sm font-semibold text-text-primary">Registration</p>
          <div>
            <Label htmlFor="maxParticipants">Max participants (optional)</Label>
            <Input id="maxParticipants" name="maxParticipants" type="number" min={1} defaultValue={event.maxParticipants ?? ""} />
          </div>
          <label className="flex items-center gap-2 text-sm text-text-secondary">
            <input type="checkbox" name="waitlistEnabled" defaultChecked={event.waitlistEnabled} className="h-4 w-4 accent-accent" />
            Enable waitlist once full
          </label>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="space-y-3 p-5">
          <p className="text-sm font-semibold text-text-primary">Assign Students</p>
          <p className="text-xs text-text-muted">
            Check someone to put them on the roster right away — no Join needed. To take someone off the roster, use Remove in the
            Registrants list on the event page instead.
          </p>
          <div className="max-h-48 space-y-1 overflow-y-auto rounded-xl border border-border p-2">
            {members.length === 0 && <p className="p-2 text-sm text-text-muted">No members yet.</p>}
            {members.map((m) => {
              const alreadyRegistered = registeredUserIds.includes(m.id);
              return (
                <label
                  key={m.id}
                  className={`flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm ${alreadyRegistered ? "text-text-muted" : "hover:bg-surface-2"}`}
                >
                  <input
                    type="checkbox"
                    checked={alreadyRegistered || assigned.includes(m.id)}
                    disabled={alreadyRegistered}
                    onChange={() => toggleAssigned(m.id)}
                    className="h-4 w-4 accent-accent disabled:opacity-60"
                  />
                  {m.name}
                  {alreadyRegistered && <span className="text-xs">(already on roster)</span>}
                </label>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="space-y-3 p-5">
          <label className="flex items-center gap-2 text-sm font-semibold text-text-primary">
            <input
              type="checkbox"
              name="awardsServiceHours"
              checked={awardsServiceHours}
              onChange={(e) => setAwardsServiceHours(e.target.checked)}
              className="h-4 w-4 accent-accent"
            />
            Awards Service Hours
          </label>
          {awardsServiceHours && (
            <div className="space-y-3 pl-6">
              <div>
                <Label htmlFor="defaultServiceHours">Hours awarded</Label>
                <Input id="defaultServiceHours" name="defaultServiceHours" type="number" min={0} step={0.5} defaultValue={event.defaultServiceHours} />
              </div>
              <div>
                <Label htmlFor="serviceTaskDescription">Task description</Label>
                <Input id="serviceTaskDescription" name="serviceTaskDescription" defaultValue={event.serviceTaskDescription ?? ""} placeholder="e.g. Beach Cleanup" />
              </div>
            </div>
          )}
          <label className="flex items-center gap-2 text-sm font-semibold text-text-primary">
            <input type="checkbox" name="attendanceEnabled" defaultChecked={event.attendanceEnabled} className="h-4 w-4 accent-accent" />
            Track Attendance
          </label>
        </CardContent>
      </Card>

      <FieldError>{error}</FieldError>

      <Button type="submit" size="lg" className="w-full" disabled={pending}>
        {pending ? "Saving…" : "Save Changes"}
      </Button>
    </form>
  );
}

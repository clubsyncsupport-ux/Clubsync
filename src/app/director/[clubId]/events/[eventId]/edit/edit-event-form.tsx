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
  visibility: "PUBLIC" | "PRIVATE";
  allowedGrades: string[] | null;
  maxParticipants: number | null;
  registrationDeadline: Date | null;
  waitlistEnabled: boolean;
  waitlistCapacity: number | null;
  awardsServiceHours: boolean;
  defaultServiceHours: number;
  serviceTaskDescription: string | null;
  attendanceEnabled: boolean;
  isRecurring: boolean;
};

type RoleDraft = {
  key: string;
  id: string | null;
  name: string;
  capacity: string;
  allowedGrades: string[];
  waitlistCapacity: string;
  filledCount: number;
};

export function EditEventForm({
  event,
  members,
  registeredUserIds,
  invitedUserIds,
  groups = [],
  gradeLevels,
  roles: initialRoles,
}: {
  event: EventForEdit;
  members: { id: string; name: string }[];
  registeredUserIds: string[];
  invitedUserIds: string[];
  groups?: { id: string; name: string; color: string; memberIds: string[] }[];
  gradeLevels: string[];
  roles: { id: string; name: string; capacity: number; allowedGrades: string[] | null; waitlistCapacity: number | null; filledCount: number }[];
}) {
  const router = useRouter();
  const [visibility, setVisibility] = useState<"PUBLIC" | "PRIVATE">(event.visibility);
  const [invited, setInvited] = useState<string[]>(invitedUserIds);
  const [assigned, setAssigned] = useState<string[]>([]);
  const [awardsServiceHours, setAwardsServiceHours] = useState(event.awardsServiceHours);
  const [waitlistEnabled, setWaitlistEnabled] = useState(event.waitlistEnabled);
  const [endsNextDay, setEndsNextDay] = useState(() => format(event.startAt, "yyyy-MM-dd") !== format(event.endAt, "yyyy-MM-dd"));
  const [allowedGrades, setAllowedGrades] = useState<string[]>(event.allowedGrades ?? [...gradeLevels]);
  const [roles, setRoles] = useState<RoleDraft[]>(
    initialRoles.map((r) => ({
      key: r.id,
      id: r.id,
      name: r.name,
      capacity: String(r.capacity),
      allowedGrades: r.allowedGrades ?? [...gradeLevels],
      waitlistCapacity: r.waitlistCapacity ? String(r.waitlistCapacity) : "",
      filledCount: r.filledCount,
    }))
  );
  const [roleInput, setRoleInput] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function toggleInvite(id: string) {
    setInvited((prev) => (prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]));
  }

  function toggleAssigned(id: string) {
    setAssigned((prev) => (prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]));
  }

  function toggleAssignedGroup(memberIds: string[]) {
    setAssigned((prev) => {
      const allSelected = memberIds.every((id) => prev.includes(id));
      return allSelected ? prev.filter((id) => !memberIds.includes(id)) : Array.from(new Set([...prev, ...memberIds]));
    });
  }

  function toggleGrade(g: string) {
    setAllowedGrades((prev) => (prev.includes(g) ? prev.filter((x) => x !== g) : [...prev, g]));
  }

  function addRole() {
    const name = roleInput.trim();
    if (!name) return;
    if (roles.some((r) => r.name.toLowerCase() === name.toLowerCase())) {
      setRoleInput("");
      return;
    }
    setRoles((prev) => [
      ...prev,
      { key: crypto.randomUUID(), id: null, name, capacity: "1", allowedGrades: [...gradeLevels], waitlistCapacity: "", filledCount: 0 },
    ]);
    setRoleInput("");
  }

  function removeRole(key: string) {
    setRoles((prev) => prev.filter((r) => r.key !== key));
  }

  function setRoleName(key: string, name: string) {
    setRoles((prev) => prev.map((r) => (r.key === key ? { ...r, name } : r)));
  }

  function setRoleCapacity(key: string, capacity: string) {
    setRoles((prev) => prev.map((r) => (r.key === key ? { ...r, capacity } : r)));
  }

  function setRoleWaitlistCapacity(key: string, waitlistCapacity: string) {
    setRoles((prev) => prev.map((r) => (r.key === key ? { ...r, waitlistCapacity } : r)));
  }

  function toggleRoleGrade(key: string, grade: string) {
    setRoles((prev) =>
      prev.map((r) =>
        r.key === key ? { ...r, allowedGrades: r.allowedGrades.includes(grade) ? r.allowedGrades.filter((g) => g !== grade) : [...r.allowedGrades, grade] } : r
      )
    );
  }

  function handleSubmit(formData: FormData) {
    setError(null);
    const startTime = String(formData.get("startTime") ?? "");
    const endTime = String(formData.get("endTime") ?? "");
    if (!endsNextDay && startTime && endTime && endTime <= startTime) {
      setError('End time must be after start time — check "Ends the next day" above for an overnight event.');
      return;
    }
    if (allowedGrades.length === 0) {
      setError("Select at least one grade that can register — or select all of them for no restriction.");
      return;
    }
    for (const r of roles) {
      if (r.allowedGrades.length === 0) {
        setError(`Select at least one grade for the "${r.name}" role — or select all of them for no restriction.`);
        return;
      }
    }
    formData.set("visibility", visibility);
    if (visibility === "PRIVATE") invited.forEach((id) => formData.append("inviteUserIds", id));
    assigned.forEach((id) => formData.append("assignedUserIds", id));
    const removedRoleIds = initialRoles.map((r) => r.id).filter((id) => !roles.some((r) => r.id === id));
    removedRoleIds.forEach((id) => formData.append("removedRoleId", id));
    roles.forEach((r) => {
      formData.append("roleId", r.id ?? "");
      formData.append("roleName", r.name);
      formData.append("roleCapacity", String(Math.max(1, Number(r.capacity) || 1)));
      formData.append("roleAllowedGrades", r.allowedGrades.length < gradeLevels.length ? r.allowedGrades.join(",") : "");
      formData.append("roleWaitlistCapacity", r.waitlistCapacity.trim());
    });
    if (allowedGrades.length > 0 && allowedGrades.length < gradeLevels.length) {
      formData.set("allowedGrades", allowedGrades.join(","));
    }
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
          <label className="flex items-center gap-2 text-sm text-text-secondary">
            <input
              type="checkbox"
              name="endsNextDay"
              checked={endsNextDay}
              onChange={(e) => setEndsNextDay(e.target.checked)}
              className="h-4 w-4 accent-accent"
            />
            Ends the next day (overnight event)
          </label>
          {event.isRecurring && (
            <p className="text-xs text-text-muted">
              This is one occurrence of a recurring series. Changing the date/time here only moves this occurrence — use Cancel on the
              event page to remove occurrences from the series instead.
            </p>
          )}
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
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="maxParticipants">Max participants (optional)</Label>
              <Input
                id="maxParticipants"
                name="maxParticipants"
                type="number"
                min={1}
                defaultValue={event.maxParticipants ?? ""}
                disabled={roles.length > 0}
              />
              {roles.length > 0 && (
                <p className="mt-1 text-xs text-text-muted">Ignored while roles are defined below — each role&rsquo;s own capacity governs instead.</p>
              )}
            </div>
            <div>
              <Label htmlFor="registrationDeadline">Registration deadline (optional)</Label>
              <Input
                id="registrationDeadline"
                name="registrationDeadline"
                type="date"
                // A date-only value is stored as UTC midnight (see updateEventAction's
                // `new Date(registrationDeadlineRaw)`), so this reads it back via the
                // UTC components rather than date-fns' local-timezone `format` — otherwise
                // saving with no change to this field would drift it a day earlier in any
                // timezone behind UTC.
                defaultValue={event.registrationDeadline ? event.registrationDeadline.toISOString().slice(0, 10) : ""}
              />
            </div>
          </div>
          <label className="flex items-center gap-2 text-sm text-text-secondary">
            <input
              type="checkbox"
              name="waitlistEnabled"
              checked={waitlistEnabled}
              onChange={(e) => setWaitlistEnabled(e.target.checked)}
              className="h-4 w-4 accent-accent"
            />
            Enable waitlist once full
          </label>
          {waitlistEnabled && (
            <div className="pl-6">
              <Label htmlFor="waitlistCapacity">Waitlist limit (optional)</Label>
              <Input
                id="waitlistCapacity"
                name="waitlistCapacity"
                type="number"
                min={1}
                placeholder="No limit"
                defaultValue={event.waitlistCapacity ?? ""}
                className="max-w-32"
              />
            </div>
          )}
          <div>
            <Label>Grades allowed to register</Label>
            <div className="flex flex-wrap gap-2">
              {gradeLevels.map((g) => (
                <button
                  key={g}
                  type="button"
                  onClick={() => toggleGrade(g)}
                  className={`rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${allowedGrades.includes(g) ? "border-accent bg-accent-soft text-accent-soft-text" : "border-border text-text-secondary"}`}
                >
                  {g.replace("Grade ", "")}
                </button>
              ))}
            </div>
            <p className="mt-1.5 text-xs text-text-muted">
              {allowedGrades.length === gradeLevels.length ? "Open to every grade." : "Students outside these grades can still see the event, just not register."}
            </p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="space-y-3 p-5">
          <p className="text-sm font-semibold text-text-primary">Roles (optional)</p>
          <p className="text-xs text-text-muted">
            Add roles like &ldquo;Setup Crew&rdquo; or &ldquo;Referee&rdquo; with how many people you need for each. If you add any
            roles, everyone who joins has to pick one — that way you can see exactly which roles still need people.
          </p>
          <div className="flex gap-2">
            <Input
              value={roleInput}
              onChange={(e) => setRoleInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  addRole();
                }
              }}
              placeholder="Type a role name and press Enter"
            />
            <Button type="button" variant="secondary" onClick={addRole}>
              Add
            </Button>
          </div>
          {roles.length > 0 && (
            <div className="space-y-2">
              {roles.map((r) => (
                <div key={r.key} className="space-y-2 rounded-xl border border-border p-3">
                  <div className="flex items-center gap-3">
                    <Input value={r.name} onChange={(e) => setRoleName(r.key, e.target.value)} className="min-w-0 flex-1" />
                    <Label htmlFor={`role-capacity-${r.key}`} className="mb-0 shrink-0 text-xs text-text-muted">
                      Needed
                    </Label>
                    <div className="w-16 shrink-0">
                      <Input
                        id={`role-capacity-${r.key}`}
                        type="number"
                        min={1}
                        value={r.capacity}
                        onChange={(e) => setRoleCapacity(r.key, e.target.value)}
                      />
                    </div>
                    {r.filledCount > 0 ? (
                      <span className="shrink-0 text-xs text-text-muted" title="Roles with registrants can't be removed here — remove people from the roster first.">
                        {r.filledCount} signed up
                      </span>
                    ) : (
                      <button type="button" onClick={() => removeRole(r.key)} className="shrink-0 text-xs font-medium text-danger">
                        Remove
                      </button>
                    )}
                  </div>
                  <div className="pl-0.5">
                    <p className="mb-1 text-xs text-text-muted">Grades allowed for this role — tap to toggle which ones can join it:</p>
                    <div className="flex flex-wrap items-center gap-1.5">
                      {gradeLevels.map((g) => (
                        <button
                          key={g}
                          type="button"
                          onClick={() => toggleRoleGrade(r.key, g)}
                          title={r.allowedGrades.includes(g) ? `Remove ${g} from this role` : `Allow ${g} for this role`}
                          className={`rounded-full border px-2 py-0.5 text-[11px] font-medium transition-colors ${
                            r.allowedGrades.includes(g) ? "border-accent bg-accent-soft text-accent-soft-text" : "border-border text-text-secondary"
                          }`}
                        >
                          {g.replace("Grade ", "")}
                        </button>
                      ))}
                    </div>
                    <p className="mt-1 text-xs text-text-muted">
                      {r.allowedGrades.length === gradeLevels.length ? "Open to every grade." : "Highlighted grades can join this role — others can't."}
                    </p>
                  </div>
                  {waitlistEnabled && (
                    <div className="flex items-center gap-2 pl-0.5">
                      <Label htmlFor={`role-waitlist-${r.key}`} className="mb-0 shrink-0 text-xs text-text-muted">
                        Waitlist limit for this role (optional)
                      </Label>
                      <div className="w-20 shrink-0">
                        <Input
                          id={`role-waitlist-${r.key}`}
                          type="number"
                          min={1}
                          placeholder="No limit"
                          value={r.waitlistCapacity}
                          onChange={(e) => setRoleWaitlistCapacity(r.key, e.target.value)}
                        />
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardContent className="space-y-3 p-5">
          <p className="text-sm font-semibold text-text-primary">Assign Students</p>
          <p className="text-xs text-text-muted">
            Check someone to put them on the roster right away — no Join needed. To take someone off the roster, use Remove in the
            Registrants list on the event page instead.
          </p>
          {groups.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {groups.map((g) => {
                const allSelected = g.memberIds.length > 0 && g.memberIds.every((id) => assigned.includes(id) || registeredUserIds.includes(id));
                return (
                  <button
                    key={g.id}
                    type="button"
                    onClick={() => toggleAssignedGroup(g.memberIds.filter((id) => !registeredUserIds.includes(id)))}
                    title={allSelected ? `Remove everyone in ${g.name}` : `Select everyone in ${g.name}`}
                    className={`flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium transition-colors ${
                      allSelected ? "border-accent bg-accent-soft text-accent-soft-text" : "border-border text-text-secondary hover:bg-surface-2"
                    }`}
                  >
                    <span className="h-2 w-2 rounded-full" style={{ backgroundColor: g.color }} />
                    {g.name} ({g.memberIds.length})
                  </button>
                );
              })}
            </div>
          )}
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

      <Card>
        <CardContent className="space-y-3 p-5">
          <p className="text-sm font-semibold text-text-primary">Visibility</p>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setVisibility("PUBLIC")}
              className={`flex-1 rounded-xl border px-3 py-2 text-sm font-medium ${visibility === "PUBLIC" ? "border-accent bg-accent-soft text-accent-soft-text" : "border-border text-text-secondary"}`}
            >
              Public — all members
            </button>
            <button
              type="button"
              onClick={() => setVisibility("PRIVATE")}
              className={`flex-1 rounded-xl border px-3 py-2 text-sm font-medium ${visibility === "PRIVATE" ? "border-accent bg-accent-soft text-accent-soft-text" : "border-border text-text-secondary"}`}
            >
              Private — selected members
            </button>
          </div>
          {visibility === "PRIVATE" && (
            <>
              <div className="max-h-48 space-y-1 overflow-y-auto rounded-xl border border-border p-2">
                {members.length === 0 && <p className="p-2 text-sm text-text-muted">No members yet.</p>}
                {members.map((m) => {
                  const alreadyRegistered = registeredUserIds.includes(m.id);
                  return (
                    <label key={m.id} className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm hover:bg-surface-2">
                      <input
                        type="checkbox"
                        checked={alreadyRegistered || invited.includes(m.id)}
                        disabled={alreadyRegistered}
                        onChange={() => toggleInvite(m.id)}
                        className="h-4 w-4 accent-accent disabled:opacity-60"
                      />
                      {m.name}
                      {alreadyRegistered && <span className="text-xs text-text-muted">(on roster — always visible to them)</span>}
                    </label>
                  );
                })}
              </div>
              {assigned.length > 0 && (
                <p className="text-xs text-text-muted">
                  Newly assigned students can always see this event, whether or not they&rsquo;re checked above.
                </p>
              )}
            </>
          )}
        </CardContent>
      </Card>

      <FieldError>{error}</FieldError>

      <Button type="submit" size="lg" className="w-full" disabled={pending}>
        {pending ? "Saving…" : "Save Changes"}
      </Button>
    </form>
  );
}

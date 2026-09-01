"use client";

import { useState, useTransition } from "react";
import { createEventAction } from "@/app/actions/director-events";
import { Button } from "@/components/ui/button";
import { Input, Label, Textarea, Select, FieldError } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { FileUploadButton } from "@/components/ui/file-upload-button";
import { EVENT_CATEGORIES } from "@/lib/constants";

export type EventPrefill = {
  title: string;
  description: string;
  category: string;
  building: string;
  room: string;
  address: string;
  maxParticipants: number | null;
  waitlistEnabled: boolean;
  allowedGrades: string[] | null;
  awardsServiceHours: boolean;
  defaultServiceHours: number;
  serviceTaskDescription: string;
  attendanceEnabled: boolean;
  visibility: "PUBLIC" | "PRIVATE";
};

export function CreateEventForm({
  clubId,
  members,
  groups = [],
  gradeLevels,
  prefill,
}: {
  clubId: string;
  members: { id: string; name: string }[];
  /** Director-defined tags (e.g. "Executive Team") for bulk-selecting a
   * known set of members instead of checking each name individually. */
  groups?: { id: string; name: string; color: string; memberIds: string[] }[];
  /** This club's school's configured grade levels — what the "allowed
   * grades" picker offers, in place of the global default list. */
  gradeLevels: string[];
  /** Pre-fills the form from an existing event (via "Copy Event"). Date/time,
   * recurrence, invite/assigned lists, and attachments are deliberately never
   * copied — those are per-instance, not part of the event "template". */
  prefill?: EventPrefill;
}) {
  const [visibility, setVisibility] = useState<"PUBLIC" | "PRIVATE">(prefill?.visibility ?? "PUBLIC");
  const [invited, setInvited] = useState<string[]>([]);
  const [assigned, setAssigned] = useState<string[]>([]);
  const [awardsServiceHours, setAwardsServiceHours] = useState(prefill?.awardsServiceHours ?? false);
  const [waitlistEnabled, setWaitlistEnabled] = useState(prefill?.waitlistEnabled ?? false);
  const [recurrence, setRecurrence] = useState<"NONE" | "DAILY" | "WEEKLY" | "MONTHLY">("NONE");
  const [allowedGrades, setAllowedGrades] = useState<string[]>(prefill?.allowedGrades ?? [...gradeLevels]);
  const [roles, setRoles] = useState<{ name: string; capacity: string; allowedGrades: string[]; waitlistCapacity: string }[]>([]);
  const [roleInput, setRoleInput] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function toggleInvite(id: string) {
    setInvited((prev) => (prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]));
  }

  function toggleAssigned(id: string) {
    setAssigned((prev) => (prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]));
  }

  // Clicking a group selects every member of it that isn't already
  // selected; clicking again (once everyone in it is selected) clears just
  // that group's members back out — either way, individual names can still
  // be checked/unchecked afterward.
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
    setRoles((prev) => [...prev, { name, capacity: "1", allowedGrades: [...gradeLevels], waitlistCapacity: "" }]);
    setRoleInput("");
  }

  function removeRole(name: string) {
    setRoles((prev) => prev.filter((r) => r.name !== name));
  }

  function setRoleCapacity(name: string, capacity: string) {
    setRoles((prev) => prev.map((r) => (r.name === name ? { ...r, capacity } : r)));
  }

  function setRoleWaitlistCapacity(name: string, waitlistCapacity: string) {
    setRoles((prev) => prev.map((r) => (r.name === name ? { ...r, waitlistCapacity } : r)));
  }

  function toggleRoleGrade(name: string, grade: string) {
    setRoles((prev) =>
      prev.map((r) =>
        r.name === name ? { ...r, allowedGrades: r.allowedGrades.includes(grade) ? r.allowedGrades.filter((g) => g !== grade) : [...r.allowedGrades, grade] } : r
      )
    );
  }

  function handleSubmit(formData: FormData) {
    setError(null);
    if (allowedGrades.length === 0) {
      setError("Select at least one grade that can register — or select all of them for no restriction.");
      return;
    }
    formData.set("visibility", visibility);
    if (visibility === "PRIVATE") invited.forEach((id) => formData.append("inviteUserIds", id));
    assigned.forEach((id) => formData.append("assignedUserIds", id));
    for (const r of roles) {
      if (r.allowedGrades.length === 0) {
        setError(`Select at least one grade for the "${r.name}" role — or select all of them for no restriction.`);
        return;
      }
    }
    roles.forEach((r) => {
      formData.append("roleName", r.name);
      formData.append("roleCapacity", String(Math.max(1, Number(r.capacity) || 1)));
      // Empty string means "every grade" — same convention as the event-level restriction.
      formData.append("roleAllowedGrades", r.allowedGrades.length < gradeLevels.length ? r.allowedGrades.join(",") : "");
      formData.append("roleWaitlistCapacity", r.waitlistCapacity.trim());
    });
    // Only send a restriction if it's not "every grade" — that's the same as no restriction.
    if (allowedGrades.length > 0 && allowedGrades.length < gradeLevels.length) {
      formData.set("allowedGrades", allowedGrades.join(","));
    }
    startTransition(async () => {
      const res = await createEventAction(clubId, formData);
      if (res?.error) setError(res.error);
    });
  }

  return (
    <form action={handleSubmit} className="mt-6 space-y-5">
      <Card>
        <CardContent className="space-y-4 p-5">
          <p className="text-sm font-semibold text-text-primary">Basic Information</p>
          <div>
            <Label htmlFor="title">Event name</Label>
            <Input id="title" name="title" defaultValue={prefill?.title} required />
          </div>
          <div>
            <Label htmlFor="description">Description</Label>
            <Textarea id="description" name="description" rows={3} defaultValue={prefill?.description} required />
          </div>
          <div>
            <Label htmlFor="category">Category</Label>
            <Select id="category" name="category" defaultValue={prefill?.category ?? "Meeting"}>
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
            <Input id="date" name="date" type="date" required />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="startTime">Start time</Label>
              <Input id="startTime" name="startTime" type="time" defaultValue="15:30" required />
            </div>
            <div>
              <Label htmlFor="endTime">End time</Label>
              <Input id="endTime" name="endTime" type="time" defaultValue="16:30" required />
            </div>
          </div>
          <div>
            <Label htmlFor="recurrence">Repeats</Label>
            <Select id="recurrence" name="recurrence" value={recurrence} onChange={(e) => setRecurrence(e.target.value as typeof recurrence)}>
              <option value="NONE">Does not repeat</option>
              <option value="DAILY">Daily</option>
              <option value="WEEKLY">Weekly</option>
              <option value="MONTHLY">Monthly</option>
            </Select>
          </div>
          {recurrence !== "NONE" && (
            <div>
              <Label htmlFor="recurrenceUntil">Repeat until</Label>
              <Input id="recurrenceUntil" name="recurrenceUntil" type="date" required />
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardContent className="space-y-4 p-5">
          <p className="text-sm font-semibold text-text-primary">Location</p>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="building">Building</Label>
              <Input id="building" name="building" defaultValue={prefill?.building} />
            </div>
            <div>
              <Label htmlFor="room">Room</Label>
              <Input id="room" name="room" defaultValue={prefill?.room} />
            </div>
          </div>
          <div>
            <Label htmlFor="address">Address (optional)</Label>
            <Input id="address" name="address" defaultValue={prefill?.address} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="space-y-4 p-5">
          <p className="text-sm font-semibold text-text-primary">Registration</p>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="maxParticipants">Max participants (optional)</Label>
              <Input id="maxParticipants" name="maxParticipants" type="number" min={1} defaultValue={prefill?.maxParticipants ?? undefined} disabled={roles.length > 0} />
              {roles.length > 0 && (
                <p className="mt-1 text-xs text-text-muted">Ignored once you add roles below — each role&rsquo;s own capacity governs instead.</p>
              )}
            </div>
            <div>
              <Label htmlFor="registrationDeadline">Registration deadline (optional)</Label>
              <Input id="registrationDeadline" name="registrationDeadline" type="date" />
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
              <Input id="waitlistCapacity" name="waitlistCapacity" type="number" min={1} placeholder="No limit" className="max-w-32" />
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
                <div key={r.name} className="space-y-2 rounded-xl border border-border p-3">
                  <div className="flex items-center gap-3">
                    <span className="min-w-0 flex-1 truncate text-sm font-medium text-text-primary">{r.name}</span>
                    <Label htmlFor={`role-capacity-${r.name}`} className="mb-0 shrink-0 text-xs text-text-muted">
                      Needed
                    </Label>
                    <div className="w-16 shrink-0">
                      <Input
                        id={`role-capacity-${r.name}`}
                        type="number"
                        min={1}
                        value={r.capacity}
                        onChange={(e) => setRoleCapacity(r.name, e.target.value)}
                      />
                    </div>
                    <button type="button" onClick={() => removeRole(r.name)} className="shrink-0 text-xs font-medium text-danger">
                      Remove
                    </button>
                  </div>
                  <div className="pl-0.5">
                    <p className="mb-1 text-xs text-text-muted">Grades allowed for this role — tap to toggle which ones can join it:</p>
                    <div className="flex flex-wrap items-center gap-1.5">
                      {gradeLevels.map((g) => (
                        <button
                          key={g}
                          type="button"
                          onClick={() => toggleRoleGrade(r.name, g)}
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
                      <Label htmlFor={`role-waitlist-${r.name}`} className="mb-0 shrink-0 text-xs text-text-muted">
                        Waitlist limit for this role (optional)
                      </Label>
                      <div className="w-20 shrink-0">
                        <Input
                          id={`role-waitlist-${r.name}`}
                          type="number"
                          min={1}
                          placeholder="No limit"
                          value={r.waitlistCapacity}
                          onChange={(e) => setRoleWaitlistCapacity(r.name, e.target.value)}
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
        <CardContent className="space-y-4 p-5">
          <p className="text-sm font-semibold text-text-primary">Attachments (optional)</p>
          <p className="text-xs text-text-muted">Permission forms, posters, or any files members should see when they register. You can add more later too.</p>
          <FileUploadButton name="attachments" multiple accept="image/*,.pdf,.doc,.docx,video/*" label="Add Files" />
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
                <Input id="defaultServiceHours" name="defaultServiceHours" type="number" min={0} step={0.5} defaultValue={prefill?.defaultServiceHours ?? 1} />
              </div>
              <div>
                <Label htmlFor="serviceTaskDescription">Task description</Label>
                <Input id="serviceTaskDescription" name="serviceTaskDescription" placeholder="e.g. Beach Cleanup" defaultValue={prefill?.serviceTaskDescription} />
              </div>
            </div>
          )}
          <label className="flex items-center gap-2 text-sm font-semibold text-text-primary">
            <input type="checkbox" name="attendanceEnabled" defaultChecked={prefill?.attendanceEnabled} className="h-4 w-4 accent-accent" />
            Track Attendance
          </label>
          <p className="pl-6 text-xs text-text-muted">
            Adds an Attendance page to mark who showed up — works with or without service hours, e.g. for a weekly meeting.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="space-y-3 p-5">
          <p className="text-sm font-semibold text-text-primary">Assign Students (optional)</p>
          <p className="text-xs text-text-muted">
            Assigned students are put on the roster automatically — no Join button needed. Leave everyone unchecked for a normal
            event where members join themselves.
          </p>
          {groups.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {groups.map((g) => {
                const allSelected = g.memberIds.length > 0 && g.memberIds.every((id) => assigned.includes(id));
                return (
                  <button
                    key={g.id}
                    type="button"
                    onClick={() => toggleAssignedGroup(g.memberIds)}
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
            {members.map((m) => (
              <label key={m.id} className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm hover:bg-surface-2">
                <input type="checkbox" checked={assigned.includes(m.id)} onChange={() => toggleAssigned(m.id)} className="h-4 w-4 accent-accent" />
                {m.name}
              </label>
            ))}
          </div>
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
                {members.map((m) => (
                  <label key={m.id} className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm hover:bg-surface-2">
                    <input type="checkbox" checked={invited.includes(m.id)} onChange={() => toggleInvite(m.id)} className="h-4 w-4 accent-accent" />
                    {m.name}
                  </label>
                ))}
              </div>
              {assigned.length > 0 && (
                <p className="text-xs text-text-muted">
                  Assigned Members ({assigned.length}) can always see this event, whether or not they&rsquo;re checked above. To make
                  this event visible <em>only</em> to the students you assigned, leave everyone else here unchecked.
                </p>
              )}
            </>
          )}
        </CardContent>
      </Card>

      <FieldError>{error}</FieldError>

      <Button type="submit" size="lg" className="w-full" disabled={pending}>
        {pending ? "Creating…" : "Create Event"}
      </Button>
    </form>
  );
}

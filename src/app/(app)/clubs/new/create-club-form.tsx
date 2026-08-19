"use client";

import { useActionState, useEffect, useState } from "react";
import { createClubAction, checkClubNameForSchoolAction } from "@/app/actions/clubs";
import { Button } from "@/components/ui/button";
import { Input, Label, Textarea, FieldError } from "@/components/ui/input";
import { ClubColorPicker } from "@/components/ui/club-color-picker";
import { CategoryMultiSelect } from "@/components/ui/category-multi-select";
import { Avatar } from "@/components/ui/avatar";
import { cn } from "@/lib/cn";
import { CLUB_CATEGORIES, CLUB_COLOR_PALETTE } from "@/lib/constants";

type Teacher = { id: string; firstName: string; lastName: string; avatarUrl: string | null };

export function CreateClubForm({ takenColors = [], teachers = [] }: { takenColors?: string[]; teachers?: Teacher[] }) {
  const [state, formAction, pending] = useActionState(createClubAction, { error: null });
  const [name, setName] = useState("");
  const [categories, setCategories] = useState<string[]>([CLUB_CATEGORIES[0]]);
  const [color, setColor] = useState<string>(CLUB_COLOR_PALETTE.find((c) => !takenColors.includes(c.value))?.value ?? CLUB_COLOR_PALETTE[0].value);
  const [similarClubs, setSimilarClubs] = useState<{ id: string; name: string }[]>([]);
  const [supervisorId, setSupervisorId] = useState<string>("");

  useEffect(() => {
    const t = setTimeout(() => {
      if (name.trim().length >= 3) {
        checkClubNameForSchoolAction(name).then((r) => setSimilarClubs(r.similar));
      } else {
        setSimilarClubs([]);
      }
    }, 400);
    return () => clearTimeout(t);
  }, [name]);

  const needsSupervisor = teachers.length > 0;

  return (
    <form action={formAction} className="mt-6 space-y-4">
      <div>
        <Label htmlFor="name">Club name</Label>
        <Input id="name" name="name" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Chess Club" required />
        {similarClubs.length > 0 && (
          <div className="mt-2 rounded-xl border border-warning/30 bg-warning-soft p-3 text-sm text-warning">
            <p className="font-medium">A club with a similar name may already exist:</p>
            <ul className="mt-1 list-disc pl-4">
              {similarClubs.map((c) => (
                <li key={c.id}>{c.name}</li>
              ))}
            </ul>
            <p className="mt-1 text-xs">You can still continue if this is genuinely a different club.</p>
          </div>
        )}
      </div>
      <div>
        <Label htmlFor="description">Description</Label>
        <Textarea id="description" name="description" rows={3} required />
      </div>
      <div>
        <Label>Category</Label>
        <CategoryMultiSelect value={categories} onChange={setCategories} />
      </div>
      <div>
        <Label>Club color</Label>
        <input type="hidden" name="color" value={color} />
        <ClubColorPicker value={color} onChange={setColor} takenColors={takenColors} />
      </div>
      <div>
        <Label htmlFor="meetingSchedule">Meeting schedule (optional)</Label>
        <Input id="meetingSchedule" name="meetingSchedule" placeholder="e.g. Tuesdays 3:30 PM, Room 204" />
      </div>

      {needsSupervisor && (
        <div>
          <Label>Supervisor</Label>
          <p className="mb-2 text-xs text-text-muted">
            Pick the teacher who&rsquo;ll supervise this club — they&rsquo;ll need to approve it before it goes live.
          </p>
          <input type="hidden" name="supervisorId" value={supervisorId} />
          {teachers.length === 0 ? (
            <p className="rounded-xl border border-dashed border-border p-4 text-center text-sm text-text-muted">
              No teachers have signed up at your school yet. Ask a teacher to create a ClubSync account first.
            </p>
          ) : (
            <div className="max-h-56 space-y-1.5 overflow-y-auto rounded-xl border border-border p-2">
              {teachers.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setSupervisorId(t.id)}
                  className={cn(
                    "flex w-full items-center gap-3 rounded-lg border px-3 py-2 text-left transition-colors",
                    supervisorId === t.id ? "border-accent bg-accent-soft" : "border-transparent hover:bg-surface-2"
                  )}
                >
                  <Avatar firstName={t.firstName} lastName={t.lastName} src={t.avatarUrl} size="sm" />
                  <span className="text-sm font-medium text-text-primary">
                    {t.firstName} {t.lastName}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      <FieldError>{state.error}</FieldError>

      <Button type="submit" size="lg" className="w-full" disabled={pending || (needsSupervisor && !supervisorId)}>
        {pending ? "Creating club…" : needsSupervisor ? "Submit for Approval" : "Create Club"}
      </Button>
    </form>
  );
}

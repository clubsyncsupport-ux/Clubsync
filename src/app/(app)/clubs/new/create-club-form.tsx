"use client";

import { useActionState, useEffect, useState } from "react";
import { createClubAction, checkClubNameForSchoolAction } from "@/app/actions/clubs";
import { Button } from "@/components/ui/button";
import { Input, Label, Textarea, FieldError } from "@/components/ui/input";
import { ClubColorPicker } from "@/components/ui/club-color-picker";
import { CategoryMultiSelect } from "@/components/ui/category-multi-select";
import { CLUB_CATEGORIES, CLUB_COLOR_PALETTE } from "@/lib/constants";

export function CreateClubForm({ takenColors = [] }: { takenColors?: string[] }) {
  const [state, formAction, pending] = useActionState(createClubAction, { error: null });
  const [name, setName] = useState("");
  const [categories, setCategories] = useState<string[]>([CLUB_CATEGORIES[0]]);
  const [color, setColor] = useState<string>(CLUB_COLOR_PALETTE.find((c) => !takenColors.includes(c.value))?.value ?? CLUB_COLOR_PALETTE[0].value);
  const [similarClubs, setSimilarClubs] = useState<{ id: string; name: string }[]>([]);

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

      <FieldError>{state.error}</FieldError>

      <Button type="submit" size="lg" className="w-full" disabled={pending}>
        {pending ? "Creating club…" : "Create Club"}
      </Button>
    </form>
  );
}

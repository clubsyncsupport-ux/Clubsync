"use client";

import { useActionState, useState } from "react";
import { createClubAsSchoolAdminAction } from "@/app/actions/school-admin";
import { Button } from "@/components/ui/button";
import { Input, Label, Textarea, FieldError } from "@/components/ui/input";
import { ClubColorPicker } from "@/components/ui/club-color-picker";
import { CategoryMultiSelect } from "@/components/ui/category-multi-select";
import { CLUB_CATEGORIES, CLUB_COLOR_PALETTE } from "@/lib/constants";

export function CreateClubForm({ schoolId, takenColors = [] }: { schoolId: string; takenColors?: string[] }) {
  const [state, formAction, pending] = useActionState(createClubAsSchoolAdminAction.bind(null, schoolId), { error: null });
  const [categories, setCategories] = useState<string[]>([CLUB_CATEGORIES[0]]);
  const [color, setColor] = useState<string>(CLUB_COLOR_PALETTE.find((c) => !takenColors.includes(c.value))?.value ?? CLUB_COLOR_PALETTE[0].value);

  return (
    <form action={formAction} className="mt-3 space-y-4">
      <div>
        <Label htmlFor="name">Club name</Label>
        <Input id="name" name="name" placeholder="e.g. Chess Club" required />
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

      <Button type="submit" disabled={pending}>
        {pending ? "Creating…" : "Create Club"}
      </Button>
    </form>
  );
}

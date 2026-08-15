"use client";

import { useActionState } from "react";
import { updateSchoolAction } from "@/app/actions/admin";
import { Button } from "@/components/ui/button";
import { Input, Label, FieldError } from "@/components/ui/input";

export function SchoolBasicInfoForm({
  schoolId,
  school,
}: {
  schoolId: string;
  school: { name: string; city: string | null; region: string | null; country: string | null };
}) {
  const [state, formAction, pending] = useActionState(updateSchoolAction.bind(null, schoolId), { error: null });

  return (
    <form action={formAction} className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      <div className="col-span-2 sm:col-span-1">
        <Label htmlFor="name">School name</Label>
        <Input id="name" name="name" defaultValue={school.name} required />
      </div>
      <div>
        <Label htmlFor="city">City</Label>
        <Input id="city" name="city" defaultValue={school.city ?? ""} />
      </div>
      <div>
        <Label htmlFor="region">Region / State</Label>
        <Input id="region" name="region" defaultValue={school.region ?? ""} />
      </div>
      <div>
        <Label htmlFor="country">Country</Label>
        <Input id="country" name="country" defaultValue={school.country ?? ""} />
      </div>
      <div className="col-span-2 flex items-center gap-3 sm:col-span-4">
        <Button type="submit" disabled={pending}>
          {pending ? "Saving…" : "Save Changes"}
        </Button>
        {state.success && <p className="text-sm text-success">Saved.</p>}
        <FieldError>{state.error}</FieldError>
      </div>
    </form>
  );
}

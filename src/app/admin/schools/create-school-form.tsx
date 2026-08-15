"use client";

import { useActionState } from "react";
import { createSchoolAction } from "@/app/actions/admin";
import { Button } from "@/components/ui/button";
import { Input, Label, FieldError } from "@/components/ui/input";

export function CreateSchoolForm() {
  const [state, formAction, pending] = useActionState(createSchoolAction, { error: null });

  return (
    <form action={formAction} className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
      <div className="col-span-2 sm:col-span-1">
        <Label htmlFor="name">School name</Label>
        <Input id="name" name="name" required />
      </div>
      <div>
        <Label htmlFor="city">City</Label>
        <Input id="city" name="city" />
      </div>
      <div>
        <Label htmlFor="region">Region / State</Label>
        <Input id="region" name="region" />
      </div>
      <div>
        <Label htmlFor="country">Country</Label>
        <Input id="country" name="country" />
      </div>
      <div className="col-span-2 sm:col-span-4">
        <Button type="submit" disabled={pending}>
          {pending ? "Adding…" : "Add School"}
        </Button>
        <FieldError>{state.error}</FieldError>
      </div>
    </form>
  );
}

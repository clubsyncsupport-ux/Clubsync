"use client";

import { useActionState } from "react";
import { assignSchoolAdminAction } from "@/app/actions/admin";
import { Button } from "@/components/ui/button";
import { Input, FieldError } from "@/components/ui/input";

export function AssignSchoolAdminForm({ schoolId }: { schoolId: string }) {
  const [state, formAction, pending] = useActionState(assignSchoolAdminAction.bind(null, schoolId), { error: null });

  return (
    <form action={formAction} className="mt-3 flex items-end gap-2">
      <Input name="identifier" type="email" placeholder="email" className="flex-1" required />
      <Button type="submit" disabled={pending}>
        {pending ? "…" : "Assign"}
      </Button>
      {state.success && <p className="text-sm text-success">Assigned.</p>}
      <FieldError>{state.error}</FieldError>
    </form>
  );
}

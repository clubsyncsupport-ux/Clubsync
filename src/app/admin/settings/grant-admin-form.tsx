"use client";

import { useActionState } from "react";
import { grantAdminByIdentifierAction } from "@/app/actions/admin";
import { Button } from "@/components/ui/button";
import { Input, FieldError } from "@/components/ui/input";

export function GrantAdminForm() {
  const [state, formAction, pending] = useActionState(grantAdminByIdentifierAction, { error: null });

  return (
    <form action={formAction} className="mt-3 flex items-end gap-2">
      <Input name="identifier" type="email" placeholder="email" className="flex-1" required />
      <Button type="submit" disabled={pending}>
        {pending ? "…" : "Grant Access"}
      </Button>
      {state.success && <p className="text-sm text-success">Granted.</p>}
      <FieldError>{state.error}</FieldError>
    </form>
  );
}

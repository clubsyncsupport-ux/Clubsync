"use client";

import { useActionState } from "react";
import { updateStudentGradeAction } from "@/app/actions/school-admin";
import { Select, FieldError } from "@/components/ui/input";

export function EditGradeForm({ userId, currentGrade, gradeLevels }: { userId: string; currentGrade: string | null; gradeLevels: string[] }) {
  const [state, formAction, pending] = useActionState(updateStudentGradeAction.bind(null, userId), { error: null });

  return (
    <form action={formAction} className="flex flex-wrap items-center gap-2">
      <Select name="grade" defaultValue={currentGrade ?? gradeLevels[0]} disabled={pending} className="w-auto">
        {gradeLevels.map((g) => (
          <option key={g} value={g}>
            {g}
          </option>
        ))}
      </Select>
      <button type="submit" disabled={pending} className="text-xs font-medium text-accent hover:underline disabled:opacity-50">
        {pending ? "Saving…" : "Save"}
      </button>
      {state.success && <span className="text-xs text-success">Saved</span>}
      <FieldError>{state.error}</FieldError>
    </form>
  );
}

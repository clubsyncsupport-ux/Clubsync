"use client";

import { useActionState, useState } from "react";
import { updateGradeLevelsAction } from "@/app/actions/school-admin";
import { Button } from "@/components/ui/button";
import { FieldError } from "@/components/ui/input";
import { GRADES } from "@/lib/constants";
import { cn } from "@/lib/cn";

export function GradeLevelsForm({ schoolId, current }: { schoolId: string; current: string[] }) {
  const [state, formAction, pending] = useActionState(updateGradeLevelsAction.bind(null, schoolId), { error: null });
  const [selected, setSelected] = useState<string[]>(current);

  function toggle(g: string) {
    setSelected((prev) => (prev.includes(g) ? prev.filter((x) => x !== g) : [...prev, g]));
  }

  return (
    <form action={formAction} className="space-y-3">
      <div className="flex flex-wrap gap-2">
        {GRADES.map((g) => {
          const isSelected = selected.includes(g);
          return (
            <label
              key={g}
              className={cn(
                "cursor-pointer rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
                isSelected ? "border-accent bg-accent-soft text-accent-soft-text" : "border-border text-text-secondary hover:border-border-strong"
              )}
            >
              <input type="checkbox" name="gradeLevels" value={g} checked={isSelected} onChange={() => toggle(g)} className="sr-only" />
              {g}
            </label>
          );
        })}
      </div>
      <p className="text-xs text-text-muted">
        Only these grades will be offered when creating events, grouping members, and running end-of-year grade advancement at this
        school.
      </p>
      <div className="flex items-center gap-3">
        <Button type="submit" disabled={pending}>
          {pending ? "Saving…" : "Save Grade Levels"}
        </Button>
        {state.success && <p className="text-sm text-success">Saved.</p>}
        <FieldError>{state.error}</FieldError>
      </div>
    </form>
  );
}

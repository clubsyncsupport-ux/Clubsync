"use client";

import { useActionState, useState } from "react";
import { updateServiceHourGoalAction } from "@/app/actions/settings";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/cn";
import { SERVICE_HOUR_GOALS } from "@/lib/constants";

export function ServiceHourGoalForm({ current }: { current: number }) {
  const [state, formAction, pending] = useActionState(updateServiceHourGoalAction, { error: null });
  const [goal, setGoal] = useState(String(current));

  return (
    <Card id="service-hours">
      <CardHeader>
        <CardTitle>Service Hour Goal</CardTitle>
      </CardHeader>
      <CardContent>
        <form action={formAction} className="space-y-4">
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-5">
            {SERVICE_HOUR_GOALS.map((g) => (
              <button
                type="button"
                key={g}
                onClick={() => setGoal(String(g))}
                className={cn(
                  "rounded-xl border px-2 py-2 text-sm font-semibold transition-colors",
                  Number(goal) === g ? "border-accent bg-accent-soft text-accent-soft-text" : "border-border text-text-secondary hover:border-border-strong"
                )}
              >
                {g}
              </button>
            ))}
          </div>
          <Input type="number" name="serviceHourGoal" min={1} value={goal} onChange={(e) => setGoal(e.target.value)} />
          {state.success && <p className="text-sm text-success">Saved.</p>}
          <Button type="submit" disabled={pending}>
            {pending ? "Saving…" : "Save goal"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

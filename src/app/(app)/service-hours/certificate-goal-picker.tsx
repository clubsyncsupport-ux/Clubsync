"use client";

import { useActionState } from "react";
import { updateServiceHourGoalAction } from "@/app/actions/settings";
import { cn } from "@/lib/cn";

const TIERS = [
  { hours: 20, title: "Service Hour Certificate", icon: "📜" },
  { hours: 100, title: "Major Service Hour Certificate", icon: "🏅" },
];

export function CertificateGoalPicker({ current }: { current: number }) {
  const [state, formAction, pending] = useActionState(updateServiceHourGoalAction, { error: null });

  return (
    <div className="mt-6">
      <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-text-muted">Certificate Goals</h2>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {TIERS.map((tier) => {
          const active = current === tier.hours;
          return (
            <form key={tier.hours} action={formAction}>
              <input type="hidden" name="serviceHourGoal" value={tier.hours} />
              <button
                type="submit"
                disabled={pending}
                className={cn(
                  "flex w-full items-center gap-3 rounded-2xl border p-4 text-left transition-colors disabled:opacity-60",
                  active ? "border-accent bg-accent-soft" : "border-border bg-surface-1 hover:border-border-strong"
                )}
              >
                <span className="text-2xl leading-none">{tier.icon}</span>
                <div className="min-w-0 flex-1">
                  <p className={cn("font-semibold", active ? "text-accent-soft-text" : "text-text-primary")}>{tier.title}</p>
                  <p className="text-sm text-text-secondary">{tier.hours} hours</p>
                </div>
                {active && <span className="shrink-0 text-accent">✓</span>}
              </button>
            </form>
          );
        })}
      </div>
      {state.error && <p className="mt-2 text-sm text-danger">{state.error}</p>}
    </div>
  );
}
